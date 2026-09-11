import { gql } from "@apollo/client";
import { getGitLabGQL, gitlab } from "../common";
import { MRDiscussion, MRDiscussionNote, User } from "../gitlabapi";
const MR_DISCUSSIONS_PAGE_SIZE = 25;

const DISCUSSION_NOTE_FIELDS = gql`
  fragment DiscussionNoteFields on Note {
    body
    createdAt
    system
    resolvable
    resolved
    url
    position {
      filePath
      newPath
      oldPath
      newLine
      oldLine
      diffRefs {
        headSha
        startSha
      }
    }
    author {
      username
      name
      avatarUrl
    }
  }
`;

const MR_DISCUSSIONS = gql`
  ${DISCUSSION_NOTE_FIELDS}
  query MergeRequestDiscussions($fullPath: ID!, $iid: String!, $first: Int!, $after: String) {
    project(fullPath: $fullPath) {
      mergeRequest(iid: $iid) {
        id
        discussions(first: $first, after: $after) {
          nodes {
            id
            resolvable
            resolved
            notes(first: 100) {
              nodes {
                ...DiscussionNoteFields
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`;

const CREATE_NOTE = gql`
  mutation CreateNote($input: CreateNoteInput!) {
    createNote(input: $input) {
      errors
    }
  }
`;

const DISCUSSION_TOGGLE_RESOLVE = gql`
  mutation DiscussionToggleResolve($input: DiscussionToggleResolveInput!) {
    discussionToggleResolve(input: $input) {
      errors
    }
  }
`;

const MR_DISCUSSION_DIFF = gql`
  query MergeRequestDiscussionDiff($fullPath: ID!, $headSha: String!, $contextRef: String!, $filePath: String!) {
    project(fullPath: $fullPath) {
      repository {
        commit(ref: $headSha) {
          diffs {
            diff
            newPath
            oldPath
          }
        }
        blobs(paths: [$filePath], ref: $contextRef, first: 1) {
          nodes {
            rawTextBlob
          }
        }
      }
    }
  }
`;

interface GqlDiscussionNoteNode {
  body: string;
  createdAt: string;
  system: boolean;
  resolvable: boolean;
  resolved: boolean;
  url?: string | null;
  position?: {
    filePath?: string | null;
    newPath?: string | null;
    oldPath?: string | null;
    newLine?: number | null;
    oldLine?: number | null;
    diffRefs?: {
      headSha?: string | null;
      startSha?: string | null;
    } | null;
  } | null;
  author?: {
    username?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
  } | null;
}

interface GqlDiscussionNode {
  id: string;
  resolvable: boolean;
  resolved: boolean;
  notes: { nodes: GqlDiscussionNoteNode[] };
}

interface GqlDiscussionConnection {
  nodes: GqlDiscussionNode[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor?: string | null;
  };
}

interface GqlDiffNode {
  diff?: string | null;
  newPath?: string | null;
  oldPath?: string | null;
}

interface GqlBlobNode {
  rawTextBlob?: string | null;
}

const endCursorsByCacheKey = new Map<string, string[]>();

export function resolveAvatarUrl(avatarUrl: string | null | undefined): string {
  if (!avatarUrl) {
    return "";
  }
  if (/^https?:\/\//i.test(avatarUrl)) {
    return avatarUrl;
  }
  return gitlab.joinUrl(avatarUrl);
}

function gqlPositionToPosition(position?: GqlDiscussionNoteNode["position"]): MRDiscussionNote["position"] {
  if (!position) {
    return undefined;
  }
  const filePath =
    position.oldLine && !position.newLine
      ? (position.oldPath ?? position.filePath)
      : (position.newPath ?? position.filePath);
  if (!filePath) {
    return undefined;
  }
  return {
    file_path: filePath,
    line: position.newLine ?? position.oldLine ?? undefined,
    line_type: position.newLine ? "new" : position.oldLine ? "old" : undefined,
    head_sha: position.diffRefs?.headSha ?? undefined,
    start_sha: position.diffRefs?.startSha ?? undefined,
  };
}

