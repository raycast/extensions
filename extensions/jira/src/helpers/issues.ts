import { Color } from "@raycast/api";
import { FormValidation } from "@raycast/utils";
import { format } from "date-fns";
import { groupBy, partition } from "lodash";
import markdownToAdf from "md-to-adf";
import { NodeHtmlMarkdown } from "node-html-markdown";

import { Issue, IssueDetail, IssueTypeWithCustomFields, StatusCategoryKey } from "../api/issues";
import { slugify } from "../helpers/string";

export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return format(date, "d MMM yyyy");
}

export function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  return format(date, "eeee d MMMM yyyy 'at' hh:mm");
}

const statusCategoryKeyOrder = [
  StatusCategoryKey.indeterminate,
  StatusCategoryKey.new,
  StatusCategoryKey.done,
  StatusCategoryKey.unknown,
];

export function getIssueListSections(issues?: Issue[]) {
  if (!issues) {
    return [];
  }

  const statusCategoryNames: Record<string, string> = {};
  for (const issue of issues) {
    const statusCategory = issue.fields.status.statusCategory;
    if (statusCategory) {
      statusCategoryNames[statusCategory.key] = statusCategory.name;
    }
  }

  const issuesByStatusCategoryKey = groupBy(issues, (issue) => {
    const statusCategory = issue.fields.status.statusCategory;

    if (statusCategory && statusCategoryKeyOrder.includes(statusCategory.key)) {
      return issue.fields.status.statusCategory?.key;
    }

    // If the status category doesn't seem to be
    // a known key, assign it to unknown by default
    return StatusCategoryKey.unknown;
  });

  return statusCategoryKeyOrder
    .filter((categoryKey) => {
      const issues = issuesByStatusCategoryKey[categoryKey];
      return issues && issues.length > 0;
    })
    .map((categoryKey) => {
      const issues = issuesByStatusCategoryKey[categoryKey];
      return {
        key: categoryKey,
        title: statusCategoryNames[categoryKey] || "Others",
        subtitle: issues.length > 1 ? `${issues.length} issues` : "1 issue",
        issues,
      };
    });
}

export function getMarkdownFromHtml(description: string) {
  const nodeToMarkdown = new NodeHtmlMarkdown(
    { keepDataImages: true },
    // For some reasons, Jira doesn't wrap code blocks within a <code> block
    // but only within a <pre> block which is not recognized by NodeHtmlMarkdown.
    {
      pre: {
        prefix: "```\n",
        postfix: "\n```",
      },
    },
  );

  return nodeToMarkdown.translate(description);
}

export function getStatusColor(color?: string) {
  switch (color) {
    case "blue":
      return Color.Blue;
    case "yellow":
      return Color.Yellow;
    case "green":
      return Color.Green;
    case "red":
      return Color.Red;
    default:
      return Color.SecondaryText;
  }
}

export enum CustomFieldSchema {
  unknown = "unknown",
  datePicker = "com.atlassian.jira.plugin.system.customfieldtypes:datepicker",
  dateTime = "com.atlassian.jira.plugin.system.customfieldtypes:datetime",
  epicLabel = "com.pyxis.greenhopper.jira:gh-epic-label",
  epicLink = "com.pyxis.greenhopper.jira:gh-epic-link",
  float = "com.atlassian.jira.plugin.system.customfieldtypes:float",
  labels = "com.atlassian.jira.plugin.system.customfieldtypes:labels",
  multiSelect = "com.atlassian.jira.plugin.system.customfieldtypes:multiselect",
  multiCheckboxes = "com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes",
  radioButtons = "com.atlassian.jira.plugin.system.customfieldtypes:radiobuttons",
  select = "com.atlassian.jira.plugin.system.customfieldtypes:select",
  sprint = "com.pyxis.greenhopper.jira:gh-sprint",
  storyPointEstimate = "com.pyxis.greenhopper.jira:jsw-story-points",
  textarea = "com.atlassian.jira.plugin.system.customfieldtypes:textarea",
  textfield = "com.atlassian.jira.plugin.system.customfieldtypes:textfield",
  userPicker = "com.atlassian.jira.plugin.system.customfieldtypes:userpicker",
  team = "com.atlassian.teams:rm-teams-custom-field-team",
}

export type Option = {
  id: string;
  value: string;
};

export type Sprint = {
  id: string;
  name: string;
};

