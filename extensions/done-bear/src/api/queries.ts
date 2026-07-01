const TASK_FIELDS = `
  id
  title
  description
  createdAt
  updatedAt
  completedAt
  archivedAt
  start
  startDate
  startBucket
  todayIndexReferenceDate
  deadlineAt
  creatorId
  workspaceId
  projectId
  teamId
  assigneeId
  headingId
  repeatRule
  repeatTemplateId
`;

const PROJECT_FIELDS = `
  id
  key
  name
  description
  status
  sortOrder
  targetDate
  completedAt
  archivedAt
  createdAt
  updatedAt
  workspaceId
  creatorId
`;

const PAGE_INFO = `
  pageInfo {
    hasNextPage
    endCursor
  }
`;

export const TASKS_QUERY = `
  query DonebearTasks($first: Int!, $after: String, $workspaceId: ID!) {
    tasks(first: $first, after: $after, filter: { workspaceId: { eq: $workspaceId } }) {
      nodes { ${TASK_FIELDS} }
      ${PAGE_INFO}
    }
  }
`;

export const TASKS_ALL_QUERY = `
  query DonebearTasksAll($first: Int!, $after: String, $workspaceIds: [ID!]!) {
    tasks(first: $first, after: $after, filter: { workspaceId: { in: $workspaceIds } }) {
      nodes { ${TASK_FIELDS} }
      ${PAGE_INFO}
    }
  }
`;

export const SEARCH_TASKS_QUERY = `
  query SearchTasks($first: Int!, $after: String, $workspaceId: ID!, $search: String!) {
    tasks(first: $first, after: $after, search: $search, filter: { workspaceId: { eq: $workspaceId } }) {
      nodes { ${TASK_FIELDS} }
      ${PAGE_INFO}
    }
  }
`;

export const SEARCH_TASKS_ALL_QUERY = `
  query SearchTasksAll($first: Int!, $after: String, $workspaceIds: [ID!]!, $search: String!) {
    tasks(first: $first, after: $after, search: $search, filter: { workspaceId: { in: $workspaceIds } }) {
      nodes { ${TASK_FIELDS} }
      ${PAGE_INFO}
    }
  }
`;

export const PROJECTS_QUERY = `
  query DonebearProjects($first: Int!, $after: String, $workspaceId: ID!) {
    projects(first: $first, after: $after, filter: { workspaceId: { eq: $workspaceId } }) {
      nodes { ${PROJECT_FIELDS} }
      ${PAGE_INFO}
    }
  }
`;

export const PROJECTS_ALL_QUERY = `
  query DonebearProjectsAll($first: Int!, $after: String, $workspaceIds: [ID!]!) {
    projects(first: $first, after: $after, filter: { workspaceId: { in: $workspaceIds } }) {
      nodes { ${PROJECT_FIELDS} }
      ${PAGE_INFO}
    }
  }
`;

export const TEAMS_QUERY = `
  query DonebearTeams($first: Int!, $after: String, $workspaceId: String!) {
    teams(first: $first, after: $after, filter: { workspaceId: { eq: $workspaceId } }) {
      nodes {
        id
        key
        name
        description
        workspaceId
        createdAt
        updatedAt
        archivedAt
      }
      ${PAGE_INFO}
    }
  }
`;

export const VIEWER_QUERY = `
  query Viewer {
    viewer {
      id
      email
      name
      username
    }
  }
`;

export const MY_WORKSPACES_QUERY = `
  query MyWorkspaces {
    myWorkspaces {
      id
      name
      urlKey
      logoUrl
      role
    }
  }
`;

export const CHECKLIST_ITEMS_QUERY = `
  query ChecklistItems($first: Int!, $after: String, $taskId: ID!) {
    taskChecklistItems(first: $first, after: $after, filter: { taskId: { eq: $taskId } }, orderBy: { sortOrder: ASC }) {
      nodes {
        id
        title
        sortOrder
        completedAt
        createdAt
        updatedAt
        taskId
        workspaceId
      }
      ${PAGE_INFO}
    }
  }
`;
