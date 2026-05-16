import { describe, expect, it } from "vitest";
import {
  CreateOrUpdateEventInput,
  DraftEmailInput,
  GetAvailabilityInput,
  GetReadStatusFeedInput,
  ListThreadsInput,
  SendDraftInput,
  UndoSendInput,
  UpdatePersonalizationInput,
  UpdateThreadInput,
  validate,
} from "../src/lib/validation";

describe("DraftEmailInput", () => {
  it("requires either instructions or body", () => {
    expect(() => validate(DraftEmailInput, { recipient: "a@b.com" })).toThrow(/instructions.*body/i);
  });

  it("accepts instructions alone (preferred path)", () => {
    expect(() =>
      validate(DraftEmailInput, { recipient: "a@b.com", instructions: "say hi" }),
    ).not.toThrow();
  });

  it("accepts body alone (bypass)", () => {
    expect(() => validate(DraftEmailInput, { recipient: "a@b.com", body: "hi" })).not.toThrow();
  });

  it("forwards require body for the intro", () => {
    expect(() =>
      validate(DraftEmailInput, { type: "forward", threadId: "t1", instructions: "fwd it" }),
    ).toThrow(/forward.*body/i);
  });

  it("forward with body passes", () => {
    expect(() =>
      validate(DraftEmailInput, { type: "forward", threadId: "t1", body: "fyi" }),
    ).not.toThrow();
  });
});

describe("SendDraftInput", () => {
  it("accepts a bare send", () => {
    expect(() => validate(SendDraftInput, { draftId: "drf_1" })).not.toThrow();
  });

  it("rejects two scheduling options together", () => {
    expect(() =>
      validate(SendDraftInput, { draftId: "drf_1", smartSend: true, undoTimeout: 5 }),
    ).toThrow(/mutually exclusive/i);
  });

  it("rejects send_at + undo_timeout", () => {
    expect(() =>
      validate(SendDraftInput, {
        draftId: "drf_1",
        sendAt: "2026-05-20T15:00:00Z",
        undoTimeout: 3,
      }),
    ).toThrow(/mutually exclusive/i);
  });

  it("accepts undoTimeout in range", () => {
    expect(() => validate(SendDraftInput, { draftId: "drf_1", undoTimeout: 1 })).not.toThrow();
    expect(() => validate(SendDraftInput, { draftId: "drf_1", undoTimeout: 10 })).not.toThrow();
  });

  it("rejects undoTimeout out of range", () => {
    expect(() => validate(SendDraftInput, { draftId: "drf_1", undoTimeout: 0 })).toThrow();
    expect(() => validate(SendDraftInput, { draftId: "drf_1", undoTimeout: 11 })).toThrow();
  });
});

describe("UndoSendInput", () => {
  it("requires token or message_id", () => {
    expect(() => validate(UndoSendInput, {})).toThrow(/undoToken.*messageId/i);
  });

  it("accepts token", () => {
    expect(() => validate(UndoSendInput, { undoToken: "tok_1" })).not.toThrow();
  });

  it("accepts message id fallback", () => {
    expect(() => validate(UndoSendInput, { messageId: "msg_1" })).not.toThrow();
  });
});

describe("UpdateThreadInput", () => {
  it("rejects missing thread id", () => {
    expect(() => validate(UpdateThreadInput, { markDone: true })).toThrow();
  });

  it("accepts canonical + deprecated together", () => {
    expect(() =>
      validate(UpdateThreadInput, { threadId: "t1", markDone: true, archived: true }),
    ).not.toThrow();
  });
});

describe("CreateOrUpdateEventInput", () => {
  it("requires timezone", () => {
    expect(() => validate(CreateOrUpdateEventInput, { title: "x" })).toThrow();
  });

  it("rejects bogus timezone", () => {
    expect(() => validate(CreateOrUpdateEventInput, { title: "x", timezone: "PT" })).toThrow();
  });

  it("accepts IANA timezone", () => {
    expect(() =>
      validate(CreateOrUpdateEventInput, { title: "x", timezone: "America/Los_Angeles" }),
    ).not.toThrow();
    expect(() =>
      validate(CreateOrUpdateEventInput, { title: "x", timezone: "UTC" }),
    ).not.toThrow();
  });
});

describe("GetAvailabilityInput", () => {
  it("requires timezone + a start + an end", () => {
    expect(() => validate(GetAvailabilityInput, {})).toThrow();
    expect(() => validate(GetAvailabilityInput, { timezone: "UTC" })).toThrow(/startDate/i);
    expect(() =>
      validate(GetAvailabilityInput, { timezone: "UTC", startDate: "2026-05-20T00:00:00Z" }),
    ).toThrow(/endDate/i);
  });

  it("accepts legacy start/end aliases", () => {
    expect(() =>
      validate(GetAvailabilityInput, {
        timezone: "UTC",
        start: "2026-05-20T00:00:00Z",
        end: "2026-05-21T00:00:00Z",
      }),
    ).not.toThrow();
  });
});

describe("ListThreadsInput", () => {
  it("caps limit at 50", () => {
    expect(() => validate(ListThreadsInput, { limit: 51 })).toThrow();
    expect(() => validate(ListThreadsInput, { limit: 50 })).not.toThrow();
  });

  it("accepts split by name", () => {
    expect(() => validate(ListThreadsInput, { split: "Important" })).not.toThrow();
  });
});

describe("GetReadStatusFeedInput", () => {
  it("caps limit at 200", () => {
    expect(() => validate(GetReadStatusFeedInput, { limit: 201 })).toThrow();
    expect(() => validate(GetReadStatusFeedInput, { limit: 200 })).not.toThrow();
  });
});

describe("UpdatePersonalizationInput", () => {
  it("rejects empty feedback", () => {
    expect(() => validate(UpdatePersonalizationInput, { feedback: "" })).toThrow();
  });

  it("accepts a non-empty feedback string", () => {
    expect(() =>
      validate(UpdatePersonalizationInput, { feedback: "I prefer 'Hey' over 'Dear'" }),
    ).not.toThrow();
  });
});
