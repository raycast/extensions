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
      // The Team field (`com.atlassian.teams:rm-teams-custom-field-team`) accepts different shapes
      // on different Jira sites:
      //  - Some sites (like the one this fix originated from) only persist the team when it is sent
      //    as an `{ id }` object, and silently drop a plain-string value (the issue is created with
      //    no team, without any error).
      //  - Others — including older Advanced Roadmaps teams and per Atlassian's docs — expect a
      //    plain string Team ID and reject the object with a 400 "operation must be string":
      //    https://developer.atlassian.com/platform/teams/components/team-field-in-jira-rest-api/#creating-or-updating-an-issue-with-team
      //
      // We send the `{ id }` object first because that is the shape we know reliably persists the
      // team (and a wrong string can fail silently, which we could not detect). `createIssue` then
      // falls back to the plain string only when a site explicitly rejects the object (see
      // `unwrapTeamFieldValue` / `isTeamFieldRejection`), so string-expecting sites are not
      // regressed.
      const typedValue = value as string;
      return { id: typedValue };
    }
    default:
      return null;
  }
}

/** Plain-string shape some Jira sites require for the Team custom field, used as a create fallback. */
export function unwrapTeamFieldValue(teamId: string) {
  return teamId;
}

/**
 * Returns true when a failed create/update response indicates the given team custom field(s) were
 * rejected, so the caller can retry with the alternate (plain-string) shape.
 *
 * Jira returns field-specific errors as `{ "errors": { "customfield_10001": "..." } }`; the error
 * message forwarded by `parseJiraResponse` is the JSON-stringified body.
 */
export function isTeamFieldRejection(errorMessage: string, teamFieldKeys: string[]): boolean {
  if (teamFieldKeys.length === 0) {
    return false;
  }

  try {
    const parsed = JSON.parse(errorMessage) as { errors?: Record<string, unknown> };
    const errorKeys = Object.keys(parsed?.errors ?? {});
    return teamFieldKeys.some((key) => errorKeys.includes(key));
  } catch {
    return teamFieldKeys.some((key) => errorMessage.includes(key));
  }
}
