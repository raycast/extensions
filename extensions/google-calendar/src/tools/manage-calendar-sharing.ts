import { Action } from "@raycast/api";
import { calendar_v3 } from "@googleapis/calendar";
import { requireCalendarOwner, serializeAclRule } from "../lib/calendar-resources";
import { getCalendarClient, withGoogleAPIs } from "../lib/google";

type ScopeType = "user" | "group" | "domain" | "default";
type AccessRole = "freeBusyReader" | "reader" | "writerWithoutPrivateAccess" | "writer" | "owner";

type Input = {
  /** Sharing operation. List and get are read-only. */
  action: "list" | "get" | "grant" | "update" | "revoke";
  /** Calendar ID from list-calendars. Defaults to "primary". */
  calendarId?: string;
  /** ACL rule ID from list. Required for get, update, and revoke. */
  ruleId?: string;
  /** Grantee kind. Required for grant. "default" means public access. */
  scopeType?: ScopeType;
  /** User/group email or domain. Required except for default/public scope. */
  scopeValue?: string;
  /** Access level. Required for grant and update. */
  role?: AccessRole;
  /** Send Google sharing-change notifications. Defaults to true. */
  sendNotifications?: boolean;
  /** Maximum rules in a list page, 1-250. Defaults to 100. */
  maxResults?: number;
  /** Opaque nextPageToken from an earlier list call. */
  pageToken?: string;
  /** Include deleted ACL rules in list results. */
  showDeleted?: boolean;
};

function validate(input: Input) {
  if (["get", "update", "revoke"].includes(input.action) && !input.ruleId) {
    throw new Error(`ruleId is required to ${input.action} an access rule.`);
  }
  if (input.action === "grant") {
    if (!input.scopeType) throw new Error("scopeType is required to grant access.");
    if (!input.role) throw new Error("role is required to grant access.");
    if (input.scopeType === "default" && input.scopeValue) {
      throw new Error("scopeValue must be omitted for default/public access.");
    }
    if (input.scopeType !== "default" && !input.scopeValue?.trim()) {
      throw new Error(`scopeValue is required for ${input.scopeType} access.`);
    }
    if (
      (input.scopeType === "user" || input.scopeType === "group") &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.scopeValue ?? "")
    ) {
      throw new Error("User and group scopeValue must be a valid email address.");
    }
  }
  if (input.action === "update" && !input.role) throw new Error("role is required to update access.");
  if (input.action === "list") {
    const maxResults = input.maxResults ?? 100;
    if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 250) {
      throw new Error("maxResults must be a whole number from 1 to 250.");
    }
  }
}

async function currentRule(input: Input) {
  return (
    await getCalendarClient().acl.get({
      calendarId: input.calendarId ?? "primary",
      ruleId: input.ruleId!,
    })
  ).data;
}

export const confirmation = withGoogleAPIs(async (input: Input) => {
  if (input.action === "list" || input.action === "get") return undefined;
  validate(input);
  const calendarId = input.calendarId ?? "primary";
  await requireCalendarOwner(calendarId);
  const existing = input.action === "update" || input.action === "revoke" ? await currentRule(input) : undefined;
  const publicAccess = input.scopeType === "default" || existing?.scope?.type === "default";
  return {
    style: input.action === "revoke" || publicAccess ? Action.Style.Destructive : Action.Style.Regular,
    message:
      input.action === "revoke"
        ? "Revoke this calendar access rule?"
        : publicAccess
          ? "Apply public access to this calendar?"
          : `${input.action === "grant" ? "Grant" : "Update"} calendar access?`,
    info: [
      { name: "Calendar ID", value: calendarId },
      { name: "Rule ID", value: input.ruleId },
      { name: "Scope", value: existing?.scope?.type ?? input.scopeType },
      { name: "Grantee", value: existing?.scope?.value ?? input.scopeValue ?? (publicAccess ? "Anyone" : undefined) },
      { name: "Current Role", value: existing?.role ?? undefined },
      { name: "New Role", value: input.role },
      { name: "Send Notification", value: (input.sendNotifications ?? true).toString() },
    ],
  };
});

const tool = async (input: Input) => {
  validate(input);
  const calendar = getCalendarClient();
  const calendarId = input.calendarId ?? "primary";
  if (input.action === "list") {
    const response = await calendar.acl.list({
      calendarId,
      maxResults: input.maxResults ?? 100,
      pageToken: input.pageToken,
      showDeleted: input.showDeleted,
    });
    return {
      calendarId,
      nextPageToken: response.data.nextPageToken,
      nextSyncToken: response.data.nextSyncToken,
      rules: response.data.items?.map(serializeAclRule) ?? [],
    };
  }
  if (input.action === "get") return serializeAclRule(await currentRule(input));

  await requireCalendarOwner(calendarId);
  if (input.action === "revoke") {
    const existing = await currentRule(input);
    await calendar.acl.delete({ calendarId, ruleId: input.ruleId! });
    return { revoked: true, calendarId, rule: serializeAclRule(existing) };
  }
  if (input.action === "grant") {
    const response = await calendar.acl.insert({
      calendarId,
      sendNotifications: input.sendNotifications ?? true,
      requestBody: {
        role: input.role,
        scope: {
          type: input.scopeType,
          ...(input.scopeType !== "default" ? { value: input.scopeValue } : {}),
        },
      },
    });
    return serializeAclRule(response.data);
  }

  const existing = await currentRule(input);
  const requestBody: calendar_v3.Schema$AclRule = { role: input.role, scope: existing.scope };
  const response = await calendar.acl.update(
    {
      calendarId,
      ruleId: input.ruleId!,
      sendNotifications: input.sendNotifications ?? true,
      requestBody,
    },
    existing.etag ? { headers: { "If-Match": existing.etag } } : undefined,
  );
  return serializeAclRule(response.data);
};

export default withGoogleAPIs(tool);
