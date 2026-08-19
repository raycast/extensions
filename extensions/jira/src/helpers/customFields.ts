import { format } from "date-fns";
import { markdownToAdf } from "marklassian";

// Pure custom-field helpers, intentionally free of any `@raycast/*` imports so they can be
// unit-tested with Node's built-in `node:test` runner (see `test/customFields.test.ts`) without
// needing the Raycast runtime.

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
      // The Team field (`com.atlassian.teams:rm-teams-custom-field-team`) expects the Team ID as a
      // plain string when creating/updating an issue, per Atlassian's docs and confirmed against a
      // live site (older Advanced Roadmaps teams behave the same, rejecting an object with a 400
      // "operation must be string"). Sending it as an `{ id }` object causes the team to be dropped:
      // https://developer.atlassian.com/platform/teams/components/team-field-in-jira-rest-api/#creating-or-updating-an-issue-with-team
      const typedValue = value as string;
      return typedValue;
    }
    default:
      return null;
  }
}
