import { useCachedPromise } from "@raycast/utils";
import { AgentSessionState, PullRequestWithAgentSessions, fetchSessions } from "../services/copilot";

const minutesAgoISO8601Timestamp = (n: number): string => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - n);
  return date.toISOString();
};

const DUMMY_PULL_REQUESTS_WITH_AGENT_SESSION: PullRequestWithAgentSessions[] = [
  {
    key: "1",
    pullRequest: {
      title: "Refactor homepage layout into discrete components",
      state: "OPEN",
      url: "https://github.com/user/repo/pull/1",
      repository: {
        name: "bookstore",
        owner: {
          login: "contoso",
        },
      },
    },
    sessions: [
      {
        id: "1",
        name: "Initial implementation",
        user_id: 1,
        agent_id: 1,
        logs: "",
        logs_blob_id: "1",
        state: AgentSessionState.IN_PROGRESS,
        owner_id: 1,
        repo_id: 1,
        resource_type: "pull",
        resource_id: 1,
        last_updated_at: minutesAgoISO8601Timestamp(5),
        created_at: minutesAgoISO8601Timestamp(10),
        completed_at: null,
        event_type: "pull_request",
        event_identifiers: ["1"],
        workflow_run_id: 1,
        premium_requests: 1,
        error: null,
      },
    ],
  },
  {
    key: "2",
    pullRequest: {
      title: "Implement dark/light mode switcher",
      state: "OPEN",
      url: "https://github.com/user/repo/pull/1",
      repository: {
        name: "bookstore",
        owner: {
          login: "contoso",
        },
      },
    },
    sessions: [
      {
        id: "1",
        name: "Review from @six7",
        user_id: 1,
        agent_id: 1,
        logs: "",
        logs_blob_id: "1",
        state: AgentSessionState.IN_PROGRESS,
        owner_id: 1,
        repo_id: 1,
        resource_type: "pull",
        resource_id: 1,
        last_updated_at: minutesAgoISO8601Timestamp(10),
        created_at: minutesAgoISO8601Timestamp(15),
        completed_at: null,
        event_type: "pull_request",
        event_identifiers: ["1"],
        workflow_run_id: 1,
        premium_requests: 1,
        error: null,
      },
    ],
  },
  {
    key: "3",
    pullRequest: {
      title: "Fix bug in authentication flow",
      state: "OPEN",
      url: "https://github.com/user/repo/pull/2",
      repository: {
        name: "bookstore",
        owner: {
          login: "contoso",
        },
      },
    },
    sessions: [
      {
        id: "2",
        name: "Review from @timrogers",
        user_id: 2,
        agent_id: 2,
        logs: "",
        logs_blob_id: "2",
        state: AgentSessionState.COMPLETED,
        owner_id: 2,
        repo_id: 2,
        resource_type: "pull",
        resource_id: 2,
        last_updated_at: minutesAgoISO8601Timestamp(180),
        created_at: minutesAgoISO8601Timestamp(185),
        completed_at: minutesAgoISO8601Timestamp(170),
        event_type: "pull_request",
        event_identifiers: ["2"],
        workflow_run_id: 2,
        premium_requests: 2,
        error: null,
      },
    ],
  },
  {
    key: "3.1",
    pullRequest: {
      title: "Increase test coverage for product page",
      state: "OPEN",
      url: "https://github.com/user/repo/pull/2",
      repository: {
        name: "bookstore",
        owner: {
          login: "contoso",
        },
      },
    },
    sessions: [
      {
        id: "2",
        name: "Initial implementation",
        user_id: 2,
        agent_id: 2,
        logs: "",
        logs_blob_id: "2",
        state: AgentSessionState.COMPLETED,
        owner_id: 2,
        repo_id: 2,
        resource_type: "pull",
        resource_id: 2,
        last_updated_at: minutesAgoISO8601Timestamp(5 * 60),
        created_at: minutesAgoISO8601Timestamp(5 * 60),
        completed_at: minutesAgoISO8601Timestamp(5 * 60),
        event_type: "pull_request",
        event_identifiers: ["2"],
        workflow_run_id: 2,
        premium_requests: 2,
        error: null,
      },
    ],
  },
  {
    key: "4",
    pullRequest: {
      title: "Update copy for sold out books",
      state: "MERGED",
      url: "https://github.com/user/repo/pull/2",
      repository: {
        name: "bookstore",
        owner: {
          login: "contoso",
        },
      },
    },
    sessions: [
      {
        id: "2",
        name: "Initial implementation",
        user_id: 2,
        agent_id: 2,
        logs: "",
        logs_blob_id: "2",
        state: AgentSessionState.COMPLETED,
        owner_id: 2,
        repo_id: 2,
        resource_type: "pull",
        resource_id: 2,
        last_updated_at: minutesAgoISO8601Timestamp(60 * 8),
        created_at: minutesAgoISO8601Timestamp(60 * 8),
        completed_at: minutesAgoISO8601Timestamp(60 * 7),
        event_type: "pull_request",
        event_identifiers: ["2"],
        workflow_run_id: 2,
        premium_requests: 2,
        error: null,
      },
    ],
  },
  {
    key: "5",
    pullRequest: {
      title: "Upgrade to Ruby 3.4.1",
      state: "MERGED",
      url: "https://github.com/user/repo/pull/2",
      repository: {
        name: "bookstore",
        owner: {
          login: "contoso",
        },
      },
    },
    sessions: [
      {
        id: "2",
        name: "Initial implementation",
        user_id: 2,
        agent_id: 2,
        logs: "",
        logs_blob_id: "2",
        state: AgentSessionState.COMPLETED,
        owner_id: 2,
        repo_id: 2,
        resource_type: "pull",
        resource_id: 2,
        last_updated_at: minutesAgoISO8601Timestamp(60 * 11),
        created_at: minutesAgoISO8601Timestamp(60 * 11),
        completed_at: minutesAgoISO8601Timestamp(60 * 10),
        event_type: "pull_request",
        event_identifiers: ["2"],
        workflow_run_id: 2,
        premium_requests: 2,
        error: null,
      },
    ],
  },
  {
    key: "6",
    pullRequest: {
      title: "Migrate <ProductImage> to use styled-components",
      state: "MERGED",
      url: "https://github.com/user/repo/pull/2",
      repository: {
        name: "bookstore",
        owner: {
          login: "contoso",
        },
      },
    },
    sessions: [
      {
        id: "2",
        name: "Review from @timrogers",
        user_id: 2,
        agent_id: 2,
        logs: "",
        logs_blob_id: "2",
        state: AgentSessionState.COMPLETED,
        owner_id: 2,
        repo_id: 2,
        resource_type: "pull",
        resource_id: 2,
        last_updated_at: minutesAgoISO8601Timestamp(60 * 35),
        created_at: minutesAgoISO8601Timestamp(60 * 35),
        completed_at: minutesAgoISO8601Timestamp(60 * 34),
        event_type: "pull_request",
        event_identifiers: ["2"],
        workflow_run_id: 2,
        premium_requests: 2,
        error: null,
      },
    ],
  },
  {
    key: "7",
    pullRequest: {
      title: "Refresh documentation for build process",
      state: "MERGED",
      url: "https://github.com/user/repo/pull/2",
      repository: {
        name: "bookstore",
        owner: {
          login: "contoso",
        },
      },
    },
    sessions: [
      {
        id: "2",
        name: "Initial implementation",
        user_id: 2,
        agent_id: 2,
        logs: "",
        logs_blob_id: "2",
        state: AgentSessionState.COMPLETED,
        owner_id: 2,
        repo_id: 2,
        resource_type: "pull",
        resource_id: 2,
        last_updated_at: minutesAgoISO8601Timestamp(60 * 50),
        created_at: minutesAgoISO8601Timestamp(60 * 50),
        completed_at: minutesAgoISO8601Timestamp(60 * 49),
        event_type: "pull_request",
        event_identifiers: ["2"],
        workflow_run_id: 2,
        premium_requests: 2,
        error: null,
      },
    ],
  },
];

enum Mode {
  LIVE,
  DEMO_WITH_SESSIONS,
  DUMMY_EMPTY_STATE,
}

const MODE = Mode.LIVE as Mode;

// Asynchronously loads pull requests with associated agent sessions
export const usePullRequestsWithAgentSessions = (): {
  isLoading: boolean;
  pullRequestsWithAgentSessions: PullRequestWithAgentSessions[];
} => {
  if (MODE === Mode.LIVE) {
    const { data: pullRequestsWithAgentSessions, isLoading } = useCachedPromise(fetchSessions, [], {
      initialData: [],
      keepPreviousData: true,
    });
    return { isLoading, pullRequestsWithAgentSessions };
  } else if (MODE === Mode.DEMO_WITH_SESSIONS) {
    return { isLoading: false, pullRequestsWithAgentSessions: DUMMY_PULL_REQUESTS_WITH_AGENT_SESSION };
  } else {
    return { isLoading: false, pullRequestsWithAgentSessions: [] };
  }
};
