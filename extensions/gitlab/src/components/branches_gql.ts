import { gql } from "@apollo/client";
import { getGitLabGQL, gitlab } from "../common";
import { Branch, Project } from "../gitlabapi";

const BRANCH_LIST_PAGE_SIZE = 20;
const BRANCH_DROPDOWN_LIMIT = 100;

const BRANCH_NAMES = gql`
  query ProjectBranchNames($fullPath: ID!, $searchPattern: String!, $offset: Int!, $limit: Int!) {
    project(fullPath: $fullPath) {
      repository {
        rootRef
        branchNames(searchPattern: $searchPattern, offset: $offset, limit: $limit)
      }
    }
  }
`;

const BRANCH_RULES = gql`
  query ProjectBranchRules($fullPath: ID!) {
    project(fullPath: $fullPath) {
      branchRules(first: 100) {
        nodes {
          name
          branchProtection {
            allowForcePush
          }
        }
      }
    }
  }
`;

type BranchRule = {
  name: string;
  protected: boolean;
};

type RestBranchJson = Branch & {
  commit?: { id?: string; committed_date?: string; title?: string };
};

const branchRulesByProjectId = new Map<number, BranchRule[]>();

async function getBranchRules(project: Project): Promise<BranchRule[]> {
  const cached = branchRulesByProjectId.get(project.id);
  if (cached) {
    return cached;
  }
  try {
    const response = await getGitLabGQL().client.query({
      query: BRANCH_RULES,
      variables: { fullPath: project.fullPath },
    });
    const nodes = response.data?.project?.branchRules?.nodes ?? [];
    const rules: BranchRule[] = nodes.map((node: { name: string; branchProtection: unknown }) => ({
      name: node.name,
      protected: node.branchProtection != null,
    }));
    branchRulesByProjectId.set(project.id, rules);
    return rules;
  } catch {
    return [];
  }
}

function matchesBranchRule(branchName: string, ruleName: string): boolean {
  if (ruleName === branchName) {
    return true;
  }
  if (ruleName.endsWith("/*")) {
    const prefix = ruleName.slice(0, -2);
    return branchName.startsWith(`${prefix}/`);
  }
  return false;
}

function isProtectedBranch(branchName: string, rules: BranchRule[]): boolean {
  return rules.some((rule) => rule.protected && matchesBranchRule(branchName, rule.name));
}

function buildBranchCommitsDocument(branchNames: string[]) {
  if (branchNames.length === 0) {
    return undefined;
  }
  const variableDefinitions = `$fullPath: ID!${branchNames.map((_, index) => `, $ref${index}: String!`).join("")}`;
  const fields = branchNames.map((_, index) => `b${index}: commit(ref: $ref${index}) { title }`).join("\n");
  return gql(`
    query ProjectBranchCommits(${variableDefinitions}) {
      project(fullPath: $fullPath) {
        repository {
          ${fields}
        }
      }
    }
  `);
}

async function fetchBranchCommitTitles(project: Project, branchNames: string[]): Promise<Map<string, string>> {
  const document = buildBranchCommitsDocument(branchNames);
  if (!document) {
    return new Map();
  }
  try {
    const variables: Record<string, string> = { fullPath: project.fullPath };
    branchNames.forEach((name, index) => {
      variables[`ref${index}`] = name;
    });
    const response = await getGitLabGQL().client.query({ query: document, variables });
    const repository = response.data?.project?.repository;
    const titles = new Map<string, string>();
    branchNames.forEach((name, index) => {
      const title = repository?.[`b${index}`]?.title as string | undefined;
      if (title) {
        titles.set(name, title);
      }
    });
    return titles;
  } catch {
    return new Map();
  }
}

function mapBranch(
  name: string,
  project: Project,
  rootRef: string | null,
  rules: BranchRule[],
  commitTitle?: string,
): Branch {
  const defaultBranch = rootRef || project.default_branch;
  return {
    name,
    default: name === defaultBranch,
    protected: isProtectedBranch(name, rules),
    web_url: `${project.web_url}/-/tree/${encodeURIComponent(name)}`,
    commit: commitTitle ? { title: commitTitle } : undefined,
  };
}

function mapRestBranch(branch: RestBranchJson, project: Project): Branch {
  return {
    name: branch.name,
    default: branch.default ?? false,
    protected: branch.protected,
    web_url: branch.web_url || `${project.web_url}/-/tree/${encodeURIComponent(branch.name)}`,
    commit: branch.commit?.title
      ? {
          title: branch.commit.title,
          id: branch.commit.id,
          committed_date: branch.commit.committed_date,
        }
      : undefined,
  };
}

async function fetchBranchesRestPage(options: {
  project: Project;
  search: string;
  page: number;
  limit?: number;
}): Promise<{ branches: Branch[]; hasMore: boolean }> {
  const limit = options.limit ?? BRANCH_LIST_PAGE_SIZE;
  const { data, hasMore } = await gitlab.fetchPaged(
    `projects/${options.project.id}/repository/branches`,
    options.search ? { search: options.search } : {},
    options.page + 1,
    limit,
  );
  const branches = ((data as RestBranchJson[]) ?? []).map((branch) => mapRestBranch(branch, options.project));
  return { branches, hasMore };
}

async function fetchBranchNamesGql(
  project: Project,
  searchPattern: string,
  offset: number,
  limit: number,
): Promise<{ names: string[]; rootRef: string | null } | undefined> {
  try {
    const response = await getGitLabGQL().client.query({
      query: BRANCH_NAMES,
      variables: {
        fullPath: project.fullPath,
        searchPattern,
        offset,
        limit,
      },
    });
    const repository = response.data?.project?.repository;
    if (!repository) {
      return undefined;
    }
    const names = repository.branchNames;
    return {
      names: Array.isArray(names) ? names : [],
      rootRef: repository.rootRef ?? null,
    };
  } catch {
    return undefined;
  }
}

export async function fetchBranchesGqlPage(options: {
  project: Project;
  search: string;
  page: number;
}): Promise<{ branches: Branch[]; hasMore: boolean }> {
  const offset = options.page * BRANCH_LIST_PAGE_SIZE;
  const gqlResult = await fetchBranchNamesGql(options.project, options.search, offset, BRANCH_LIST_PAGE_SIZE);

  if (!gqlResult) {
    return fetchBranchesRestPage(options);
  }

  const { names, rootRef } = gqlResult;

  if (names.length === 0 && options.search === "" && options.page === 0) {
    const restPage = await fetchBranchesRestPage(options);
    if (restPage.branches.length > 0) {
      return restPage;
    }
  }

  if (names.length === 0) {
    return { branches: [], hasMore: false };
  }

  const rules = await getBranchRules(options.project);
  const commitTitles = await fetchBranchCommitTitles(options.project, names);
  return {
    branches: names.map((name) => mapBranch(name, options.project, rootRef, rules, commitTitles.get(name))),
    hasMore: names.length === BRANCH_LIST_PAGE_SIZE,
  };
}

export async function fetchBranchNames(project: Project): Promise<string[]> {
  const gqlResult = await fetchBranchNamesGql(project, "", 0, BRANCH_DROPDOWN_LIMIT);
  if (gqlResult && gqlResult.names.length > 0) {
    return gqlResult.names;
  }
  const { branches } = await fetchBranchesRestPage({
    project,
    search: "",
    page: 0,
    limit: BRANCH_DROPDOWN_LIMIT,
  });
  if (branches.length > 0) {
    return branches.map((branch) => branch.name);
  }
  return gqlResult?.names ?? [];
}
