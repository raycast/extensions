import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { alertProcessArgs, buildAlertScript, buildToastXml, isProcessAlive, RAYCAST_APP_ID } from "../src/lib/alert.ts";
import type { AlertContext } from "../src/lib/alert.ts";
import type { Timer } from "../src/lib/types.ts";

const timer: Timer = {
  id: "id-1",
  label: "Tea & <biscuits>",
  durationMs: 25 * 60_000,
  startedAt: 0,
  endsAt: 1_500_000,
  remainingMs: 1_500_000,
  status: "running",
  token: "tok'en",
};

const ctx: AlertContext = {
  statePath: "C:\\Users\\o'neil\\state.json",
  sound: "chime",
  iconPath: "C:\\icons\\icon.png",
  snoozeLink: "raycast://extensions/a/b/start-timer?arguments=%7B%7D&x=1",
};

describe("buildToastXml", () => {
  it("escapes the label and the deeplink", () => {
    const xml = buildToastXml(timer, ctx);
    assert.match(xml, /Tea &amp; &lt;biscuits&gt; is done/);
    assert.match(xml, /arguments="raycast:\/\/extensions\/a\/b\/start-timer\?arguments=%7B%7D&amp;x=1"/);
    assert.match(xml, /25 minutes complete/);
  });

  it("uses a generic title without a label", () => {
    assert.match(buildToastXml({ ...timer, label: undefined }, ctx), /<text>Time&apos;s up ✨<\/text>/);
  });

  it("maps sound preferences", () => {
    assert.match(buildToastXml(timer, ctx), /scenario="reminder"/);
    assert.match(buildToastXml(timer, ctx), /Notification\.Reminder/);
    assert.match(buildToastXml(timer, { ...ctx, sound: "alarm" }), /scenario="alarm".*loop="true"/);
    assert.match(buildToastXml(timer, { ...ctx, sound: "silent" }), /<audio silent="true"\/>/);
  });

  it("omits optional parts", () => {
    const xml = buildToastXml(timer, { statePath: "x", sound: "chime" });
    assert.doesNotMatch(xml, /appLogoOverride/);
    assert.doesNotMatch(xml, /5 more minutes/);
    assert.match(xml, /Dismiss/);
  });
});

describe("buildAlertScript", () => {
  const script = buildAlertScript(timer, ctx);

  it("quotes values for PowerShell", () => {
    assert.match(script, /\$statePath = 'C:\\Users\\o''neil\\state\.json'/);
    assert.match(script, /\$token = 'tok''en'/);
    assert.match(script, /\$endsAt = \[long\]1500000/);
  });

  it("checks the timer before notifying and polls at most every second", () => {
    assert.match(script, /\n\}\nif \(-not \(Test-Current\)\) \{ exit 0 \}\n\$light = 1[\s\S]*\$notifier\.Show/);
    assert.match(script, /Start-Sleep -Milliseconds \(\[Math\]::Min\(\$wait, 1000\)\)/);
  });

  it("uses Raycast's app id and falls back to looking up the installed Raycast", () => {
    assert.ok(script.includes(`$appId = '${RAYCAST_APP_ID}'`));
    assert.match(script, /Get-StartApps[\s\S]*\$_\.Name -like 'Raycast\*'[\s\S]*CreateToastNotifier\(\$appId\)/);
  });
});

describe("alertProcessArgs", () => {
  const args = alertProcessArgs("Write-Output 'hé'");

  it("passes the script encoded, without policy or window overrides", () => {
    assert.deepEqual(args.slice(0, 3), ["-NoProfile", "-NonInteractive", "-EncodedCommand"]);
    assert.equal(Buffer.from(args[3], "base64").toString("utf16le"), "Write-Output 'hé'");
    assert.ok(!args.includes("-ExecutionPolicy") && !args.includes("-WindowStyle"));
  });
});

describe("isProcessAlive", () => {
  it("is true for this process and false for no pid", () => {
    assert.equal(isProcessAlive(process.pid), true);
    assert.equal(isProcessAlive(undefined), false);
  });
});

describe("notification icon follows the Windows theme", () => {
  const themed = buildAlertScript(timer, { ...ctx, darkIconPath: String.raw`C:\icons\icon@dark.png` });

  it("embeds a light and a dark variant", () => {
    assert.match(themed, /\$lightXml = '.*icons\/icon\.png/);
    assert.match(themed, /\$darkXml = '.*icons\/icon@dark\.png/);
  });

  it("reads Windows' SystemUsesLightTheme right before showing", () => {
    assert.ok(themed.includes(String.raw`'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'`));
    assert.match(
      themed,
      /SystemUsesLightTheme[\s\S]*\$xml\.LoadXml\(\$\(if \(\$light -eq 0\) \{ \$darkXml \} else \{ \$lightXml \}\)\)\n\$notifier\.Show/,
    );
  });

  it("falls back to the light icon when no dark icon is given", () => {
    assert.match(buildAlertScript(timer, ctx), /\$darkXml = '.*icons\/icon\.png/);
  });
});
