import dfns from "date-fns";
import { gql, GraphQLClient } from "graphql-request";
import * as mutations from "./mutations.js";
import * as queries from "./queries.js";
import { setTimeout } from 'timers/promises';
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

const QAW_URL = "https://app.qawolf.com/api/graphql";
const qawClientTarget = new GraphQLClient(QAW_URL, {
  headers: { authorization: preferences.QAW_TOKEN },
});

export let qawApiCalls = 0;
export const qawApiRetries = {
  code502: 0,
  code504: 0,
  etimedout: 0,
  econnreset: 0,
  econnrefused: 0
};

export const qawClient = new Proxy(qawClientTarget, {
  get: (target, property) => {
    if (property === "request") {
      return requestWrapper;
    }
    else {
      return target[property];
    }
  },
})

async function requestWrapper(...args) {
  try {
    qawApiCalls += 1;
    // @ts-ignore
    const result = await qawClientTarget.request(...args);
    return result;
  }
  catch (error) {
    // give various errors a single retry
    if (error.stack?.startsWith("Error: GraphQL Error (Code: 502)")) {
      // wait half a sec before retrying. note that this is the promise version of settimeout;
      await setTimeout(500);
      console.log("QA Wolf API 502 retrying...");
      qawApiCalls += 1;
      qawApiRetries.code502 += 1;
      // @ts-ignore
      return await qawClientTarget.request(...args);
    }
    else if (error.stack?.startsWith("Error: GraphQL Error (Code: 504)")) {
      await setTimeout(1000);
      console.log("QA Wolf API 504 retrying...");
      qawApiCalls += 1;
      qawApiRetries.code504 += 1;
      // @ts-ignore
      return await qawClientTarget.request(...args);
    }
    else if (error.code === "ETIMEDOUT") {
      await setTimeout(500);
      console.log("QA Wolf API ETIMEDOUT retrying...");
      qawApiCalls += 1;
      qawApiRetries.etimedout += 1;
      // @ts-ignore
      return await qawClientTarget.request(...args);
    }
    else if (error.code === "ECONNRESET") {
      await setTimeout(500);
      console.log("QA Wolf API ECONNRESET retrying...");
      qawApiCalls += 1;
      qawApiRetries.econnreset += 1;
      // @ts-ignore
      return await qawClientTarget.request(...args);
    }
    else if (error.code === "ECONNREFUSED") {
      await setTimeout(500);
      console.log("QA Wolf API ECONNREFUSED retrying...");
      qawApiCalls += 1;
      qawApiRetries.econnrefused += 1;
      // @ts-ignore
      return await qawClientTarget.request(...args);
    }
    else {
      throw error;
    }
  }
}

export async function getAllClients() {
  const data = await qawClient.request(queries.getAllClients)
  return data.teams;
}

export async function getSuite(suiteId) {
  try {
    const data = await qawClient.request(queries.getSuiteById, { suiteId });

    const suite = data.suites[0];

    const teamName = suite.team.name;
    const name = suite.name;
    const counts = suite.display_status_counts;
    const createdAt = suite.created_at;
    const completedAt = suite.runs.map(run => run.completed_at ?? run.canceled_at).sort().at(-1);
    const creatorEmail = suite.creator?.email;

    const runs = suite.runs.map((run) => {
      return {
        testId: run.test.id,
        runId: run.id,
        status: run.status,
        testName: run.test.name,
        triageStatus: run.triage_status,
        canceledReason: run.canceled_reason
      };
    });

    const transformedSuite = { createdAt, completedAt, creatorEmail, teamName, name, runs, counts, id: suiteId };
    return transformedSuite;
  } catch (error) {
    console.log(`Error fetching suite ${suiteId}`);
    throw error;
  }
}

/**
 *
 * @param {number} minutes how many minutes back to search
 * @returns {Promise<Run[]>}
 */
export async function getRecentFailedRuns(minutes) {
  const minTime = dfns.subMinutes(new Date(), minutes);

  const data = await qawClient.request(queries.getRecentFailedRuns, { minTime });

  return data;
}

export async function getTestsData() {
  const data = await qawClient.request(queries.getTestsData);
  return data.viewer.teams;
}
export async function getTestsDataForTeam(teamId) {
  const data = await qawClient.request(queries.getTestsDataForTeam, { teamId })
  return data.viewer.teams;
}

