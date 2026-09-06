import { describe, expect, it, vi } from "vitest";
import {
  answerQuestion,
  approvalOf,
  questionOf,
  resolveApproval,
} from "../src/core/interactions";
import { Entry, entryText } from "../src/core/client";

const question: Entry = {
  id: "t1s0",
  kind: "send-message",
  message: {
    type: "widget",
    widget: {
      prompt: "Which test option?",
      options: [
        { label: "Alpha", value: "Alpha" },
        { label: "Beta", value: "Beta" },
      ],
    },
  },
};
const approval: Entry = {
  id: "t2s0",
  kind: "send-message",
  message: {
    type: "auto-review-approval",
    approval: {
      requestId: "request-1",
      summary: "Run a fixture command",
      command: "echo fixture",
      status: "pending",
    },
  },
};
function harness(entries: Entry[]) {
  return {
    transcript: vi.fn().mockResolvedValue({ entries }),
    command: vi.fn().mockResolvedValue({ accepted: true }),
  };
}

describe("structured questions", () => {
  it("parses the live-verified widget shape and answered state", () => {
    expect(questionOf(question)).toMatchObject({
      prompt: "Which test option?",
      options: [
        { label: "Alpha", value: "Alpha" },
        { label: "Beta", value: "Beta" },
      ],
    });
    expect(questionOf({ ...question, respondedValue: "Alpha" })?.answered).toBe(
      "Alpha",
    );
    expect(entryText(question)).toContain("Answer Question");
    expect(entryText({ ...question, respondedValue: "Alpha" })).toContain(
      "Your response: Alpha",
    );
  });
  it.each([
    null,
    { type: "other" },
    { type: "widget", widget: {} },
    { type: "widget", widget: { prompt: "x", options: ["bad"] } },
  ])("fails closed on malformed widgets", (message) =>
    expect(
      questionOf({ id: "x", kind: "send-message", message }),
    ).toBeUndefined(),
  );
  it("supports free-text questions", () =>
    expect(
      questionOf({
        id: "x",
        kind: "send-message",
        message: { type: "widget", widget: { prompt: "Explain" } },
      })?.options,
    ).toEqual([]));
  it("revalidates before responding with the exact entry ID and value", async () => {
    const h = harness([question]);
    await answerQuestion(h, "bot", question, "Beta");
    expect(h.command).toHaveBeenCalledWith(
      "respondToWidget",
      { agentId: "bot", entryId: "t1s0", value: "Beta" },
      { mutation: true },
    );
  });
  it.each([
    { entries: [] },
    { entries: [{ ...question, respondedValue: "Alpha" }] },
  ])(
    "does not answer missing or already answered questions",
    async ({ entries }) => {
      const h = harness(entries);
      await expect(answerQuestion(h, "bot", question, "Beta")).rejects.toThrow(
        "no longer",
      );
      expect(h.command).not.toHaveBeenCalled();
    },
  );
  it("rejects blank responses before making requests", async () => {
    const h = harness([question]);
    await expect(answerQuestion(h, "bot", question, " ")).rejects.toThrow(
      "Enter a response",
    );
    expect(h.transcript).not.toHaveBeenCalled();
  });
  it("requires explicit acceptance", async () => {
    const h = harness([question]);
    h.command.mockResolvedValue({ accepted: false });
    await expect(
      answerQuestion(h, "bot", question, "Beta"),
    ).rejects.toMatchObject({ uncertain: true });
  });
});

describe("approval boundaries", () => {
  it("parses complete approval information", () => {
    expect(approvalOf(approval)).toEqual({
      requestId: "request-1",
      summary: "Run a fixture command",
      command: "echo fixture",
      status: "pending",
    });
    expect(entryText(approval)).toContain("Run a fixture command");
  });
  it.each([
    null,
    { type: "widget" },
    { type: "auto-review-approval", approval: {} },
  ])("does not expose controls for malformed requests", (message) =>
    expect(
      approvalOf({ id: "x", kind: "send-message", message }),
    ).toBeUndefined(),
  );
  it("preserves structured command information for review", () =>
    expect(
      approvalOf({
        ...approval,
        message: {
          type: "auto-review-approval",
          approval: {
            requestId: "r",
            summary: "Review",
            status: "pending",
            command: { tool: "test" },
          },
        },
      })?.command,
    ).toBe('{"tool":"test"}'));
  it.each(["approved", "denied"] as const)(
    "sends an explicit one-time %s decision",
    async (resolution) => {
      const h = harness([approval]);
      await resolveApproval(h, "bot", approval, resolution);
      expect(h.command).toHaveBeenCalledWith(
        "resolveAutoReviewApproval",
        { agentId: "bot", entryId: "t2s0", requestId: "request-1", resolution },
        { mutation: true },
      );
    },
  );
  it.each([
    { requestId: "other" },
    { status: "approved" },
    { summary: "Different action" },
    { command: "rm important" },
  ])("blocks a stale approval after server changes %j", async (change) => {
    const original = approvalOf(approval)!;
    const h = harness([
      {
        ...approval,
        message: {
          type: "auto-review-approval",
          approval: { ...original, ...change },
        },
      },
    ]);
    await expect(
      resolveApproval(h, "bot", approval, "approved"),
    ).rejects.toThrow("changed");
    expect(h.command).not.toHaveBeenCalled();
  });
  it("blocks missing approvals", async () => {
    const h = harness([]);
    await expect(
      resolveApproval(h, "bot", approval, "approved"),
    ).rejects.toThrow("no longer");
    expect(h.command).not.toHaveBeenCalled();
  });
  it("labels other rich content instead of treating it as a text reply", () =>
    expect(
      entryText({ id: "a", kind: "send-message", message: { type: "video" } }),
    ).toContain("video"));
});
