import { describe, expect, it } from "vitest";
import type { AttioRecord, AttributeValue, Self, TaskLinkRead, Webhook } from "./types";

// SYNTHETIC data only — shapes verified against the live probe of 2026-08-31,
// values invented. Never paste real workspace data here (PII; public repo).

const meta = {
  active_from: "2026-01-01T00:00:00.000000000Z",
  active_until: null,
  created_by_actor: { id: null, type: "system" },
};

export const statusValue = {
  ...meta,
  attribute_type: "status",
  status: {
    id: { workspace_id: "w", object_id: "o", attribute_id: "a", status_id: "s" },
    title: "Negotiation",
    is_archived: false,
    target_time_in_status: null,
    celebration_enabled: false,
  },
} satisfies AttributeValue;

export const recordRef = {
  ...meta,
  attribute_type: "record-reference",
  target_object: "companies",
  target_record_id: "11111111-2222-3333-4444-555555555555",
} satisfies AttributeValue;

export const record = {
  id: { workspace_id: "w", object_id: "o", record_id: "r" },
  created_at: "2026-01-01T00:00:00.000000000Z",
  web_url: "https://app.attio.com/example/deals/record/r",
  values: { stage: [statusValue], associated_company: [recordRef] },
} satisfies AttioRecord;

export const self = {
  active: true,
  scope: "object_configuration:read record_permission:read",
  workspace_slug: "example",
  workspace_name: "Example",
  workspace_logo_url: null,
} satisfies Self;

export const taskLink = { target_object_id: "uuid-not-slug", target_record_id: "r" } satisfies TaskLinkRead;

export const webhook = {
  id: { workspace_id: "w", webhook_id: "wh" },
  target_url: "https://example.com/hook",
  status: "active",
  subscriptions: [{ event_type: "record.created", filter: null }],
  created_at: "2026-01-01T00:00:00.000000000Z",
} satisfies Webhook;

describe("transport fixtures", () => {
  it("compile and load", () => {
    expect(record.web_url).toContain("app.attio.com");
    expect(self.active).toBe(true);
  });
});
