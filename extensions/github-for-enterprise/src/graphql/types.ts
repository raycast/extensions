import { IssueOwnProps } from "../components/Issue";
import { PullRequestOwnProps } from "../components/PullRequest";

export type GetIssues = {
  user: {
    issues: {
      nodes: Omit<IssueOwnProps, "avatarUrl">[];
    };
  };
};

export type GetPullRequests = {
  user: {
    pullRequests: {
      nodes: Omit<PullRequestOwnProps, "avatarUrl">[];
    };
  };
};

export type Repository = {
  id: string;
  name: string;
  nameWithOwner: string;
  viewerPermission: string;
  owner: {
    login: string;
    avatarUrl: string;
  };
  assignableUsers: {
    nodes: {
      id: string;
      login: string;
    }[];
  };
  labels: {
    nodes: {
      id: string;
      name: string;
    }[];
  };
  projects: {
    nodes: {
      id: string;
      name: string;
    }[];
  };
  milestones: {
    nodes: {
      id: string;
      title: string;
    }[];
  };
};

export type GetRepositories = {
  user: {
    repositories: {
      nodes: Repository[];
    };
  };
};

export type GetIssueTemplates = {
  repository: {
    object: {
      entries: {
        name: string;
        object: {
          text: string;
        };
      }[];
    };
  };
};

export type CreateIssue = {
  createIssue: {
    issue: {
      number: number;
    };
  };
};
