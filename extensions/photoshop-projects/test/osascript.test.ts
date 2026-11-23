import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeAppleScriptString } from "../src/utils/osascript";

describe("osascript security escaping", () => {
  it("leaves clean strings unchanged", () => {
    assert.equal(escapeAppleScriptString("Adobe Photoshop 2024"), "Adobe Photoshop 2024");
    assert.equal(escapeAppleScriptString("/Users/alice/Documents/file.psd"), "/Users/alice/Documents/file.psd");
  });

  it("escapes backslashes properly", () => {
    assert.equal(escapeAppleScriptString("folder\\file.psd"), "folder\\\\file.psd");
    assert.equal(escapeAppleScriptString("C:\\Windows\\Path"), "C:\\\\Windows\\\\Path");
  });

  it("escapes double quotes to prevent AppleScript injection", () => {
    const malicious = 'Test" & do shell script "whoami" & "';
    const escaped = escapeAppleScriptString(malicious);
    assert.equal(escaped, 'Test\\" & do shell script \\"whoami\\" & \\"');
  });

  it("escapes newlines and carriage returns", () => {
    assert.equal(escapeAppleScriptString("line1\nline2"), "line1\\nline2");
    assert.equal(escapeAppleScriptString("line1\r\nline2"), "line1\\r\\nline2");
  });

  it("handles complex combined injection vectors", () => {
    const attack = 'App\\" || rm -rf /\n';
    const escaped = escapeAppleScriptString(attack);
    assert.equal(escaped, 'App\\\\\\" || rm -rf /\\n');
  });
});
