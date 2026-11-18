import assert from "node:assert/strict";
import test from "node:test";
import { isSlackAuthenticationResponse } from "./downloadAuth";

test("treats Slack sign-in HTML without an attachment disposition as authentication", () => {
  assert.equal(
    isSlackAuthenticationResponse(
      { "content-type": "text/html; charset=utf-8" },
      `<!DOCTYPE html><html><head><title>Slack</title></head><body>Sign in to Slack to continue</body></html>`,
    ),
    true,
  );
});

test("does not treat an HTML attachment as a sign-in page", () => {
  assert.equal(
    isSlackAuthenticationResponse(
      {
        "content-type": "text/html; charset=utf-8",
        "content-disposition": 'attachment; filename="notes.html"',
      },
      "<!DOCTYPE html><html><body><h1>Meeting notes</h1></body></html>",
    ),
    false,
  );
});

test("does not treat Slack-like HTML with an attachment disposition as authentication", () => {
  assert.equal(
    isSlackAuthenticationResponse(
      {
        "content-type": "text/html; charset=utf-8",
        "content-disposition": 'attachment; filename="login.html"',
      },
      `<!DOCTYPE html><html><head><title>Slack</title></head><body>Sign in to Slack</body></html>`,
    ),
    false,
  );
});

test("does not treat HTML without Slack sign-in markers as authentication", () => {
  assert.equal(
    isSlackAuthenticationResponse(
      { "content-type": "text/html" },
      "<!DOCTYPE html><html><body><h1>Quarterly report</h1></body></html>",
    ),
    false,
  );
});

test("does not treat non-HTML responses as authentication", () => {
  assert.equal(isSlackAuthenticationResponse({ "content-type": "application/pdf" }, "%PDF-1.4"), false);
});