function gqlDiscussionNoteToNote(node: GqlDiscussionNoteNode): MRDiscussionNote {
  const author = node.author
    ? ({
        id: 0,
        name: node.author.name ?? "",
        username: node.author.username ?? "",
        avatar_url: resolveAvatarUrl(node.author.avatarUrl),
        web_url: "",
        state: "",
        public_email: "",
      } as User)
    : undefined;
  return {
    body: node.body,
    author,
    created_at: node.createdAt,
    web_url: node.url ?? "",
    position: gqlPositionToPosition(node.position),
    resolvable: node.resolvable,
    resolved: node.resolved,
    system: node.system,
  };
}

async function queryMRDiscussionsConnection(
  projectFullPath: string,
  mrIID: number,
  variables: { first: number; after?: string },
): Promise<GqlDiscussionConnection> {
  const response = await getGitLabGQL().client.query({
    query: MR_DISCUSSIONS,
    variables: {
      fullPath: projectFullPath,
      iid: `${mrIID}`,
      first: variables.first,
      after: variables.after,
    },
  });
  const connection = response.data?.project?.mergeRequest?.discussions as GqlDiscussionConnection | undefined;
  if (!connection) {
    throw new Error("Could not load merge request discussions");
  }
  return connection;
}

async function fetchVisibleDiscussionGqlPage(options: {
  projectFullPath: string;
  mrIID: number;
  after?: string;
}): Promise<{ discussions: MRDiscussion[]; hasMore: boolean; endCursor?: string }> {
  const discussions: MRDiscussion[] = [];
  let after = options.after;
  let hasMore = true;

  while (discussions.length < MR_DISCUSSIONS_PAGE_SIZE && hasMore) {
    const connection = await queryMRDiscussionsConnection(options.projectFullPath, options.mrIID, {
      first: MR_DISCUSSIONS_PAGE_SIZE,
      after,
    });
    discussions.push(
      ...connection.nodes
        .map((node) => ({
          id: node.id,
          resolvable: node.resolvable,
          resolved: node.resolved,
          notes: node.notes.nodes.map(gqlDiscussionNoteToNote),
        }))
        .filter((discussion) => discussion.notes?.some((note) => !note.system) ?? false),
    );
    after = connection.pageInfo.endCursor ?? undefined;
    hasMore = connection.pageInfo.hasNextPage;
  }

  return { discussions, hasMore, endCursor: after };
}

export async function fetchMRDiscussionsGqlPage(options: {
  cacheKey: string;
  page: number;
  projectFullPath: string;
  mrIID: number;
}): Promise<{ discussions: MRDiscussion[]; hasMore: boolean }> {
  const { cacheKey, page, projectFullPath, mrIID } = options;

  if (!endCursorsByCacheKey.has(cacheKey)) {
    endCursorsByCacheKey.set(cacheKey, []);
  }
  const cursors = endCursorsByCacheKey.get(cacheKey)!;

  if (page === 0) {
    cursors.length = 0;
  }

  if (page > 0 && cursors.length < page) {
    for (let index = cursors.length; index < page; index += 1) {
      const result = await fetchVisibleDiscussionGqlPage({
        projectFullPath,
        mrIID,
        after: index === 0 ? undefined : cursors[index - 1],
      });
      cursors[index] = result.endCursor ?? "";
      if (!result.hasMore) {
        return { discussions: [], hasMore: false };
      }
    }
  }

  const result = await fetchVisibleDiscussionGqlPage({
    projectFullPath,
    mrIID,
    after: page > 0 ? cursors[page - 1] : undefined,
  });
  cursors[page] = result.endCursor ?? "";

  return {
    discussions: result.discussions,
    hasMore: result.hasMore,
  };
}

function parseHunkHeader(line: string): { oldStart: number; newStart: number } | undefined {
  const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
  if (!match) {
    return undefined;
  }
  return {
    oldStart: parseInt(match[1], 10),
    newStart: parseInt(match[2], 10),
  };
}

