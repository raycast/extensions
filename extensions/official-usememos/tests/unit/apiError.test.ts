import { describe, expect, it } from "vitest";
import { describeHttpFailure } from "../../src/api/apiError";

const INSTANCE = "https://memos.example.com";

describe("describeHttpFailure", () => {
  it("explains a rejected token and where to get a new one", () => {
    expect(describeHttpFailure(401, { message: "unauthenticated" }, INSTANCE)).toBe(
      "https://memos.example.com rejected the access token. Create a new one at https://memos.example.com/setting#access-token and update it in the extension preferences.",
    );
  });

  it("relays the server's own message", () => {
    expect(describeHttpFailure(500, { code: 13, message: "database is locked" }, INSTANCE)).toBe(
      "https://memos.example.com returned an error: database is locked",
    );
  });

  it("flags a URL that is not a Memos instance", () => {
    expect(describeHttpFailure(404, null, INSTANCE)).toBe(
      "https://memos.example.com doesn't look like a Memos instance. Check the instance URL in the extension preferences.",
    );
  });

  it("names the status only when nothing better exists", () => {
    expect(describeHttpFailure(502, null, INSTANCE)).toBe(
      "https://memos.example.com answered with HTTP 502 and no explanation. The server may be down or behind a misconfigured proxy.",
    );
  });
});
