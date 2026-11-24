import { format } from "date-fns";
import { markdownToAdf } from "marklassian";

// Pure custom-field helpers, intentionally free of any `@raycast/*` imports so they can be
// unit-tested with Node's built-in `node:test` runner (see `test/customFields.test.ts`) without
// needing the Raycast runtime.

export const CustomFieldSchema = {
  unknown: "unknown",
  datePicker: "com.atlassian.jira.plugin.system.customfieldtypes:datepicker",
  dateTime: "com.atlassian.jira.plugin.system.customfieldtypes:datetime",
  epicLabel: "com.pyxis.greenhopper.jira:gh-epic-label",
  epicLink: "com.pyxis.greenhopper.jira:gh-epic-link",
  float: "com.atlassian.jira.plugin.system.customfieldtypes:float",
  labels: "com.atlassian.jira.plugin.system.customfieldtypes:labels",
  multiSelect: "com.atlassian.jira.plugin.system.customfieldtypes:multiselect",
  multiCheckboxes: "com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes",
  radioButtons: "com.atlassian.jira.plugin.system.customfieldtypes:radiobuttons",
  select: "com.atlassian.jira.plugin.system.customfieldtypes:select",
  sprint: "com.pyxis.greenhopper.jira:gh-sprint",
  storyPointEstimate: "com.pyxis.greenhopper.jira:jsw-story-points",
  textarea: "com.atlassian.jira.plugin.system.customfieldtypes:textarea",
  textfield: "com.atlassian.jira.plugin.system.customfieldtypes:textfield",
  userPicker: "com.atlassian.jira.plugin.system.customfieldtypes:userpicker",
  team: "com.atlassian.teams:rm-teams-custom-field-team",
  atlassianTeam: "com.atlassian.jira.plugin.system.customfieldtypes:atlassian-team",
} as const;

export type CustomFieldSchema = (typeof CustomFieldSchema)[keyof typeof CustomFieldSchema];

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
    case CustomFieldSchema.team:
    case CustomFieldSchema.atlassianTeam: {
      const typedValue = value as string;
      return typedValue;
    }
    default:
      return null;
  }
}
