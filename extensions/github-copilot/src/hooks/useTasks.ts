import { useCachedPromise } from "@raycast/utils";
import { TaskWithPullRequest, fetchTasks } from "../services/copilot";

const minutesAgoISO8601Timestamp = (n: number): string => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - n);
  return date.toISOString();
};

const DUMMY_TASKS_WITH_PULL_REQUESTS: TaskWithPullRequest[] = [
  {
    key: "1",
    pullRequest: {
      globalId: "foo",
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
    task: {
      id: "task-1",
      creator_id: 1,
      user_collaborators: [],
      agent_collaborators: [],
      owner_id: 1,
      repo_id: 1,
      status: "in_progress",
      session_count: 1,
      artifacts: [],
      archived_at: null,
      last_updated_at: minutesAgoISO8601Timestamp(5),
      created_at: minutesAgoISO8601Timestamp(10),
    },
  },
  {
    key: "2",
    pullRequest: {
      globalId: "foo",
      title: "Implement dark/light mode switcher",
      state: "OPEN",
      url: "https://github.com/user/repo/pull/2",

      repository: {
        name: "bookstore",
        owner: {
          login: "contoso",
        },
      },
    },
    task: {
      id: "task-2",
      creator_id: 1,
      user_collaborators: [],
      agent_collaborators: [],
      owner_id: 1,
      repo_id: 1,
      status: "in_progress",
      session_count: 2,
      artifacts: [],
      archived_at: null,
      last_updated_at: minutesAgoISO8601Timestamp(10),
      created_at: minutesAgoISO8601Timestamp(15),
    },
  },
  {
    key: "3",
    pullRequest: {
      globalId: "foo",
      title: "Fix bug in authentication flow",
      state: "OPEN",
      url: "https://github.com/user/repo/pull/3",

      repository: {
        name: "bookstore",
        owner: {
          login: "contoso",
        },
      },
    },
    task: {
      id: "task-3",
      creator_id: 1,
      user_collaborators: [],
      agent_collaborators: [],
      owner_id: 1,
      repo_id: 1,
      status: "completed",
      session_count: 1,
      artifacts: [],
      archived_at: null,
      last_updated_at: minutesAgoISO8601Timestamp(180),
      created_at: minutesAgoISO8601Timestamp(185),
    },
  },
  {
    key: "3.1",
    pullRequest: {
      globalId: "foo",
      title: "Increase test coverage for product page",
      state: "OPEN",
      url: "https://github.com/user/repo/pull/4",

      repository: {
        name: "bookstore",
        owner: {
          login: "contoso",
        },
      },
    },
    task: {
      id: "task-4",
      creator_id: 1,
      user_collaborators: [],
      agent_collaborators: [],
      owner_id: 1,
      repo_id: 1,
      status: "completed",
      session_count: 1,
      artifacts: [],
      archived_at: null,
      last_updated_at: minutesAgoISO8601Timestamp(5 * 60),
      created_at: minutesAgoISO8601Timestamp(5 * 60),
    },
  },
  {
    key: "4",
    pullRequest: {
      globalId: "foo",
      title: "Update copy for sold out books",
      state: "MERGED",
      url: "https://github.com/user/repo/pull/5",

      repository: {
        name: "bookstore",
        owner: {
          login: "contoso",
        },
      },
    },
    task: {
      id: "task-5",
      creator_id: 1,
      user_collaborators: [],
      agent_collaborators: [],
      owner_id: 1,
      repo_id: 1,
      status: "completed",
      session_count: 1,
      artifacts: [],
      archived_at: null,
      last_updated_at: minutesAgoISO8601Timestamp(60 * 8),
      created_at: minutesAgoISO8601Timestamp(60 * 8),
    },
  },
  {
    key: "5",
    pullRequest: {
      globalId: "foo",
      title: "Upgrade to Ruby 3.4.1",
      state: "MERGED",
      url: "https://github.com/user/repo/pull/6",

      repository: {
        name: "bookstore",
        owner: {
          login: "contoso",
        },
      },
    },
    task: {
      id: "task-6",
      creator_id: 1,
      user_collaborators: [],
      agent_collaborators: [],
      owner_id: 1,
      repo_id: 1,
      status: "completed",
      session_count: 1,
      artifacts: [],
      archived_at: null,
      last_updated_at: minutesAgoISO8601Timestamp(60 * 11),
      created_at: minutesAgoISO8601Timestamp(60 * 11),
    },
  },
  {
    key: "6",
    pullRequest: {
      globalId: "foo",
      title: "Migrate <ProductImage> to use styled-components",
      state: "MERGED",
      url: "https://github.com/user/repo/pull/7",

      repository: {
        name: "bookstore",
        owner: {
          login: "contoso",
        },
      },
    },
    task: {
      id: "task-7",
      creator_id: 1,
      user_collaborators: [],
      agent_collaborators: [],
      owner_id: 1,
      repo_id: 1,
      status: "completed",
      session_count: 2,
      artifacts: [],
      archived_at: null,
      last_updated_at: minutesAgoISO8601Timestamp(60 * 35),
      created_at: minutesAgoISO8601Timestamp(60 * 35),
    },
  },
  {
    key: "7",
    pullRequest: {
      globalId: "foo",
      title: "Refresh documentation for build process",
      state: "MERGED",
      url: "https://github.com/user/repo/pull/8",

      repository: {
        name: "bookstore",
        owner: {
          login: "contoso",
        },
      },
    },
    task: {
      id: "task-8",
      creator_id: 1,
      user_collaborators: [],
      agent_collaborators: [],
      owner_id: 1,
      repo_id: 1,
      status: "completed",
      session_count: 1,
      artifacts: [],
      archived_at: null,
      last_updated_at: minutesAgoISO8601Timestamp(60 * 50),
      created_at: minutesAgoISO8601Timestamp(60 * 50),
    },
  },
];

enum Mode {
  LIVE,
  DEMO_WITH_TASKS,
  DUMMY_EMPTY_STATE,
}

const MODE = Mode.LIVE as Mode;

// Asynchronously loads tasks with associated pull requests
export const useTasks = (): {
  isLoading: boolean;
  tasks: TaskWithPullRequest[];
} => {
  if (MODE === Mode.LIVE) {
    const { data: tasks, isLoading } = useCachedPromise(fetchTasks, [], {
      initialData: [],
      keepPreviousData: true,
    });
    return { isLoading, tasks };
  } else if (MODE === Mode.DEMO_WITH_TASKS) {
    return { isLoading: false, tasks: DUMMY_TASKS_WITH_PULL_REQUESTS };
  } else {
    return { isLoading: false, tasks: [] };
  }
};