function hunkContainsLine(hunkLines: string[], position: NonNullable<MRDiscussionNote["position"]>): boolean {
  if (!position.line) {
    return false;
  }
  const header = parseHunkHeader(hunkLines[0]);
  if (!header) {
    return false;
  }
  let oldLine = header.oldStart;
  let newLine = header.newStart;
  for (const line of hunkLines.slice(1)) {
    if (line.startsWith("+")) {
      if (position.line_type !== "old" && newLine === position.line) {
        return true;
      }
      newLine++;
      continue;
    }
    if (line.startsWith("-")) {
      if (position.line_type === "old" && oldLine === position.line) {
        return true;
      }
      oldLine++;
      continue;
    }
    if (position.line_type !== "old" && newLine === position.line) {
      return true;
    }
    if (position.line_type === "old" && oldLine === position.line) {
      return true;
    }
    oldLine++;
    newLine++;
  }
  return false;
}

function extractFocusedHunk(diff: string, position: NonNullable<MRDiscussionNote["position"]>): string | undefined {
  const lines = diff.split("\n");
  const hunks: string[][] = [];
  let currentHunk: string[] = [];
  for (const line of lines) {
    if (line.startsWith("@@ ")) {
      if (currentHunk.length > 0) {
        hunks.push(currentHunk);
      }
      currentHunk = [line];
      continue;
    }
    if (currentHunk.length > 0) {
      currentHunk.push(line);
    }
  }
  if (currentHunk.length > 0) {
    hunks.push(currentHunk);
  }
  return hunks.find((hunkLines) => hunkContainsLine(hunkLines, position))?.join("\n");
}

function extractBlobContext(text: string, position: NonNullable<MRDiscussionNote["position"]>): string | undefined {
  if (!position.line) {
    return undefined;
  }
  const lines = text.split("\n");
  const start = Math.max(position.line - 4, 1);
  const end = Math.min(position.line + 4, lines.length);
  const prefix = position.line_type === "old" ? "-" : "+";
  return lines
    .slice(start - 1, end)
    .map((line, offset) => `${start + offset === position.line ? prefix : " "} ${line}`)
    .join("\n");
}

export async function fetchMRDiscussionDiffGql(options: {
  projectFullPath: string;
  position: NonNullable<MRDiscussionNote["position"]>;
}): Promise<string | undefined> {
  if (!options.position.head_sha) {
    return undefined;
  }
  const contextRef =
    options.position.line_type === "old"
      ? (options.position.start_sha ?? options.position.head_sha)
      : options.position.head_sha;
  const response = await getGitLabGQL().client.query({
    query: MR_DISCUSSION_DIFF,
    variables: {
      fullPath: options.projectFullPath,
      headSha: options.position.head_sha,
      contextRef,
      filePath: options.position.file_path,
    },
  });
  const diffs = response.data?.project?.repository?.commit?.diffs as GqlDiffNode[] | undefined;
  const diff = diffs?.find(
    (candidate) => candidate.newPath === options.position.file_path || candidate.oldPath === options.position.file_path,
  )?.diff;
  if (diff) {
    return extractFocusedHunk(diff, options.position) ?? diff;
  }
  const blob = response.data?.project?.repository?.blobs?.nodes?.[0] as GqlBlobNode | undefined;
  return blob?.rawTextBlob ? extractBlobContext(blob.rawTextBlob, options.position) : undefined;
}

export async function createMRDiscussionNoteGql(options: {
  noteableId: string;
  discussionId: string;
  body: string;
}): Promise<void> {
  const response = await getGitLabGQL().client.mutate({
    mutation: CREATE_NOTE,
    variables: {
      input: {
        noteableId: options.noteableId,
        discussionId: options.discussionId,
        body: options.body,
      },
    },
  });
  const errors = response.data?.createNote?.errors as string[] | undefined;
  if (errors && errors.length > 0) {
    throw new Error(errors.join(", "));
  }
}

export async function toggleMRDiscussionResolveGql(options: { discussionId: string; resolve: boolean }): Promise<void> {
  const response = await getGitLabGQL().client.mutate({
    mutation: DISCUSSION_TOGGLE_RESOLVE,
    variables: {
      input: {
        id: options.discussionId,
        resolve: options.resolve,
      },
    },
  });
  const errors = response.data?.discussionToggleResolve?.errors as string[] | undefined;
  if (errors && errors.length > 0) {
    throw new Error(errors.join(", "));
  }
}
