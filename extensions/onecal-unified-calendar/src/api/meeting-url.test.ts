import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { withAuthUser } from "./meeting-url.ts";

describe("withAuthUser", () => {
  it("appends authuser with proper encoding for meet.google.com", () => {
    assert.equal(
      withAuthUser(
        "https://meet.google.com/abc-defg-hij",
        "k.sato@example.co.jp",
      ),
      "https://meet.google.com/abc-defg-hij?authuser=k.sato%40example.co.jp",
    );
  });

  it("preserves existing query parameters", () => {
    assert.equal(
      withAuthUser("https://meet.google.com/abc?hs=122", "a@b.jp"),
      "https://meet.google.com/abc?hs=122&authuser=a%40b.jp",
    );
  });

  it("preserves URL fragments", () => {
    assert.equal(
      withAuthUser("https://meet.google.com/abc#section", "a@b.jp"),
      "https://meet.google.com/abc?authuser=a%40b.jp#section",
    );
  });

  it("replaces an existing authuser instead of duplicating it", () => {
    assert.equal(
      withAuthUser(
        "https://meet.google.com/abc?authuser=old%40b.jp",
        "new@b.jp",
      ),
      "https://meet.google.com/abc?authuser=new%40b.jp",
    );
  });

  it("leaves non-Google conferencing hosts unchanged", () => {
    for (const url of [
      "https://zoom.us/j/123456789",
      "https://company.zoom.us/j/123",
      "https://teams.microsoft.com/l/meetup-join/x",
      "https://teams.live.com/meet/x",
      "https://example.webex.com/meet/x",
    ]) {
      assert.equal(withAuthUser(url, "a@b.jp"), url);
    }
  });

  it("does not treat lookalike hosts as Google Meet", () => {
    assert.equal(
      withAuthUser("https://evilmeet.google.com.attacker.example/x", "a@b.jp"),
      "https://evilmeet.google.com.attacker.example/x",
    );
  });

  it("returns the URL unchanged when the account email is missing or empty", () => {
    assert.equal(
      withAuthUser("https://meet.google.com/abc", undefined),
      "https://meet.google.com/abc",
    );
    assert.equal(
      withAuthUser("https://meet.google.com/abc", ""),
      "https://meet.google.com/abc",
    );
  });

  it("returns unparsable URLs unchanged", () => {
    assert.equal(withAuthUser("not a url", "a@b.jp"), "not a url");
  });
});
