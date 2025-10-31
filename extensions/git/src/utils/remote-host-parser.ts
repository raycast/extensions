import { Icon } from "@raycast/api";
import { RemoteProvider, Remote, RemoteWebPage, Commit } from "../types";

type RemoteHostParserResult = Pick<
  Remote,
  "provider" | "organizationName" | "repositoryName" | "avatarUrl" | "webPages"
>;

/**
 * Remote host parser.
 * Parser for remote host URLs.
 * @param url - The URL to parse.
 * @returns The parsed remote host info.
 */
export function remoteHostParser(url: string): RemoteHostParserResult {
  const parsed = parse(url);

  if (!parsed) {
    return unknownParser(url);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname.includes("github")) {
    return githubParser(url, parsed);
  }
  if (hostname.includes("gitlab")) {
    return gitlabParser(url, parsed);
  }
  if (hostname.includes("bitbucket")) {
    return bitbucketParser(url, parsed);
  }
  if (hostname.includes("azure-devops")) {
    return azureDevopsParser(url, parsed);
  }
  if (hostname.includes("gitea")) {
    return giteaParser(url, parsed);
  }
  return unknownParser(url, parsed);
}

// --- provider-specific parsers ----------------------------------------------

// GitHub provider parser
function githubParser(_url: string, parsed: URLComponents): RemoteHostParserResult {
  const { protocol: scheme, hostname, path } = parsed;

  return {
    provider: "GitHub" as RemoteProvider,
    organizationName: (() => {
      const match = path.match(/^([^/]+)/);
      return match ? match[1] : undefined;
    })(),
    repositoryName: (() => {
      const match = path.match(/\/([^/]+)$/);
      return match ? match[1] : undefined;
    })(),
    get avatarUrl() {
      return this.organizationName ? `${scheme}://${hostname}/${this.organizationName}.png?size=64` : undefined;
    },
    webPages: {
      fileRelated(filePath: string, ref?: string): RemoteWebPage[] {
        return [
          {
            title: "File Page",
            url: `${scheme}://${hostname}/${path}/blob/${encodeURIComponent(ref ?? "HEAD")}/${filePath}`,
            icon: Icon.CodeBlock,
          },
          {
            title: "Blame",
            url: `${scheme}://${hostname}/${path}/blame/${encodeURIComponent(ref ?? "HEAD")}/${filePath}`,
            icon: Icon.TextSelection,
          },
          {
            title: "File History",
            url: `${scheme}://${hostname}/${path}/commits/${encodeURIComponent(ref ?? "HEAD")}/${filePath}`,
            icon: Icon.Clock,
          },
        ];
      },
      commitRelated(commit: Pick<Commit, "hash" | "message">): RemoteWebPage[] {
        const issueNumber = commit.message.match(/#(\d+)/)?.[1];

        return [
          ...(issueNumber
            ? ([
                {
                  title: `${issueNumber}`,
                  url: `${scheme}://${hostname}/${path}/issues/${issueNumber}`,
                  icon: Icon.Hashtag,
                  shortcut: { modifiers: ["cmd"], key: "i" },
                },
              ] as RemoteWebPage[])
            : []),
          {
            title: `Commit Page`,
            url: `${scheme}://${hostname}/${path}/commit/${encodeURIComponent(commit.hash)}`,
            icon: { source: "git-commit.svg" },
          },
          {
            title: `Builds`,
            url: `${scheme}://${hostname}/${path}/commit/${encodeURIComponent(commit.hash)}/checks`,
            icon: Icon.Hammer,
            shortcut: { modifiers: ["cmd"], key: "b" },
          },
        ];
      },
      branchRelated(branch: string): RemoteWebPage[] {
        return [
          {
            title: "Branch Page",
            url: `${scheme}://${hostname}/${path}/tree/${encodeURIComponent(branch)}`,
            icon: { source: "git-branch.svg" },
          },
          {
            title: "Create Pull Request",
            url: `${scheme}://${hostname}/${path}/compare/${encodeURIComponent(branch)}?expand=1`,
            icon: Icon.Plus,
            shortcut: { modifiers: ["cmd"], key: "n" },
          },
        ];
      },
      tagRelated(tag: string): RemoteWebPage[] {
        return [
          {
            title: `Release Page`,
            url: `${scheme}://${hostname}/${path}/releases/tag/${encodeURIComponent(tag)}`,
            icon: Icon.Tag,
          },
        ];
      },
      other(): RemoteWebPage[] {
        return [
          {
            title: "Pull Requests",
            url: `${scheme}://${hostname}/${path}/pulls`,
            icon: { source: "git-merge.svg" },
          },
          {
            title: "Issues",
            url: `${scheme}://${hostname}/${path}/issues`,
            icon: Icon.Bug,
          },
          {
            title: "Settings",
            url: `${scheme}://${hostname}/${path}/settings`,
            icon: Icon.Gear,
          },
          {
            title: "Home Page",
            url: `${scheme}://${hostname}/${path}`,
            icon: { source: "git-project.svg" },
          },
        ];
      },
    },
  };
}

function gitlabParser(_url: string, parsed: URLComponents): RemoteHostParserResult {
  const { protocol: scheme, hostname, path } = parsed;

  return {
    provider: "GitLab" as RemoteProvider,
    organizationName: (() => {
      const match = path.match(/^([^/]+)/);
      return match ? match[1] : undefined;
    })(),
    repositoryName: (() => {
      const match = path.match(/\/([^/]+)$/);
      return match ? match[1] : undefined;
    })(),
    avatarUrl: undefined,
    webPages: {
      fileRelated(filePath: string, ref?: string): RemoteWebPage[] {
        return [
          {
            title: "File Page",
            url: `${scheme}://${hostname}/${path}/-/blob/${encodeURIComponent(ref ?? "HEAD")}/${filePath}`,
            icon: Icon.CodeBlock,
          },
          {
            title: "Blame",
            url: `${scheme}://${hostname}/${path}/-/blame/${encodeURIComponent(ref ?? "HEAD")}/${filePath}`,
            icon: Icon.TextSelection,
          },
          {
            title: "History",
            url: `${scheme}://${hostname}/${path}/-/commits/${encodeURIComponent(ref ?? "HEAD")}/${filePath}`,
            icon: Icon.Clock,
          },
        ];
      },
      commitRelated(commit: Pick<Commit, "hash" | "message">): RemoteWebPage[] {
        return [
          {
            title: `Commit Page`,
            url: `${scheme}://${hostname}/${path}/-/commit/${encodeURIComponent(commit.hash)}`,
            icon: { source: "git-commit.svg" },
          },
          {
            title: "Pipelines",
            url: `${scheme}://${hostname}/${path}/-/commit/${encodeURIComponent(commit.hash)}/pipelines`,
            icon: Icon.Hammer,
            shortcut: { modifiers: ["cmd"], key: "b" },
          },
        ];
      },
      branchRelated(branch: string): RemoteWebPage[] {
        return [
          {
            title: "Branch Page",
            url: `${scheme}://${hostname}/${path}/-/tree/${encodeURIComponent(branch)}`,
            icon: { source: "git-branch.svg" },
          },
          {
            title: "Create Merge Request",
            url: `${scheme}://${hostname}/${path}/-/merge_requests/new?merge_request[source_branch]=${encodeURIComponent(branch)}`,
            icon: Icon.Plus,
            shortcut: { modifiers: ["cmd"], key: "n" },
          },
        ];
      },
      tagRelated(tag: string): RemoteWebPage[] {
        return [
          {
            title: "Release Page",
            url: `${scheme}://${hostname}/${path}/-/tags/${encodeURIComponent(tag)}`,
            icon: Icon.Tag,
          },
        ];
      },
      other(): RemoteWebPage[] {
        return [
          {
            title: "Merge Requests",
            url: `${scheme}://${hostname}/${path}/-/merge_requests`,
            icon: { source: "git-merge.svg" },
          },
          {
            title: "Settings",
            url: `${scheme}://${hostname}/${path}/-/settings`,
            icon: Icon.Gear,
          },
          {
            title: "Home Page",
            url: `${scheme}://${hostname}/${path}`,
            icon: { source: "git-project.svg" },
          },
        ];
      },
    },
  };
}

function giteaParser(_url: string, parsed: URLComponents): RemoteHostParserResult {
  const { protocol: scheme, hostname, path } = parsed;

  return {
    provider: "Gitea" as RemoteProvider,
    organizationName: (() => {
      const match = path.match(/^([^/]+)/);
      return match ? match[1] : undefined;
    })(),
    repositoryName: (() => {
      const match = path.match(/\/([^/]+)$/);
      return match ? match[1] : undefined;
    })(),
    get avatarUrl() {
      return this.organizationName ? `${scheme}://${hostname}/${this.organizationName}.png` : undefined;
    },
    webPages: {
      fileRelated(filePath: string, ref?: string): RemoteWebPage[] {
        return [
          {
            title: "File Page",
            url: `${scheme}://${hostname}/${path}/src/commit/${encodeURIComponent(ref ?? "HEAD")}/${filePath}`,
            icon: Icon.CodeBlock,
          },
          {
            title: "Blame",
            url: `${scheme}://${hostname}/${path}/blame/commit/${encodeURIComponent(ref ?? "HEAD")}/${filePath}`,
            icon: Icon.TextSelection,
          },
          {
            title: "History",
            url: `${scheme}://${hostname}/${path}/commits/commit/${encodeURIComponent(ref ?? "HEAD")}/${filePath}`,
            icon: Icon.Clock,
          },
        ];
      },
      commitRelated(commit: Pick<Commit, "hash" | "message">): RemoteWebPage[] {
        const issueNumber = commit.message.match(/#(\d+)/)?.[1];

        return [
          ...(issueNumber
            ? ([
                {
                  title: `${issueNumber}`,
                  url: `${scheme}://${hostname}/${path}/issues/${issueNumber}`,
                  icon: Icon.Hashtag,
                  shortcut: { modifiers: ["cmd"], key: "i" },
                },
              ] as RemoteWebPage[])
            : []),
          {
            title: `Commit Page`,
            url: `${scheme}://${hostname}/${path}/commit/${encodeURIComponent(commit.hash)}`,
            icon: { source: "git-commit.svg" },
          },
        ];
      },
      branchRelated(branch: string): RemoteWebPage[] {
        return [
          {
            title: "Branch Page",
            url: `${scheme}://${hostname}/${path}/src/branch/${encodeURIComponent(branch)}`,
            icon: { source: "git-branch.svg" },
          },
        ];
      },
      tagRelated(_tag: string): RemoteWebPage[] {
        return [
          {
            title: "Release Page",
            url: `${scheme}://${hostname}/${path}/releases/tag/${encodeURIComponent(_tag)}`,
            icon: Icon.Tag,
          },
        ];
      },
      other(): RemoteWebPage[] {
        return [
          {
            title: "Issues",
            url: `${scheme}://${hostname}/${path}/issues`,
            icon: Icon.Bug,
          },
          {
            title: "Pull Requests",
            url: `${scheme}://${hostname}/${path}/pulls`,
            icon: { source: "git-merge.svg" },
          },
          {
            title: "Settings",
            url: `${scheme}://${hostname}/${path}/settings`,
            icon: Icon.Gear,
          },
          {
            title: "Home Page",
            url: `${scheme}://${hostname}/${path}`,
            icon: { source: "git-project.svg" },
          },
        ];
      },
    },
  };
}

function bitbucketParser(_url: string, parsed: URLComponents): RemoteHostParserResult {
  const { protocol: scheme, hostname, path } = parsed;
  const isSelfHosted = hostname === "bitbucket.org";

  const repoBase = (() => {
    if (isSelfHosted) {
      return `${scheme}://${hostname}/${path}`;
    }

    const match = path.match(/^(?<project>[^/]+)\/(?<repo>[^/]+)/);
    if (!match || !match.groups) return undefined;

    const { project, repo } = match.groups as { project: string; repo: string };
    return `${scheme}://${hostname}/projects/${project}/repos/${repo}`;
  })();

  return {
    provider: "Bitbucket" as RemoteProvider,
    organizationName: (() => {
      const match = path.match(/^([^/]+)/);
      return match ? match[1] : undefined;
    })(),
    repositoryName: (() => {
      if (isSelfHosted) {
        const match = path.match(/\/([^/]+)$/);
        return match ? match[1] : undefined;
      }
      const match = path.match(/^([^/]+)\/([^/]+)/);
      return match ? match[2] : undefined;
    })(),
    get avatarUrl() {
      if (isSelfHosted) {
        return undefined;
      }
      return this.organizationName
        ? `${scheme}://${hostname}/projects/${this.organizationName}/avatar.png?s=64`
        : undefined;
    },
    webPages: {
      fileRelated(filePath: string, ref?: string): RemoteWebPage[] {
        if (!repoBase) return [];
        const fileUrl = repoBase.includes("/projects/")
          ? `${repoBase}/browse/${filePath}?at=${encodeURIComponent(ref ?? "HEAD")}`
          : `${repoBase}/src/${encodeURIComponent(ref ?? "HEAD")}/${filePath}`;

        return [
          {
            title: "File Page",
            url: fileUrl,
            icon: Icon.CodeBlock,
          },
        ];
      },
      commitRelated(commit: Pick<Commit, "hash" | "message">): RemoteWebPage[] {
        if (!repoBase) return [];
        return [
          {
            title: `Commit Page`,
            url: `${repoBase}/commits/${encodeURIComponent(commit.hash)}`,
            icon: { source: "git-commit.svg" },
          },
          {
            title: "Builds",
            url: `${repoBase}/builds?at=${encodeURIComponent(commit.hash)}`,
            icon: Icon.Hammer,
            shortcut: { modifiers: ["cmd"], key: "b" },
          },
        ];
      },
      branchRelated(branch: string): RemoteWebPage[] {
        if (!repoBase) return [];
        const branchUrl = repoBase.includes("/projects/")
          ? `${repoBase}/browse?at=${encodeURIComponent(`refs/heads/${branch}`)}`
          : `${repoBase}/src/${encodeURIComponent(branch)}`;

        const createPrUrl = repoBase.includes("/projects/")
          ? `${repoBase}/pull-requests?create&sourceBranch=${encodeURIComponent(`refs/heads/${branch}`)}`
          : `${repoBase}/pull-requests/new?source=${encodeURIComponent(branch)}`;

        return [
          {
            title: "Branch Page",
            url: branchUrl,
            icon: { source: "git-branch.svg" },
          },
          {
            title: "Create Pull Request",
            url: createPrUrl,
            icon: Icon.Plus,
            shortcut: { modifiers: ["cmd"], key: "n" },
          },
        ];
      },
      tagRelated(_tag: string): RemoteWebPage[] {
        return [];
      },
      other(): RemoteWebPage[] {
        if (!repoBase) return [];
        return [
          {
            title: "Pull Requests",
            url: `${repoBase}/pull-requests`,
            icon: { source: "git-merge.svg" },
          },
          {
            title: "Settings",
            url: `${repoBase}/settings`,
            icon: Icon.Gear,
          },
          {
            title: "Home Page",
            url: repoBase,
            icon: { source: "git-project.svg" },
          },
        ];
      },
    },
  };
}

function azureDevopsParser(_url: string, parsed: URLComponents): RemoteHostParserResult {
  const { hostname, path } = parsed;

  const repoBase = (() => {
    if (hostname === "ssh.dev.azure.com" || hostname === "vs-ssh.visualstudio.com") {
      const pathPattern = path.startsWith("v3/")
        ? /^v3\/(?<org>[^/]+)\/(?<project>[^/]+)\/(?<repo>[^/]+)$/
        : /^(?<org>[^/]+)\/(?<project>[^/]+)\/(?<repo>[^/]+)$/;
      const match = path.match(pathPattern);
      if (!match || !match.groups) return undefined;
      const { org, project, repo } = match.groups as { org: string; project: string; repo: string };
      return `https://dev.azure.com/${org}/${project}/_git/${repo}`;
    }
    if (hostname === "dev.azure.com") {
      const pathPattern = /^(?<org>[^/]+)\/(?<project>[^/]+)(?:\/.*)?_git\/(?<repo>[^/]+)/;
      const match = path.match(pathPattern);
      if (!match || !match.groups) return undefined;
      const { org, project, repo } = match.groups as { org: string; project: string; repo: string };
      if (!org || !project || !repo) return undefined;
      return `https://dev.azure.com/${org}/${project}/_git/${repo}`;
    }
    if (hostname.endsWith(".visualstudio.com")) {
      const pathPattern = /^(?<project>[^/]+)(?:\/.*)?_git\/(?<repo>[^/]+)/;
      const match = path.match(pathPattern);
      if (!match || !match.groups) return undefined;
      const { project, repo } = match.groups as { project: string; repo: string };
      if (!project || !repo) return undefined;
      return `https://${hostname}/${project}/_git/${repo}`;
    }
    return undefined;
  })();

  return {
    provider: "Azure DevOps" as RemoteProvider,
    organizationName: (() => {
      if (hostname === "ssh.dev.azure.com" || hostname === "vs-ssh.visualstudio.com") {
        const pathPattern = path.startsWith("v3/")
          ? /^v3\/(?<org>[^/]+)\/(?<project>[^/]+)\/(?<repo>[^/]+)$/
          : /^(?<org>[^/]+)\/(?<project>[^/]+)\/(?<repo>[^/]+)$/;
        const match = path.match(pathPattern);
        return match?.groups?.org;
      }
      if (hostname === "dev.azure.com") {
        const pathPattern = /^(?<org>[^/]+)\/(?<project>[^/]+)(?:\/.*)?_git\/(?<repo>[^/]+)/;
        const match = path.match(pathPattern);
        return match?.groups?.org;
      }
      if (hostname.endsWith(".visualstudio.com")) {
        const match = hostname.match(/^([^.]+)\.visualstudio\.com$/);
        return match ? match[1] : undefined;
      }
      return undefined;
    })(),
    repositoryName: (() => {
      if (hostname === "ssh.dev.azure.com" || hostname === "vs-ssh.visualstudio.com") {
        const match = path.match(/^(?:v3\/)?[^/]+\/[^/]+\/([^/]+)$/);
        return match ? match[1] : undefined;
      }
      const match = path.match(/_git\/([^/]+)/);
      return match ? match[1] : undefined;
    })(),
    avatarUrl: undefined,
    webPages: {
      fileRelated(filePath: string, ref?: string): RemoteWebPage[] {
        if (!repoBase) return [];
        return [
          {
            title: "File Page",
            url: `${repoBase}?path=/${filePath}&version=GB${encodeURIComponent(ref ?? "HEAD")}`,
            icon: Icon.CodeBlock,
          },
        ];
      },
      commitRelated(commit: Pick<Commit, "hash" | "message">): RemoteWebPage[] {
        if (!repoBase) return [];
        return [
          {
            title: `Commit Page`,
            url: `${repoBase}/commit/${encodeURIComponent(commit.hash)}`,
            icon: { source: "git-commit.svg" },
          },
        ];
      },
      branchRelated(branch: string): RemoteWebPage[] {
        if (!repoBase) return [];
        return [
          {
            title: "Branch Page",
            url: `${repoBase}?version=GB${encodeURIComponent(branch)}`,
            icon: { source: "git-branch.svg" },
          },
          {
            title: "Create Pull Request",
            url: `${repoBase}/pullrequestcreate?sourceRef=${encodeURIComponent(`refs/heads/${branch}`)}`,
            icon: Icon.Plus,
            shortcut: { modifiers: ["cmd"], key: "n" },
          },
        ];
      },
      tagRelated(_tag: string): RemoteWebPage[] {
        return [];
      },
      other(): RemoteWebPage[] {
        if (!repoBase) return [];
        return [
          {
            title: "Pull Requests",
            url: `${repoBase}/pullrequests`,
            icon: { source: "git-merge.svg" },
          },
          {
            title: "Home Page",
            url: repoBase,
            icon: { source: "git-project.svg" },
          },
        ];
      },
    },
  };
}

function unknownParser(_url: string, _parsed?: URLComponents): RemoteHostParserResult {
  return {
    provider: undefined as RemoteProvider,
    organizationName: undefined,
    repositoryName: undefined,
    avatarUrl: undefined,
    webPages: {
      fileRelated: () => [],
      commitRelated: () => [],
      branchRelated: () => [],
      tagRelated: () => [],
      other: () => [],
    },
  };
}

// --- internals ---------------------------------------------------------------

type URLComponents = {
  protocol: string;
  hostname: string;
  path: string;
};

function parse(url: string): URLComponents | undefined {
  // Try SCP-like: user@host:path OR host:path (ssh principal)
  const scpMatch = url.match(/^[^@\s]+@([^:/]+)[:/](.+)$/);
  if (scpMatch) {
    const normalizedPath = scpMatch[2]
      .replace(/^\//, "")
      .replace(/^scm\//, "")
      .replace(/\.git$/i, "");
    return {
      protocol: "https",
      hostname: scpMatch[1],
      path: normalizedPath,
    };
  }

  try {
    const parsed = new URL(url);
    const normalizedPath = parsed.pathname
      .replace(/^\//, "")
      .replace(/^scm\//, "")
      .replace(/\.git$/i, "");
    return {
      protocol: parsed.protocol.replace(":", ""),
      hostname: parsed.hostname,
      path: normalizedPath,
    };
  } catch {
    return undefined;
  }
}
