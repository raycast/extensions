import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BttInfo } from "bettertouchtool";
import { formatDiagnostics, loadDiagnostics, type DiagnosticsClient, type DiagnosticsData } from "./diagnostics-model";

const info: BttInfo = {
  app: "BetterTouchTool",
  version: "6.747",
  build: "2026082206",
  macOS: "Version 26.6.2",
  routes: ["get_info", "trigger_action"],
  socketServerEnabled: true,
  http: { jsonBody: true, secretHeader: "X-BTT-Shared-Secret" },
};

describe("connection diagnostics", () => {
  it("loads transport and capability information from the client", async () => {
    const client: DiagnosticsClient = {
      info: async () => info,
      transport: async () => ({ kind: "unix-socket", describe: () => "unix-socket (/tmp/btt.sock)" }),
    };

    assert.deepEqual(await loadDiagnostics(client), {
      info,
      transportKind: "unix-socket",
      transportDescription: "unix-socket (/tmp/btt.sock)",
    });
  });

  it("formats available BTT capabilities", () => {
    const markdown = formatDiagnostics(diagnostics(info));

    assert.match(markdown, /Transport: \*\*unix-socket\*\*/);
    assert.match(markdown, /Version: \*\*6\.747\*\* \(2026082206\)/);
    assert.match(markdown, /Available scripting functions: 2/);
    assert.match(markdown, /JSON POST support: Yes/);
    assert.match(markdown, /Secret header support: Yes/);
  });

  it("explains when an older BTT version has no capability information", () => {
    assert.match(formatDiagnostics(diagnostics(null)), /requires BetterTouchTool 6\.735 or newer/);
  });
});

function diagnostics(bttInfo: BttInfo | null): DiagnosticsData {
  return {
    info: bttInfo,
    transportKind: "unix-socket",
    transportDescription: "unix-socket (/tmp/btt.sock)",
  };
}