export async function createSuite(
  test_ids,
  environment_id,
  include_test_statuses = ["active", "bug", "draft", "maintenance"]
) {
  const data = await qawClient.request(mutations.createSuite, {
    test_ids,
    environment_id,
    include_test_statuses,
  });
  return data.viewer.teams;
}

/**
 * @param {string} testId The ID of the tests a string
 * @param {'active' | 'bug' | 'draft' | 'maintenance'} testStatus
 */
export async function setTestStatus(testId, testStatus) {
  const data = await qawClient.request(mutations.setTestStatus, {
    testId,
    testStatus,
  });
  return data.updateTest.status;
}

export async function getRemainingTriage(suiteId) {
  const data = await qawClient.request(queries.getSuiteFailingRuns, { suiteId });

  return data.suite.runs.filter(run => run.triage_status === null).length;
}

export async function triageFailsAsMaintenance(suiteId) {
  const data = await qawClient.request(queries.getSuiteFailingRuns, { suiteId });

  const runIds = data.suite.runs.map(run => run.id);
  const triageStatus = "maintenance";

  await qawClient.request(mutations.updateRunsTriage, { runIds, triageStatus });
}

export async function getTestsWithCode(teamID, code) {
  const res = await qawClient.request(queries.getTestsWithCode, { teamID, code });

  return res.steps;
}

export async function getRun(runId) {
  const run = await qawClient.request(queries.getRunById, { runId });

  return run;
}

/**
 * @typedef {object} RunWithCode
 * @property {string} id
 * @property {{id: string, name: string}} test
 * @property {number} current_line
 * @property {string} code
 * @property {string} status
 * @property {{id: string, name: string}} team
 */

/**
 * @param {string} run_id
 * @return {Promise<RunWithCode>}
 */
export async function getRunWithCode(run_id) {
  const data = await qawClient.request(queries.getRunCode, { run_id });

  return data.run;
}

/**
 *
 * @param {string[]} suiteIds
 * @returns {Promise<TriageForSuite[]>}
 */
export async function getTriageForSuites(suiteIds) {
  const data = await qawClient.request(queries.getTriageForSuites, { suiteIds });

  return data.suites;
}

/**
 *
 * @param {string} suiteId
 * @returns {Promise<TriageForSuite>}
 */
export async function getTriageForSuite(suiteId) {
  const data = await qawClient.request(queries.getTriageForSuite, { suiteId });

  return data.suite;
}

/**
 * @typedef {{id: string; runs: { id: string; triage_status: string; updated_at: string; status: string; }[]}} TriageForSuite
 */

export async function deleteEnvironment(env_id) {
  const data = await qawClient.request(mutations.deleteEnvironment, { env_id });

  return data.deleteEnvironment;
}

export async function getEnvironmentByName(team_id, name) {
  const data = await qawClient.request(queries.getEnvironmentByName, { team_id, name });

  return data.environments[0];
}

/** @returns {Promise<{id: string, name: string}[]>} */
export async function getGroupsForTeam(team_id) {
  const data = await qawClient.request(queries.getGroupsForTeam, { team_id });

  return data.groups;
}

/**
 *
 * @param {string} test_id
 * @param {string} [group_id] if not provided, test will be moved to "Uncategorized"
 * @returns
 */
export async function moveTest(test_id, group_id) {
  if (group_id) {
    const data = await qawClient.request(mutations.moveTest, { test_id, group_id });
    return data;
  }
  else {
    const data = await qawClient.request(mutations.moveTestToUncategorized, { test_id });
    return data;
  }
}

/** @param {string[]} test_ids an array of test ids */
export async function getTestsFromIds(test_ids) {
  const data = await qawClient.request(queries.getTestsFromIds, { test_ids });

  return data.tests;
}

export async function deleteGroup(group_id) {
  const data = await qawClient.request(mutations.deleteGroup, { group_id });

  return data;
}

/**
 *
 * @param {string} email
 * @returns {Promise<{email: string, id: string, teams: {id: string, name: string}[]}>}
 */
export async function getUserByEmail(email) {
  const data = await qawClient.request(queries.getUserByEmail, { email });

  return data.user;
}

/**
 *
 * @param {string} team_id
 * @returns {Promise<{id: string, name: string, status: string, tags: {id: string, name: string}[]}[]>}
 */
