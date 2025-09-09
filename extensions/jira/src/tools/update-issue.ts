import { withAccessToken } from "@raycast/utils";
import { markdownToAdf } from "marklassian";

import { updateIssue } from "../api/issues";
import { jira } from "../api/jiraCredentials";

/**
 * Docs for the update method: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-put
 */
type Input = {
  /** The ID or key of the issue to update */
  issueIdOrKey: string;

  /**
   * Direct field updates - use this for simple value replacements.
   * Fields specified here cannot also be in the 'update' property.
   * @example
   * ```typescript
   * // Simple update of summary and due date
   * fields: {
   *   summary: "New title",
   *   duedate: "2024-03-15"
   * }
   * ```
   */
  fields?: {
    /** The title/summary of the issue */
    summary?: string;
    /** The description of the issue in markdown format */
    description?: string;
    /** The due date of the issue in ISO date format (e.g., '2023-12-31') */
    duedate?: string;
  };

  /**
   * Field updates that require multiple operations.
   * Fields specified here cannot also be in the 'fields' property.
   * @example
   * ```typescript
   * update: {
   *   labels: [
   *     { add: "important" },
   *     { add: "urgent" },
   *     { remove: "backlog" }
   *   ],
   *   summary: [
   *     { set: "[URGENT] Bug in payment system" }
   *   ],
   *   description: [
   *     { set: "# Issue Description\n\nThis is a critical bug..." }
   *   ],
   *   duedate: [
   *     { set: "2024-03-15" }
   *   ]
   * }
   * ```
   */
  update?: {
    /** Labels to add or remove */
    labels?: Array<{
      /** Add a label */
      add?: string;
      /** Remove a label */
      remove?: string;
    }>;
    /** Summary updates */
    summary?: Array<{
      /** Set a new summary */
      set: string;
    }>;
    /** Description updates */
    description?: Array<{
      /** Set a new description in markdown format */
      set: string;
    }>;
    /** Due date updates */
    duedate?: Array<{
      /** Set a new due date in ISO date format */
      set: string;
    }>;
  };

  /** The confirmation object to be displayed to the user */
  confirmation: {
    issueSummary: string;
  };
};

/**
 * Update a Jira issue's fields and properties
 * @example
 * ```typescript
 * // Example 1: Simple field updates
 * {
 *   issueIdOrKey: "ABC-123",
 *   fields: {
 *     summary: "New title",
 *     description: "# New Description\n\nUpdated content",
 *     duedate: "2024-03-15"
 *   }
 * }
 *
 * // Example 2: Complex updates with multiple operations
 * {
 *   issueIdOrKey: "ABC-123",
 *   update: {
 *     labels: [
 *       { add: "important" },
 *       { add: "urgent" },
 *       { remove: "backlog" }
 *     ],
 *     summary: [
 *       { set: "[URGENT] Bug in payment system" }
 *     ],
 *     description: [
 *       { set: "# Critical Issue\n\nThis needs immediate attention" }
 *     ]
 *   }
 * }
 * ```
 */
export default withAccessToken(jira)(async function (input: Input) {
  const { issueIdOrKey, fields = {}, update = {} } = input;

  const body: { fields?: Record<string, unknown>; update?: Record<string, unknown[]> } = {};

  // Handle direct field updates
  if (Object.keys(fields).length > 0) {
    body.fields = {};

    if (fields.summary) {
      body.fields.summary = fields.summary;
    }

    if (fields.description) {
      body.fields.description = markdownToAdf(fields.description);
    }

    if (fields.duedate) {
      body.fields.duedate = fields.duedate;
    }
  }

  // Handle update operations
  if (Object.keys(update).length > 0) {
    body.update = {};

    if (update.labels?.length) {
      body.update.labels = update.labels
        .filter((label) => label.add || label.remove)
        .map((label) => ({
          add: label.add,
          remove: label.remove,
        }));
    }

    if (update.summary?.length) {
      body.update.summary = update.summary.map((op) => ({
        set: op.set,
      }));
    }

    if (update.description?.length) {
      body.update.description = update.description.map((op) => ({
        set: markdownToAdf(op.set),
      }));
    }

    if (update.duedate?.length) {
      body.update.duedate = update.duedate.map((op) => ({
        set: op.set,
      }));
    }
  }

  return updateIssue(issueIdOrKey, body);
});

export const confirmation = withAccessToken(jira)(async (input: Input) => {
  const info = [
    { name: "Issue", value: input.confirmation.issueSummary },
    { name: "Key", value: input.issueIdOrKey },
  ];

  // Add new values info (from either fields or update)
  if (input.fields?.summary || input.update?.summary) {
    info.push({
      name: "New Summary",
      value: input.fields?.summary || input.update?.summary?.[0].set || "",
    });
  }

  if (input.fields?.description || input.update?.description) {
    info.push({
      name: "New Description",
      value: input.fields?.description || input.update?.description?.[0].set || "",
    });
  }

  if (input.fields?.duedate || input.update?.duedate) {
    info.push({
      name: "New Due Date",
      value: input.fields?.duedate || input.update?.duedate?.[0].set || "",
    });
  }

  if (input.update?.labels) {
    const additions = input.update.labels.filter((l) => l.add).map((l) => l.add);
    const removals = input.update.labels.filter((l) => l.remove).map((l) => l.remove);
    info.push({
      name: "Label Changes",
      value: [...additions.map((label) => `+${label}`), ...removals.map((label) => `-${label}`)].join(", "),
    });
  }

  return { info };
});
