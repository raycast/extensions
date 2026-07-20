import { useQuery } from "@tanstack/react-query";

import { JIRA_BOARD_ISSUE_FIELDS, JIRA_API } from "@/constants";
import {
  getJiraIssuesBySprint,
  transformURL,
  getIssueTypeIcon,
  getJiraIssueEditUrl,
  getJiraIssueUrl,
  buildPriorityAndStatusAccessories,
} from "@/utils";
import { useJiraSelectedFieldsCachedState } from "@/hooks";
import type {
  JiraBoardIssuesResponse,
  HookQueryOptions,
  JiraBoardIssue,
  ProcessedJiraKanbanBoardIssue,
  ListItemAccessories,
  ListItemSubtitle,
  JiraBoardConfiguration,
  JiraField,
  JiraIssueUser,
} from "@/types";

export function useJiraBoardSprintIssuesQuery(
  boardId: number,
  sprintId: number,
  queryOptions?: HookQueryOptions<
    JiraBoardIssuesResponse,
    ProcessedJiraKanbanBoardIssue[],
    readonly [
      {
        scope: "jira";
        entity: "board";
        boardId: number;
        subEntity: "sprint";
        sprintId: number;
        selectedFieldIds: string[];
      },
    ]
  >,
) {
  const { fields: selectedFields, fieldIds: selectedFieldIds } = useJiraSelectedFieldsCachedState();

  return useQuery({
    queryKey: [{ scope: "jira", entity: "board", boardId, subEntity: "sprint", sprintId, selectedFieldIds }],
    queryFn: ({ queryKey }) => {
      const [{ boardId: id, sprintId: sid, selectedFieldIds: fieldIds }] = queryKey;
      const url = transformURL(JIRA_API.BOARD_SPRINT_ISSUE, { boardId: id, sprintId: sid });
      const params = {
        jql: "order by priority DESC, updated DESC, created DESC",
        fields: [...JIRA_BOARD_ISSUE_FIELDS, ...fieldIds],
        maxResults: 200,
      };
      return getJiraIssuesBySprint(url, params);
    },
    select: (data) => processList(data.issues, selectedFields, undefined, data.names),
    ...queryOptions,
  });
}

function processList(
  issues: JiraBoardIssue[],
  selectedFields: JiraField[],
  boardConfiguration?: JiraBoardConfiguration,
  fieldsNameMap?: Record<string, string>,
): ProcessedJiraKanbanBoardIssue[] {
  return issues.map((issue) => {
    const { fields, key, id } = issue;

    const summary = fields.summary;
    const title = { value: summary, tooltip: `Summary: ${summary}` };
    const issueTypeName = fields.issuetype.name;

    const url = getJiraIssueUrl(key);
    const editUrl = getJiraIssueEditUrl(id);

    const issueTypeIcon = getIssueTypeIcon(issueTypeName);
    const icon = {
      value: issueTypeIcon || "icon-unknown.svg",
      tooltip: `Issue Type: ${issueTypeName}`,
    };

    const subtitle = buildSubtitle(issue, selectedFields, fieldsNameMap);
    const accessories = buildAccessories(issue);
    const keywords = buildKeywords(issue, boardConfiguration);

    return {
      renderKey: id,
      title,
      key,
      summary,
      icon,
      subtitle,
      accessories,
      url,
      editUrl,
      keywords,
      statusId: fields.status.id,
    };
  });
}

function buildSubtitle(
  issue: JiraBoardIssue,
  selectedFields: JiraField[],
  fieldsNameMap?: Record<string, string>,
): NonNullable<ListItemSubtitle> {
  const { key: issueKey, fields } = issue;
  const assignee = fields.assignee?.displayName || "Unassigned";
  const reporter = fields.reporter?.displayName || null;

  const subtitle = `${issueKey}@${assignee}`;

  const tooltipParts = [];
  if (issueKey) {
    tooltipParts.push(`${issueKey}`);
  }
  if (reporter) {
    tooltipParts.push(`Reporter: ${reporter}`);
  }
  if (assignee) {
    tooltipParts.push(`Assignee: ${assignee}`);
  }

  // Add custom field values
  const selectedFieldValue = selectedFields.reduce(
    (acc, field) => {
      const value = issue.fields[field.id];
      if (value !== undefined && value !== null) {
        acc[field.id] = value as JiraIssueUser;
      }
      return acc;
    },
    {} as Record<string, JiraIssueUser>,
  );

  if (selectedFieldValue) {
    Object.entries(selectedFieldValue).forEach(([fieldId, value]) => {
      const fieldName = fieldsNameMap?.[fieldId] ?? selectedFields.find((f) => f.id === fieldId)?.name ?? fieldId;
      tooltipParts.push(`${fieldName}: ${value.displayName}`);
    });
  }

  return {
    value: subtitle,
    tooltip: tooltipParts.join("\n"),
  };
}

function buildAccessories(issue: JiraBoardIssue): NonNullable<ListItemAccessories> {
  const { fields } = issue;
  const accessories: ListItemAccessories = [];

  // Add priority and status accessories
  const priorityAndStatusAccessories = buildPriorityAndStatusAccessories(fields.priority?.name, fields.status?.name);
  accessories.push(...priorityAndStatusAccessories);

  accessories.unshift({
    text: fields.epic?.name || "No Epic",
    tooltip: fields.epic?.name ? `Epic: ${fields.epic.name}` : "Issue not linked to Epic",
  });

  return accessories;
}

function buildKeywords(issue: JiraBoardIssue, boardConfiguration?: JiraBoardConfiguration): string[] {
  const { key: issueKey, fields } = issue;
  const keywords: string[] = [issueKey, issueKey.split("-")[1]];

  if (fields.assignee?.displayName) {
    keywords.push(fields.assignee.displayName);
  }

  keywords.push(fields.epic?.name || "No Epic");

  if (fields.status?.name) {
    keywords.push(fields.status.name);
  }

  // Add column name from boardConfiguration
  if (boardConfiguration?.columnConfig?.columns && fields.status?.id) {
    const column = boardConfiguration.columnConfig.columns.find((col) =>
      col.statuses.some((status) => status.id === fields.status.id),
    );
    if (column?.name) {
      keywords.push(column.name);
    }
  }

  return keywords;
}
