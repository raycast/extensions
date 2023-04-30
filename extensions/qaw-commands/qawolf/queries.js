import { gql } from "graphql-request";

export const getAllClients = gql`
  query {
    teams(
      where: {
        is_enabled: {equals: true},
        contract: {isNot: null}
      }
    ) {
      id
      name
      contract {
        status
      }
    }
  }
`

export const getSuiteById = gql`
  query GetSuiteById($suiteId: String) {
    suites(where: { id: { equals: $suiteId } }) {
      created_at
      creator {
        email
      }
      display_status_counts {
        bug
        canceled
        created
        fail
        flake
        maintenance
        pass
      }
      environment {
        id
        name
      }
      environment_variables
      id
      name
      runs {
        canceled_at
        canceled_reason
        completed_at
        # current_line
        id
        status
        test {
          id
          name
        }
        triage_status
        updated_at
      }
      trigger {
			  id
			  name
		  }
      team {
        name
        id
      }
      tasks(where: {deletedAt: {equals: null}}) {
        id
        type
        status
      }
    }
  }
`;

export const getSuiteFailingRuns = gql`
  query ($suiteId: String) {
    suite(where: { id: $suiteId }) {
      runs(where: { status: { equals: fail } }) {
        id
        triage_status
      }
    }
  }
`;

export const getRecentFailedRuns = gql`
  query ($minTime: DateTime) {
    runs(
      where: {
        completed_at: { gte: $minTime }
        status: { equals: "fail" }
        team: { is: { is_qawolf_alert_enabled: { equals: true } } }
      }
    ) {
      id
      completed_at
      test {
        id
        name
      }
      status
      suite {
        name
        id
      }
      team {
        name
      }
      triage_status
    }
  }
`;

export const getTestsData = gql`
  query {
    viewer {
      teams(
        where: { AND: [{ is_enabled: { equals: true }, is_qawolf_alert_enabled: { equals: true } }] }
        orderBy: { name: asc }
      ) {
        id
        name
        tests(where: { AND: [{ deleted_at: { equals: null } }] }) {
          id
          name
          status
          tags {
            name
          }
        }
      }
    }
  }
`;

export const getEnvironmentByName = gql`
  query getEnvironments($team_id: String, $name: String) {
    environments(where: { team_id: { equals: $team_id }, name: { equals: $name } }) {
      id
      name
    }
  }
`;

export const getGroupsForTeam = gql`
  query getGroups($team_id: String) {
    groups(where: { team_id: { equals: $team_id }, deleted_at: { equals: null } }) {
      id
      name
    }
  }
`;

export const getTestsFromIds = gql`
  query getTestsFromIds($test_ids: [String!]) {
    tests(where: { id: { in: $test_ids } }) {
      id
      name
      status
      group {
        id
        name
      }
    }
  }
`;

export const getUserByEmail = gql`
  query getUserByEmail($email: String!) {
    user(where: { email: $email }) {
      email
      id
      default_team {
        id
        name
      }
      teams {
        id
        name
      }
    }
  }
`;

export const getTestsStatusesAndTags = gql`
  query getTestsStatus($team_id: String!) {
    tests(where: { team_id: { equals: $team_id }, deleted_at: { equals: null } }) {
      id
      name
      status
      tags {
        id
        name
      }
    }
  }
`;

export const getTestTags = gql`
  query getTestTags($test_id: String!) {
    test(where: { id: $test_id }) {
      id
      name
      tags {
        id
        name
      }
    }
  }
`;

export const getOpenBugReportsForTeam = gql`
  query getOpenBugReportsForTeam($team_id: String) {
    bugReports(where: { team_id: { equals: $team_id }, status: { equals: open } }) {
      id
      name
      affected_tests {
        id
        name
      }
      # description
      description_plain_text
      # reported_suite_id
      status
      created_at
      created_by {
        email
      }
      # team {
      #   id
      #   name
      # }
    }
  }
`;

export const getBugReport = gql`
  query getBugReport($id: String!) {
    bugReport(where: { id: $id }) {
      id
      name
      created_at
      description_plain_text
      status
      created_by {
        email
      }
      affected_tests {
        id
        name
        tags {
          id
          name
        }
      }
    }
  }
`;

export const getTestById = gql`
  query getTestById($teamId: String!, $testId: String!) {
      steps(where: {
          team_id: { equals: $teamId},
          id: {equals: $testId},
          deleted_at: { equals: null } 
      }) {
        id
        name
        external_id
        tests(where: {test: {is: {deleted_at: {equals: null}}}}) {
          id
          test {
            id
            name
            status
          }
        }
      }
    }
`;