export async function getTestsStatusesAndTags(team_id) {
  const data = await qawClient.request(queries.getTestsStatusesAndTags, { team_id });

  return data.tests;
}

export async function getTestTags(test_id) {
  const data = await qawClient.request(queries.getTestTags, { test_id });

  return data.test;
}

export async function createBugReport(team_id, name) {
  const data = await qawClient.request(mutations.createBugReport, { team_id, name });

  return data.createBugReport;
}

export async function updateBugReport(id, name, reported_suite_id, description_rich_text, affected_test_ids, affected_environment_ids) {
  const data = await qawClient.request(mutations.updateBugReport, { id, name, reported_suite_id, description_rich_text, affected_test_ids, affected_environment_ids });

  return data.updateBugReport;
}

export async function getOpenBugReportsForTeam(team_id) {
  const data = await qawClient.request(queries.getOpenBugReportsForTeam, { team_id });

  return data.bugReports;
}

export async function getBugReport(id) {
  const data = await qawClient.request(queries.getBugReport, { id });

  return data.bugReport;
}

/** @returns {Promise<Step[]>} */
export async function getTestById(teamId, testId) {
  const data = await qawClient.request(queries.getTestById, { teamId, testId });

  return data.steps[0];
}

/** @returns {Promise<Step[]>} */
export async function getTestsForClient(id) {
  const data = await qawClient.request(queries.getTestsForClient, { id });

  return data.steps;
}

/** @returns {Promise<Step[]>} */
export async function getWorkflowByName(wfName) {
  const data = await qawClient.request(queries.getWorkflowByName, { wfName });

  return data.tests;
}

/** @returns {Promise<TestWithSteps[]>} */
export async function getWorkflowTestsForClient(id) {
  const data = await qawClient.request(queries.getWorkflowTestsForClient, { id });

  return data.tests;
}

export async function createStep(team_id, name, external_id) {
  const data = await qawClient.request(mutations.createStep, { team_id, name, external_id });

  return data.createStep;
}

export async function updateStep(step_id, name, code = undefined) {
  const data = await qawClient.request(mutations.updateStep, { step_id, name, code });

  return data.updateStep;
}

export async function deleteStep(step_id) {
  const data = await qawClient.request(mutations.deleteStep, { step_id });

  return data.deleteStep;
}

export async function removeStepFromTest(id) {
  const data = await qawClient.request(mutations.removeStepFromTest, { id });

  return data.removeStepFromTest;
}

export async function addStepToTest(test_id, step_id, index) {
  const data = await qawClient.request(mutations.addStepToTest, { test_id, step_id, index });

  return data.addStepToTest;
}

export async function renameTest(id, name) {
  const data = await qawClient.request(mutations.renameTest, { id, name });

  return data.updateTest;
}

export async function deleteTests(test_ids) {
  const data = await qawClient.request(mutations.deleteTests, { test_ids });

  return data.deleteTests;
}

/**
 * @typedef GetSuiteLogsRun
 * @property {string} id
 * @property {string} completed_at
 * @property {string} canceled_at
 * @property {{id: string, name: string, status: string}} test
 * @property {string} status
 * @property {{created_at: string, status: string, logs_url: string}[]} attempts
 */

/**
 * @typedef GetSuiteLogs
 * @property {string} id
 * @property {string} name
 * @property {string} environment_id
 * @property {{id: string, name: string}} team
 * @property {GetSuiteLogsRun[]} runs
 */

/**
 * @param {string} suite_id
 * @returns {Promise<GetSuiteLogs>}
 */
export async function getSuiteLogs(suite_id) {
  const data = await qawClient.request(queries.getSuiteLogs, { suite_id });

  return data.suite;
}

export async function duplicateTest(test_id, name, group_id) {
  const result = await qawClient.request(mutations.duplicateTest, { test_id, name, group_id });

  return result.duplicateTest;
}

export async function createTestRequest(name, richText, team_id) {
  const result = await qawClient.request(mutations.createTestRequest, {
    name,
    team_id,
    text: richText
  });

  return result.createTestCoverageRequest;
}

export async function updateTestRequest(id, name, richText, status) {
  const result = await qawClient.request(mutations.updateTestRequest, {
    id,
    name,
    status,
    text: richText
  });

  return result.updateTestCoverageRequest;
}

