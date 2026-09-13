import { describe, expect, it } from "vitest";

import { ValidationError } from "../domain/errors";
import type { Task } from "../domain/task";
import {
  isAllowedBackendExactTaskUrl,
  isNativeExactTaskLinkable,
  nativeExactTaskUrl,
  searchTaskUrl,
} from "./taskLinks";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-id",
    projectId: "project-id",
    projectName: "Work",
    title: "Ship the extension",
    status: "open",
    priority: 0,
    tags: [],
    kind: "TEXT",
    isAllDay: false,
    isFloating: false,
    timeZone: "UTC",
    ...overrides,
  };
}

describe("nativeExactTaskUrl", () => {
  it("encodes the project and task as separate path segments", () => {
    expect(nativeExactTaskUrl(task({ projectId: "project/α ?#", id: "task/β &?" }))).toBe(
      "ticktick://widget.view.task.in.project/project%2F%CE%B1%20%3F%23/task%2F%CE%B2%20%26%3F"
    );
  });

  it("accepts well-formed supplementary Unicode in native path segments", () => {
    const source = task({ projectId: "project-🧭", id: "task-🚀" });

    expect(isNativeExactTaskLinkable(source)).toBe(true);
    expect(nativeExactTaskUrl(source)).toBe(
      "ticktick://widget.view.task.in.project/project-%F0%9F%A7%AD/task-%F0%9F%9A%80"
    );
  });

  it.each([
    [{ projectId: "" }, "A task project ID is required."],
    [{ projectId: " \t " }, "A task project ID is required."],
    [{ id: "" }, "A task ID is required."],
    [{ id: "\n" }, "A task ID is required."],
  ] as const)("rejects a missing required identifier", (overrides, message) => {
    expect(() => nativeExactTaskUrl(task(overrides))).toThrowError(new ValidationError(message));
  });

  it.each([
    [{ projectId: "project\u0000id" }, "A task project ID is required."],
    [{ projectId: "project\u0085id" }, "A task project ID is required."],
    [{ projectId: "project\u202eid" }, "A task project ID is required."],
    [{ projectId: "project\ud800id" }, "A task project ID is required."],
    [{ id: "task\u001fid" }, "A task ID is required."],
    [{ id: "task\u009fid" }, "A task ID is required."],
    [{ id: "task\u202eid" }, "A task ID is required."],
    [{ id: "task\udc00id" }, "A task ID is required."],
  ] as const)(
    "rejects controls and malformed Unicode instead of emitting an unsafe native URI",
    (overrides, message) => {
      const source = task(overrides);

      expect(isNativeExactTaskLinkable(source)).toBe(false);
      expect(() => nativeExactTaskUrl(source)).toThrowError(new ValidationError(message));
    }
  );

  it("does not fall back to a title search when an exact reference is invalid", () => {
    expect(() => nativeExactTaskUrl(task({ projectId: "", title: "private fallback title" }))).toThrow(ValidationError);
  });
});

describe("searchTaskUrl", () => {
  it("encodes the title once as the search keyword", () => {
    expect(searchTaskUrl(task({ title: "Plan / café & 東京? #1" }))).toBe(
      "ticktick://v1/search?keyword=Plan%20%2F%20caf%C3%A9%20%26%20%E6%9D%B1%E4%BA%AC%3F%20%231"
    );
  });

  it.each(["", " ", "\t\r\n"])("rejects a blank title", (title) => {
    expect(() => searchTaskUrl(task({ title }))).toThrowError(new ValidationError("A task title is required."));
  });
});

describe("isAllowedBackendExactTaskUrl", () => {
  it.each([
    "https://ticktick.com/webapp/#p/project-id/tasks/task-id",
    "https://TICKTICK.COM/webapp/#p/project-id/tasks/task-id",
    "HTTPS://ticktick.com/webapp/#p/project-id/tasks/task-id",
  ])("allows only an HTTPS URL on the exact TickTick host", (value) => {
    expect(isAllowedBackendExactTaskUrl(value)).toBe(true);
  });

  it.each([
    undefined,
    null,
    "",
    "   ",
    "not a URL",
    "https:///ticktick.com/webapp/#p/task-id",
    "https://ticktick.com/webapp/ \n#p/task-id",
    "https://ticktick.com/web app/#p/task-id",
    "https://ticktick.com/webapp/\u00a0#p/task-id",
    " https://ticktick.com/webapp/#p/task-id",
    "https://ticktick.com/webapp/#p/task-id ",
    "http://ticktick.com/webapp/#p/task-id",
    "javascript:alert(1)",
    "file:///C:/private.txt",
    "data:text/html,hello",
    "https://ticktick.com.evil.example/webapp/#p/task-id",
    "https://evil.example/?next=https://ticktick.com/webapp/#p/task-id",
    "https://api.ticktick.com/webapp/#p/task-id",
    "https://ticktick.com./webapp/#p/task-id",
    "https://ticktick%2ecom/webapp/#p/task-id",
    "https://%74icktick.com/webapp/#p/task-id",
    "https://ticktick\u3002com/webapp/#p/task-id",
    "https://ticktick\uff0ecom/webapp/#p/task-id",
    "https://ticktick\uff61com/webapp/#p/task-id",
    "https://@ticktick.com/webapp/#p/task-id",
    "https://user:password@ticktick.com/webapp/#p/task-id",
    "https://ticktick.com:443/webapp/#p/task-id",
    "https://ticktick.com:8443/webapp/#p/task-id",
    "https://ticktick.com/webapp/\u0085#p/task-id",
  ])("rejects malformed, untrusted, credentialed, or non-HTTPS values", (value) => {
    expect(isAllowedBackendExactTaskUrl(value)).toBe(false);
  });
});
