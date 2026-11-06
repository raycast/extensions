import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fetchClaudeUsageLimits } from "./claude-api-client";

const window = { utilization: 4, resets_at: "2026-11-09T06:00:00+00:00" };

const mockResponse = (body: unknown, status = 200): void => {
  jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));
};

describe("fetchClaudeUsageLimits", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns data when only the seven_day window is present", async () => {
    mockResponse({ five_hour: null, seven_day: window });

    const result = await fetchClaudeUsageLimits("token");

    expect(result).toEqual({ status: "ok", data: { five_hour: null, seven_day: window } });
  });

  it("returns data when only a per-model window is readable", async () => {
    mockResponse({ five_hour: null, seven_day: null, seven_day_opus: window });

    const result = await fetchClaudeUsageLimits("token");

    expect(result).toMatchObject({ status: "ok", data: { seven_day_opus: window } });
  });

  it("reports the response shape when no limit window parses", async () => {
    mockResponse({ five_hour: null, seven_day: null, limits: [{ kind: "weekly_all", percent: 4 }] });

    const result = await fetchClaudeUsageLimits("token");

    expect(result).toMatchInlineSnapshot(`
     {
       "message": "Unexpected API response format. Response shape: {"five_hour":"null","limits":{"array":1,"of":"object"},"seven_day":"null"}",
       "status": "error",
     }
    `);
  });

  it("points to claude login on an auth failure", async () => {
    mockResponse({}, 401);

    const result = await fetchClaudeUsageLimits("token");

    expect(result).toMatchInlineSnapshot(`
     {
       "message": "API returned 401. Re-authenticate by running: claude login",
       "status": "error",
     }
    `);
  });
});