export async function upsertEnvironmentVariable(environment_id, name, value) {
  const result = await qawClient.request(gql`
    mutation upsertEnvVar($environment_id: ID!, $name: String!, $value: String!) {
      upsertEnvironmentVariable(
        environment_id: $environment_id
        name: $name
        value: $value
      ) {
        id
        environment {
          id
          name
          variablesJSON
        }
      }
    }
  `, { environment_id, name, value });

  return result.upsertEnvironmentVariable;
}

export async function getEnvironmentsByTeam(teamId) {
  const result = await qawClient.request(gql`
    query getEnvironmentsByTeam($teamId: String) {
      environments(where: { team_id: { equals: $teamId } })
      {
        id
        name
        variablesJSON
      }
    }
  `, { teamId });

  return result.environments;
}

// Eric imports
export async function getFailuresData(min_date) {
  const data = await qawClient.request(queries.getFailuresData, { min_date })

  return data.viewer.teams
}

/** @returns {Promise<{id: string, name: string, group: {id: string, name: string}, tags: {id: string, name: string}[], steps: {step: {id: string, name: string}}[]}>} */
export async function createTest(name, team_id, group_id = "") {
  const data = await qawClient.request(mutations.createTest, { group_id, name, team_id })

  return data.createTest;
}

export async function createGroup(name, team_id) {
  const data = await qawClient.request(mutations.createGroup, { name, team_id })

  return data.createGroup.id
}

export async function createTeam() {
  const data = await qawClient.request(mutations.createTeam, {});

  return data.createTeam.id
}

export async function createInvites(team_id, emails) {
  await qawClient.request(mutations.createInvites, { team_id, emails })
  console.log('Sent Invites: ', emails)
}

export async function createTag(team_id, name = "CI") {
  const data = await qawClient.request(mutations.createTag, { team_id, name })
  console.log('Created tag: ', data.createTag.id);
  return data.createTag.id;
}

export async function createEnvironment(team_id, name = "Staging") {
  const data = await qawClient.request(mutations.createEnvironment, { team_id, name })
  console.log('Created environment: ', data.createEnvironment.id);
  return data.createEnvironment.id;
}

export async function createTrigger(team_id, environment_id, tag_ids, name = "CI:Daily", repeat_minutes = 1440) {
  const data = await qawClient.request(mutations.createTrigger, { team_id, environment_id, tag_ids, name, repeat_minutes });
  console.log('Created trigger: ', data.createTrigger.id);
  return data.createTrigger.id;
}

export async function updateTeam(default_environment_id, id, inbox, is_enabled, is_qawolf_alert_enabled, name, run_concurrency_limit) {

  const data = await qawClient.request(mutations.updateTeam, { default_environment_id, id, inbox, is_enabled, is_qawolf_alert_enabled, name, run_concurrency_limit });
  console.log(data);
}


/**
 * @param {string} id
 * @param {object} options
 * @param {string} [options.inbox]
 * @param {boolean} [options.is_enabled]
 * @param {boolean} [options.is_qawolf_alert_enabled]
 * @param {string} [options.name]
 * @param {number} [options.run_concurrency_limit]
 * @param {string} [options.default_environment_id]
 * @param {string} [options.bug_report_channel]
 * @param {string} [options.alerts_channel]
 */
export async function updateTeam2(id, { inbox, is_enabled, is_qawolf_alert_enabled, name, run_concurrency_limit, default_environment_id, bug_report_channel, alerts_channel }) {

  const data = await qawClient.request(mutations.updateTeam, {
    default_environment_id,
    id,
    inbox,
    is_enabled,
    is_qawolf_alert_enabled,
    name,
    run_concurrency_limit,
    bug_report_channel,
    alerts_channel
  });
  console.log(data);

  return data.updateTeam;
}

/**
 * @param {object} options
 * @param {string} [options.assignedToId]
 * @param {Date} [options.createdAt]
 * @param {Date} [options.completedAt]
 * @param {string} [options.dueAt]
 * @param {"high" | "medium" | "low"} [options.effort]
 * @param {"high" | "medium" | "low"} [options.priority]
 * @param {QAWTaskStatus} [options.status]
 * @param {string} options.teamId
 * @param {"outline" | "testCreation" | "testCoverageRequest" | "triage" | "generic"} options.type
 * @param {string} [options.testId]
 * @param {string} [options.suiteId]
 * @param {string} [options.requestId]
 * @param {string} [options.name]
 * @param {string} [options.richText] use JSON.stringify on rich text format
 * @returns {Promise<{id: string}>}
 */
