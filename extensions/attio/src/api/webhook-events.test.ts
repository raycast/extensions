import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WEBHOOK_EVENT_TYPES } from "./types";

/**
 * Drift test (pure — no @raycast/api): WEBHOOK_EVENT_TYPES must stay in lockstep
 * with the enum Attio's spec declares on POST /v2/webhooks. Set-equality, not
 * order, matters — the OpenAPI doc's ordering isn't stable.
 */
describe("WEBHOOK_EVENT_TYPES drift", () => {
  it("matches the event_type enum in scripts/attio-openapi.json", () => {
    const spec = JSON.parse(readFileSync(join(__dirname, "../../scripts/attio-openapi.json"), "utf-8"));
    const specEnum: string[] =
      spec.paths["/v2/webhooks"].post.requestBody.content["application/json"].schema.properties.data.properties
        .subscriptions.items.properties.event_type.enum;

    expect(new Set(WEBHOOK_EVENT_TYPES)).toEqual(new Set(specEnum));
    expect(WEBHOOK_EVENT_TYPES.length).toBe(specEnum.length);
  });
});
