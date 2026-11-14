import { rejects } from "node:assert/strict";
import { describe, it } from "node:test";

import { Response } from "node-fetch";

import { parseJiraJsonResponse, parseJiraResponse } from "../src/api/response.ts";

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

describe("Jira rate-limit responses", () => {
  it("includes Retry-After when Jira limits an assignee or metadata request", async () => {
    const response = new Response('{"errorMessages":["The request has been rate-limited."]}', {
      status: 429,
      headers: { "Retry-After": "30" },
    });
    await rejects(() => parseJiraResponse(response), {
      name: "JiraApiError",
      status: 429,
      message: "Jira rate limit reached. Please try again in 30 seconds.",
    });
  });

  it("shows actionable wording when Retry-After is unavailable", async () => {
    const response = new Response("rate limited", { status: 429 });
    await rejects(() => parseJiraResponse(response), {
      status: 429,
      message: "Jira rate limit reached. Please wait a bit and try again.",
    });
  });
});