export async function createTask(options) {
  const res = await qawClient.request(mutations.createTask, options);

  return res.createTask;
}

/**
 * @param {object} options
 * @param {string} options.id
 * @param {string} [options.assignedToId]
 * @param {Date} [options.dueAt]
 * @param {"high" | "medium" | "low"} [options.effort]
 * @param {"high" | "medium" | "low"} [options.priority]
 * @param {QAWTaskStatus} [options.status]
 * @returns {Promise<{id: string}>}
 */
export async function updateTask(options) {
  const res = await qawClient.request(mutations.updateTask, options);

  return res.updateTasks[0];
}

/**
 * 
 * @param {string} suiteId 
 * @param {string} teamId 
 * @returns {Promise<{id: string}>}
 */
export async function createTriageTask(suiteId, teamId) {
  const res = await qawClient.request(mutations.createTask, { type: "triage", suiteId, teamId });

  return res.createTask;
}

/**
 * 
 * @param {string} taskId 
 * @returns {Promise<TriageTaskDetail>}
 */
export async function getTriageTask(taskId) {
  const res = await qawClient.request(queries.getTriageTask, { taskId });

  return res.tasks[0];
}

/**
 * 
 * @param {string} suiteId 
 * @returns {Promise<TriageTaskDetail>}
 */
export async function getTriageTaskBySuiteId(suiteId) {
  const res = await qawClient.request(queries.getTriageTask, { suiteId });

  return res.tasks[0];
}

/** @returns {Promise<{id: string, name: string, team: {name: string}}>} */
export async function deleteTask(taskId) {
  const res = await qawClient.request(mutations.deleteTask, { taskId });

  return res.deleteTasks[0];
}

export async function assignTask(taskId, userId) {
  const res = await qawClient.request(mutations.assignTask, { taskId, userId });

  return res.updateTasks[0];
}

/**
 * 
 * @param {string} taskId 
 * @param {QAWTaskStatus} status 
 * @returns {Promise<{id: string}>}
 */
export async function updateTaskStatus(taskId, status) {
  const res = await qawClient.request(mutations.updateTaskStatus, { taskId, status });

  return res.updateTasks[0];
}

/** @returns {Promise<("fail" | "created" | "pass" | "canceled")[]>} */
export async function getSuiteRunStatuses(suiteId) {
  const res = await qawClient.request(gql`
    query getSuiteRunStatuses($suiteId: String!) {
      suite(where: {id: $suiteId}) {
        runs {
          status
        }
      }
    }`, { suiteId });
  
  const runs = res.suite?.runs || [];
  const statuses = runs.map(r => r.status);

  return statuses;
}

/**
 * @param {object} options
 * @param {string} options.teamId
 * @param {number} options.monthlyRevenue
 * @param {Date} options.startsAt
 * @param {Date} options.pilotEndsAt
 * @param {boolean} [options.didPilotConvert]
 * @param {string} [options.ownerId]
 * @param {Date} options.renewsAt
 * @param {string} [options.status]
 * @param {number} [options.stepLimit]
 * @param {number} [options.extraStepPrice]
 * @param {number} [options.runLimit]
 * @param {number} [options.extraRunPrice]
 */
export async function upsertContract(options) {
  const res = await qawClient.request(mutations.upsertContract, options);

  return res;
}

/**
 * @typedef {"blocked" | "changesRequested" | "done" | "draft" | "inProgress" | "needHelp" | "readyForReview" | "toDo" | "ignore" | "inReview" | "scheduled"} QAWTaskStatus
 */

/**
 * @typedef {"outline" | "testCreation" | "testMaintenance" | "triage" | "generic" | "testCoverageRequest"} QAWTaskType
 */

/**
 * @typedef TriageTaskDetail
 * @property {string} id
 * @property {string} createdAt
 * @property {string} completedAt
 * @property {string} firstAssignedAt
 * @property {string} lastAssignedAt
 * @property {string} updatedAt
 * @property {QAWTaskStatus} status
 * @property {{id: string, email: string}} assignedTo
 * @property {{id: string, name: string, team: {id: string, name: string}}} suite
 */

