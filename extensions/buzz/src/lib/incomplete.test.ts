import { describe, it, expect } from "vitest";
import { Toast } from "@raycast/api";
import { INCOMPLETE_EMPTY_DESCRIPTION, INCOMPLETE_SUBTITLE, incompleteToast } from "./incomplete";

describe("incomplete-list copy", () => {
  it("names the list in the toast title and explains why", () => {
    expect(incompleteToast("Channel")).toEqual({
      style: Toast.Style.Failure,
      title: "Channel list may be incomplete",
      message: "The relay has more channel and conversation records than this extension pages through.",
    });
    expect(incompleteToast("Conversation").title).toBe("Conversation list may be incomplete");
  });

  it("keeps the persistent copy short and the empty copy honest", () => {
    expect(INCOMPLETE_SUBTITLE).toBe("May be incomplete");
    expect(INCOMPLETE_EMPTY_DESCRIPTION).toMatch(/may be incomplete/);
  });
});