export const getTestsForClient = gql`
  query getTestsForClient($id: String!) {
    steps(where: { team_id: { equals: $id }, deleted_at: { equals: null } }) {
      id
      name
      external_id
    }
  }
`;

export const getWorkflowByName = gql`
  query {
    tests(where: {AND: [
      {name: {equals: "[Perfect Snacks] KeHe Scraper"}},
      {deleted_at: null}
    ]}) {
      id
      team {name}
      name
      steps {
        step {
          id
          name
        }
      }
    }
  }
`;

export const getWorkflowTestsForClient = gql`
  query getTestStepsForTeam($teamId: String!) {
    tests(where: { team_id: { equals: $teamId }, deleted_at: { equals: null } }) {
      id
      name
      group {
        name
      }
      status
      steps(orderBy: { index: asc }) {
        id
        step {
          id
          name
          external_id
        }
      }
    }
  }
`;

export const getSuiteLogs = gql`
  query getSuiteLogs($suite_id: String!) {
    suite(where: { id: $suite_id }) {
      id
      name
      environment_id
      team {
        id
        name
      }
      runs {
        id
        completed_at
        canceled_at
        test {
          id
          name
          status
        }
        status
        attempts(orderBy: { created_at: desc }, take: 1) {
          created_at
          status
          logs_url
        }
      }
    }
  }
`;

// Eric import
export const getTestsDataForTeam = gql`
  query getTeamTests($teamId: String) {
    viewer {
      teams(
        where: {
          AND: [{ is_enabled: { equals: true }, is_qawolf_alert_enabled: { equals: true }, id: { equals: $teamId } }]
        }
        orderBy: { name: asc }
      ) {
        id
        name
        groups {
          id
          name
        }
        tests(where: { AND: [{ deleted_at: { equals: null } }] }) {
          id
          name
          status
          group {
            id
            name
          }
          tags {
            name
          }
          activityLog(where: { type: { equals: test_status_updated } }, take: 1, orderBy: { created_at: desc }) {
            created_at
            data
            type
          }
          runs(where: { NOT: { status: { equals: created } } }, orderBy: { created_at: desc }, take: 1) {
            id
            # current_line
            error
            status
          }
          coverage_requests {
            id
          }
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
    }
  }
`;

export const getTestsWithCode = gql`
  query($teamID: String!, $code: String!) {
    steps(where: {
      team_id: {equals: $teamID}
      code: { contains: $code }
      deleted_at: { equals: null }
    }) {
      id
      name
      code
      tests {
        test {
          id
          name
        }
      }
    }
  }`;

export const getRunById = gql`
  query ($runId: String) {
    run(where: { id: $runId }) {
      id
      canceled_at
      canceled_reason
      completed_at
      created_at
      started_at
      status
      triaged_by
      updated_at
      suite {
        id
        name
      }
      team {
        id
        name
      }
      test {
        id
        name
      }
      triage_status
    }
  }
`;

export const getRunCode = gql`
  query getRunWithCode($run_id: String!) {
    run(where: { id: $run_id }) {
      id
      test {
        id
        name
      }
      code
      # current_line
      status
      team {
        id
        name
      }
    }
  }
`;

export const getTriageForSuites = gql`
  query GetTriageForSuites($suiteIds: [String!]) {
    suites(where: { id: { in: $suiteIds } }) {
      id
      runs {
        id
        triage_status
        updated_at
      }
    }
  }
`;

export const getTriageForSuite = gql`
  query getTriageForSuite($suiteId: String!) {
    suite(where: { id: $suiteId }) {
      id
      runs {
        id
        triage_status
        updated_at
        status
      }
    }
  }
`;

// Eric import
export const getFailuresData = gql`
  query ($min_date: DateTime) {
    viewer {
      teams(
        where: { AND: [{ is_enabled: { equals: true }, is_qawolf_alert_enabled: { equals: true } }] }
        orderBy: { name: asc }
      ) {
        id
        name
        suites(where: { created_at: { gte: $min_date } }) {
          name
          runs(orderBy: { created_at: desc }) {
            id
            status
            team_id
            test_id
          }
        }
      }
    }
  }
`;

export const getTriageTask = gql`
  query getTriageTask($taskId: String, $suiteId: String) {
    tasks(where: { id: { equals: $taskId }, suiteId: { equals: $suiteId }, deletedAt: { equals: null } }) {
      id
      createdAt
      completedAt
      firstAssignedAt
      lastAssignedAt
      status
      type
      updatedAt
      assignedTo {
        id
        email
      }
      suite {
        id
        name
        team {
          id
          name
        }
      }
    }
  }
`;