export function getCustomFieldsForDetail(issue?: IssueDetail | null) {
  if (!issue) {
    return { customMarkdownFields: [], customMetadataFields: [] };
  }

  const customFieldsKeys = Object.keys(issue?.fields).filter((field) => field.startsWith("customfield_"));
  const supportedCustomFields = Object.values(CustomFieldSchema);

  const customFieldsWithValueKeys = customFieldsKeys.filter((key) => !!issue.fields[key]);

  // Jira's textareas are shown in the markdown field of the Detail screen
  const [markdownFieldsKeys, metadataFieldsKeys] = partition(
    customFieldsWithValueKeys,
    (key) => issue.schema[key].custom === CustomFieldSchema.textarea,
  );

  const customMarkdownFields = markdownFieldsKeys.map((key) => {
    const name = issue.names[key];
    const value = issue.renderedFields[key];

    return value ? `\n\n## ${name}\n\n${getMarkdownFromHtml(value)}` : null;
  });

  const customMetadataFields = metadataFieldsKeys
    .map((key) => {
      const custom = issue.schema[key].custom as CustomFieldSchema;
      const name = issue.names[key];
      const value = issue.fields[key];
      const fieldSchema = supportedCustomFields.includes(custom) ? custom : CustomFieldSchema.unknown;

      return { key, name, value, fieldSchema };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return { customMarkdownFields, customMetadataFields };
}

const supportedCustomFieldsForCreateIssue = [
  CustomFieldSchema.datePicker,
  CustomFieldSchema.dateTime,
  CustomFieldSchema.epicLabel,
  CustomFieldSchema.float,
  CustomFieldSchema.multiSelect,
  CustomFieldSchema.multiCheckboxes,
  CustomFieldSchema.radioButtons,
  CustomFieldSchema.select,
  CustomFieldSchema.sprint,
  CustomFieldSchema.storyPointEstimate,
  CustomFieldSchema.textarea,
  CustomFieldSchema.textfield,
  CustomFieldSchema.userPicker,
  CustomFieldSchema.team,
];

export function getCustomFieldsForCreateIssue(issueType: IssueTypeWithCustomFields) {
  const fields = issueType.fields;

  const customFieldsKeys = Object.keys(fields).filter((key) => {
    if (!key.startsWith("customfield_")) {
      return false;
    }

    const custom = fields[key].schema.custom as CustomFieldSchema;
    // Don't show epic links (parent field already available in the default fields)
    if (custom === CustomFieldSchema.epicLink) {
      return false;
    }

    // Don't show sprints for sub-tasks
    if (issueType.subtask && custom === CustomFieldSchema.sprint) {
      return false;
    }

    return true;
  });

  const [supportedCustomFieldsKeys, unknownCustomFieldsKeys] = partition(customFieldsKeys, (key) => {
    const custom = fields[key].schema.custom as CustomFieldSchema;
    return supportedCustomFieldsForCreateIssue.includes(custom);
  });

  const unknownCustomFields = unknownCustomFieldsKeys.map((field) => fields[field].name).join(", ");

  const customFields = supportedCustomFieldsKeys
    .map((key) => {
      const field = fields[key];
      const fieldSchema = field.schema.custom as CustomFieldSchema;

      return { fieldSchema, ...field };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const initialValues = customFields.reduce((acc, { key, fieldSchema }) => {
    return {
      ...acc,
      [key]: getCustomFieldInitialValue(fieldSchema),
    };
  }, {});

  const validation = customFields.reduce((acc, { key, fieldSchema, required }) => {
    return {
      ...acc,
      [key]: getCustomFieldValidation(fieldSchema, required),
    };
  }, {});

  return { unknownCustomFields, customFields, initialValues, validation };
}

export function getCustomFieldInitialValue(fieldSchema: CustomFieldSchema) {
  switch (fieldSchema) {
    case CustomFieldSchema.datePicker:
    case CustomFieldSchema.dateTime: {
      return null;
    }
    case CustomFieldSchema.multiSelect:
    case CustomFieldSchema.multiCheckboxes: {
      return [];
    }
    default:
      return "";
  }
}

export function getCustomFieldValidation(fieldSchema: CustomFieldSchema, required: boolean) {
  return (value: string) => {
    if (required && !value) {
      return FormValidation.Required;
    }

    switch (fieldSchema) {
      case CustomFieldSchema.float:
      case CustomFieldSchema.storyPointEstimate:
        if (value && isNaN(Number(value))) {
          return "Please enter a valid number";
        }
        break;
      default:
        break;
    }

    return "";
  };
}

export function getCustomFieldValue(fieldSchema: CustomFieldSchema, value: unknown) {
  switch (fieldSchema) {
    case CustomFieldSchema.datePicker: {
      const typedValue = value as Date;
      return format(typedValue, "yyyy-MM-dd");
    }
    case CustomFieldSchema.dateTime: {
      const typedValue = value as Date;
      return typedValue.toISOString();
    }
    case CustomFieldSchema.epicLabel:
    case CustomFieldSchema.textfield: {
      const typedValue = value as string;
      return typedValue;
    }
    case CustomFieldSchema.float:
    case CustomFieldSchema.sprint:
    case CustomFieldSchema.storyPointEstimate: {
      const typedValue = value as string;
      return parseInt(typedValue);
    }
    case CustomFieldSchema.textarea: {
      const typedValue = value as string;
      return markdownToAdf(typedValue);
    }
    case CustomFieldSchema.multiSelect:
    case CustomFieldSchema.multiCheckboxes: {
      const typedValue = value as string[];
      return typedValue.map((value) => ({ id: value }));
    }
    case CustomFieldSchema.radioButtons:
    case CustomFieldSchema.select:
    case CustomFieldSchema.userPicker: {
      const typedValue = value as string;
      return { id: typedValue };
    }
    case CustomFieldSchema.team: {
      const typedValue = value as string;
      return typedValue;
    }
    default:
      return null;
  }
}

export function generateBranchName(issue: Issue | IssueDetail, nameFormat?: string): string {
  const issueKey = issue.key;
  const issueSummary = issue.fields.summary.toLowerCase();
  const issueSummaryShort = issueSummary.split(" ").slice(0, 5).join(" ");

  if (!nameFormat) {
    nameFormat = "{issueKey}-{issueSummary}";
  }

  // Supported fields in the Jira UI: issue key, issue summary, issue summary short, issue type, project key
  return nameFormat
    .replace("{issueKey}", issueKey)
    .replace("{issueSummary}", slugify(issueSummary))
    .replace("{issueSummaryShort}", slugify(issueSummaryShort))
    .replace("{issueType}", issue.fields.issuetype.name)
    .replace("{projectKey}", issue.fields.project?.key || "");
}
