import { gql } from "graphql-request";

export const setTestStatus = gql`
  mutation ($testId: ID!, $testStatus: TestStatus!) {
    updateTest(id: $testId, status: $testStatus) {
      status
    }
  }
`;

export const createSuite = gql`
  mutation ($test_ids: [ID!]!, $environment_id: ID!, $include_test_statuses: [TestStatus!]) {
    createSuite(test_ids: $test_ids, environment_id: $environment_id, include_test_statuses: $include_test_statuses)
  }
`;

export const updateRunsTriage = gql`
  mutation ($runIds: [ID!]!, $triageStatus: RunTriageStatus!) {
    updateRuns(ids: $runIds, triage_status: $triageStatus) {
      id
      triage_status
    }
  }
`;

export const deleteEnvironment = gql`
  mutation ($env_id: ID!) {
    deleteEnvironment(environment_id: $env_id) {
      id
    }
  }
`;

export const moveTest = gql`
  mutation moveTest($test_id: ID!, $group_id: ID!) {
    moveTestsToGroup(test_ids: [$test_id], move_to_group_id: $group_id) {
      moveCount
    }
  }
`;

export const moveTestToUncategorized = gql`
  mutation moveTest($test_id: ID!) {
    removeTestsFromGroup(test_ids: [$test_id]) {
      moveCount
    }
  }
`;

export const deleteGroup = gql`
  mutation deleteGroup($group_id: ID!) {
    deleteGroup(id: $group_id) {
      group {
        id
      }
    }
  }
`;

export const createBugReport = gql`
  mutation createBugReport($team_id: ID!, $name: String!) {
    createBugReport(name: $name, team_id: $team_id) {
      id
      name
    }
  }
`;

export const updateBugReport = gql`
  mutation updateBugReport(
    $id: String!
    $name: String!
    $reported_suite_id: ID
    $description_rich_text: String!
    $affected_test_ids: [ID!]!
    $affected_environment_ids: [ID!]!
  ) {
    updateBugReport(
      id: $id
      name: $name
      reported_suite_id: $reported_suite_id
      description_rich_text: $description_rich_text
      affected_test_ids: $affected_test_ids
      affected_environment_ids: $affected_environment_ids
    ) {
      id
      name
    }
  }
`;

export const renameTest = gql`
  mutation renameTest($id: ID!, $name: String) {
    updateTest(id: $id, name: $name) {
      id
      name
    }
  }
`;

export const deleteTests = gql`
  mutation deleteTest($test_ids: [ID!]!) {
    deleteTests(ids: $test_ids) {
      id
    }
  }
`;

export const createStep = gql`
  mutation createStep($team_id: ID!, $name: String!, $external_id: String) {
    createStep(team_id: $team_id, name: $name, external_id: $external_id) {
      id
      name
      external_id
    }
  }
`;

export const updateStep = gql`
  mutation updateStep($step_id: ID!, $name: String!, $code: String) {
    updateStep(id: $step_id, name: $name, code: $code) {
      id
    }
  }
`;

export const deleteStep = gql`
  mutation deleteStep($step_id: ID!) {
    deleteStep(id: $step_id) {
      id
    }
  }
`;

export const removeStepFromTest = gql`
  mutation removeStepFromTest($id: ID!) {
    removeStepFromTest(associationId: $id) {
      id
    }
  }
`;

export const addStepToTest = gql`
  mutation addStepToTest($test_id: ID!, $step_id: ID!, $index: Int!) {
    addStepToTest(test_id: $test_id, step_id: $step_id, index: $index) {
      id
    }
  }
`;

export const duplicateTest = gql`
  mutation duplicateTest($test_id: ID!, $name: String!, $group_id: ID) {
    duplicateTest(test_id: $test_id, name: $name, group_id: $group_id) {
      id
			name
			steps {
				id
				external_id
				step_id
				index
				test_id
				step {
					name
					code
				}
			}
    }
  }
`;

export const createTestRequest = gql`
  mutation createTestCoverageRequest($name: String!, $text: String!, $team_id: String!) {
    createTestCoverageRequest(data: { name: $name, description_rich_text: $text, team_id: $team_id }) {
      id
      status
      covered_tests {
        id
      }
			tasks(where: {completedAt: null}) {
				id
				type
			}
    }
  }
`;

export const updateTestRequest = gql`
  mutation updateTestCoverageRequest(
    $id: String!
    $name: String!
    $text: String!
    $status: TestCoverageRequestStatus!
  ) {
    updateTestCoverageRequest(data: { id: $id, name: $name, description_rich_text: $text, status: $status }) {
      id
    }
  }
`;

