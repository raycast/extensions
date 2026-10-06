jest.mock("@raycast/utils", () => ({ runPowerShellScript: jest.fn() }));
import { runPowerShellScript } from "@raycast/utils";
import { buildPowerShellScript, runWindowsShortcuts, validateWindowsSequence } from "./windows-shortcut-runner";
import { Modifiers } from "../model/internal/modifiers";
const target = { kind: "desktop" as const, windowsProcessName: "Code" };
const sequence = [{ base: "c", modifiers: [Modifiers.control] }];
it("supports Ctrl/Alt/Shift/Win, punctuation, and multi-chord sequences without SendKeys text interpretation", () => {
  const chords = validateWindowsSequence([
    { base: "+", modifiers: [Modifiers.control] },
    { base: "left", modifiers: [Modifiers.win, Modifiers.shift] },
    { base: "f24", modifiers: [] },
  ]);
  expect(chords).toEqual([
    { code: 0, character: "+", modifiers: [17] },
    { code: 37, character: "", modifiers: [91, 16] },
    { code: 135, character: "", modifiers: [] },
  ]);
});
it("keeps alphanumeric accelerator keys separate from layout-mapped characters", () => {
  expect(
    validateWindowsSequence([
      { base: "1", modifiers: [Modifiers.control] },
      { base: "9", modifiers: [Modifiers.control] },
      { base: "0", modifiers: [Modifiers.control] },
      { base: "a", modifiers: [Modifiers.control] },
      { base: "c", modifiers: [Modifiers.control, Modifiers.shift] },
    ])
  ).toEqual([
    { code: 49, character: "", modifiers: [17] },
    { code: 57, character: "", modifiers: [17] },
    { code: 48, character: "", modifiers: [17] },
    { code: 65, character: "", modifiers: [17] },
    { code: 67, character: "", modifiers: [17, 16] },
  ]);
});
it.each(["unknown", "abc", "__proto__", "(click)", "\n", "💩"])(
  "rejects unsupported base %s before invoking Windows",
  async (base) => {
    await expect(runWindowsShortcuts(target, 0, [{ base, modifiers: [] }])).rejects.toThrow("unsupported");
    expect(runPowerShellScript).not.toHaveBeenCalled();
  }
);
it("rejects command translation, invalid modifiers, empty/overlong sequences, and invalid delays", () => {
  expect(() => validateWindowsSequence([{ base: "c", modifiers: [Modifiers.command] }])).toThrow("unsupported");
  expect(() => validateWindowsSequence([])).toThrow("executable");
  expect(() => validateWindowsSequence(Array(33).fill(sequence[0]))).toThrow("executable");
  for (const delay of [NaN, Infinity, -1, 5001])
    expect(() => buildPowerShellScript(target, delay, sequence)).toThrow("Delay");
});
it.each(["Code.exe", "../Code", "Code..test", "x';Stop-Process", "x$()", ""])(
  "rejects unsafe process target %s",
  (windowsProcessName) => {
    expect(() => buildPowerShellScript({ kind: "desktop", windowsProcessName }, 0, sequence)).toThrow("target");
  }
);
it("checks exact process/window ownership and focus, resolves all keys before sending, and preserves one attempt", () => {
  const script = buildPowerShellScript(target, 200, sequence);
  expect(script).toContain("Get-HotkysWindow $target.windowsProcessName");
  expect(script).toContain("Application window changed; no keys were sent");
  expect(script).toContain("Application did not become ready; no keys were sent");
  expect(script.indexOf("$resolved +=")).toBeLessThan(script.indexOf("::SetForegroundWindow($handle)"));
  expect(script).toContain("CheckWindow(h, pid, name, true)");
  expect(script).toContain("GetAsyncKeyState");
  expect(script).toContain("sent != inputs.Count");
  expect(script).not.toContain("SendWait");
});
it("checks the captured browser URL before every chord", () => {
  const script = buildPowerShellScript(
    {
      kind: "browser",
      windowsProcessName: "chrome",
      processId: 123,
      windowHandle: "456",
      addressValue: "https://example.com/page",
      documentUrl: "https://example.com/page",
      url: "https://example.com/page",
      hostname: "example.com",
    },
    0,
    sequence
  );
  expect(script).toContain("$page.addressValue -cne $target.addressValue");
  expect(script).toContain("$handle = [IntPtr]([long]$target.windowHandle)");
  expect(script.indexOf("$page.addressValue -cne")).toBeLessThan(script.indexOf("::SendChord($handle"));
});
it("awaits PowerShell completion and reports partial failure without retry", async () => {
  let fail!: (error: Error) => void;
  jest.mocked(runPowerShellScript).mockImplementation(
    () =>
      new Promise((_resolve, reject) => {
        fail = reject;
      })
  );
  const pending = runWindowsShortcuts(target, 0, sequence);
  expect(runPowerShellScript).toHaveBeenCalledTimes(1);
  expect(runPowerShellScript).toHaveBeenCalledWith(expect.any(String), { timeout: 20000 });
  fail(new Error("UIPI"));
  await expect(pending).rejects.toThrow("Earlier chords may have run");
  expect(runPowerShellScript).toHaveBeenCalledTimes(1);
});
