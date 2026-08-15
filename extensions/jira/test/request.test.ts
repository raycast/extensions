import { rejects } from "node:assert/strict";
import { describe, it } from "node:test";

import { Response } from "node-fetch";

import { parseJiraJsonResponse } from "../src/api/response";

describe("parseJiraJsonResponse", () => {
  it("throws a clear Jira error when a successful response contains HTML", async () => {
    const response = new Response("<!DOCTYPE html><html><body>Sign in to Jira</body></html>", {
      headers: { "Content-Type": "text/html; charset=utf-8" },
      status: 200,
    });

    await rejects(() => parseJiraJsonResponse(response), {
      message: "Jira returned an HTML page instead of JSON. Please reconnect Jira and try again.",
    });
  });
});