export const createTask = gql`
  mutation createTask(
    $assignedToId: ID
    $createdAt: DateTime
    $completedAt: DateTime
    $dueAt: LocalDate
    $effort: TaskEffort
    $priority: TaskPriority
    $status: TaskStatus
    $suiteId: ID
    $teamId: ID!
    $type: TaskType!
    $testId: ID
    $requestId: ID
    $name: String
    $richText: String
  ) {
    createTask(
      assignedToId: $assignedToId
      completedAt: $completedAt
      createdAt: $createdAt
      dueAt: $dueAt
      effort: $effort
      priority: $priority
      status: $status
      suiteId: $suiteId
      teamId: $teamId
      type: $type
      testId: $testId
      testCoverageRequestId: $requestId
      name: $name
      notesRichText: $richText
    ) {
      id
    }
  }
`;

export const assignTask = gql`
  mutation assignTask($taskId: ID!, $userId: ID) {
    updateTasks(ids: [$taskId], assignedToId: $userId) {
      id
      assignedTo {
        id
        email
      }
    }
  }
`;

export const deleteTask = gql`
  mutation deleteTask($taskId: ID!) {
    deleteTasks(ids: [$taskId]) {
      id
      name
      team {
        name
      }
    }
  }
`;

export const updateTaskStatus = gql`
  mutation updateTaskStatus($taskId: ID!, $status: TaskStatus!) {
    updateTasks(ids: [$taskId], status: $status) {
      id
    }
  }
`;

export const updateTask = gql`
	mutation updateTask(
		$id: [ID!]!
		$assignedToId: ID
		$dueAt: LocalDate
		$status: TaskStatus
		$effort: TaskEffort
		$priority: TaskPriority
	) {
		updateTasks(
			ids: $id
			assignedToId: $assignedToId
			status: $status
			dueAt: $dueAt
			effort: $effort
			priority: $priority
		) {
			id
		}
	}
`;

// Eric import
export const createTest = gql`
  mutation CreateTest($group_id: ID, $name: String!, $team_id: ID!) {
    createTest(group_id: $group_id, name: $name, team_id: $team_id) {
      id
			name
    }
  }
`;

// Eric import
export const createGroup = gql`
  mutation createGroup($name: String!, $team_id: ID!) {
    createGroup(name: $name, team_id: $team_id) {
      id
    }
  }
`;

// Eric import
export const createTeam = gql`
  mutation {
    createTeam {
      id
    }
  }
`;

// Eric import
export const createInvites = gql`
  mutation createInvites($team_id: ID!, $emails: [String!]!) {
    createInvites(team_id: $team_id, emails: $emails) {
      id
    }
  }
`;

// Eric import
export const createTag = gql`
  mutation createTag($team_id: ID!, $name: String!) {
    createTag(team_id: $team_id, name: $name) {
      id
    }
  }
`;

// Eric import
export const createEnvironment = gql`
  mutation createEnvironment($team_id: String!, $name: String!) {
    createEnvironment(team_id: $team_id, name: $name) {
      id
    }
  }
`;

// Eric import
export const createTrigger = gql`
  mutation createTrigger($team_id: ID!, $environment_id: ID!, $tag_ids: [ID!], $name: String!, $repeat_minutes: Int) {
    createTrigger(
      team_id: $team_id
      environment_id: $environment_id
      tag_ids: $tag_ids
      name: $name
      repeat_minutes: $repeat_minutes
    ) {
      id
    }
  }
`;

// Eric import
export const updateTeam = gql`
  mutation updateTeam(
    $default_environment_id: String
    $id: ID!
    $inbox: String
    $is_enabled: Boolean
    $is_qawolf_alert_enabled: Boolean
    $name: String
    $run_concurrency_limit: Int
    $bug_report_channel: String
    $alerts_channel: String
  ) {
    updateTeam(
      default_environment_id: $default_environment_id
      id: $id
      inbox: $inbox
      is_enabled: $is_enabled
      is_qawolf_alert_enabled: $is_qawolf_alert_enabled
      name: $name
      run_concurrency_limit: $run_concurrency_limit
      slack_bug_reports_channel_id: $bug_report_channel
      slack_suite_alerts_channel_id: $alerts_channel
    ) {
      id
      name
      default_environment_id
      is_enabled
      is_qawolf_alert_enabled
      run_concurrency_limit
      slack_bug_reports_channel_id
      inbox
    }
  }
`;

export const upsertContract = gql`
  mutation upsertContract(
    $teamId: String!
    $monthlyRevenue: Int!
    $startsAt: DateTime!
    $pilotEndsAt: DateTime!
    $didPilotConvert: Boolean
    $ownerId: String!
    $renewsAt: DateTime!
    $status: ContractStatus!
    $stepLimit: Int
    $extraStepPrice: Int
    $runLimit: Int
    $extraRunPrice: Int
  ) {
    contractUpsert(
      contract: {
        teamId: $teamId
        monthlyRevenue: $monthlyRevenue
        startsAt: $startsAt
        pilotEndsAt: $pilotEndsAt
        didPilotConvert: $didPilotConvert
        ownerId: $ownerId
        renewsAt: $renewsAt
        status: $status
        stepLimit: $stepLimit
        extraStepPriceCents: $extraStepPrice
        runLimit: $runLimit
        extraRunPriceCents: $extraRunPrice
      }
    ) {
      id
    }
  }
`;
