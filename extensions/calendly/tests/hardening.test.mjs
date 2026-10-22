import assert from "node:assert/strict";
import test from "node:test";

import { collectCalendlyPages, MAX_COLLECTION_PAGES } from "../src/api/pagination.ts";
import { calendlyApiUrl } from "../src/api/url.ts";
import { isSameInstant } from "../src/lib/dates.ts";

test("Calendly API URLs reject off-origin absolute URLs", () => {
  assert.throws(() => calendlyApiUrl("https://example.com/steal"), /must target https:\/\/api\.calendly\.com/);
  assert.throws(() => calendlyApiUrl("//example.com/steal"), /must target https:\/\/api\.calendly\.com/);
});

test("Calendly API URLs accept relative and same-origin absolute URLs", () => {
  assert.equal(calendlyApiUrl("/users/me").href, "https://api.calendly.com/users/me");
  assert.equal(
    calendlyApiUrl("https://api.calendly.com/scheduled_events?page_token=next").href,
    "https://api.calendly.com/scheduled_events?page_token=next",
  );
});

test("equivalent ISO timestamps represent the same instant", () => {
  assert.equal(isSameInstant("2026-08-30T10:00:00Z", "2026-08-30T10:00:00+00:00"), true);
  assert.equal(isSameInstant("2026-08-30T10:00:00Z", "2026-08-30T10:01:00Z"), false);
  assert.equal(isSameInstant("invalid", "invalid"), false);
});

test("collection pagination rejects a result that remains truncated at the page limit", async () => {
  let requests = 0;

  await assert.rejects(
    collectCalendlyPages("/scheduled_events", undefined, async () => {
      requests++;
      return {
        collection: [requests],
        pagination: { next_page_token: `page-${requests + 1}` },
      };
    }),
    /refusing to return partial results/,
  );
  assert.equal(requests, MAX_COLLECTION_PAGES);
});
