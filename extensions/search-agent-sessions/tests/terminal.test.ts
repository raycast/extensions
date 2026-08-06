import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canDrive,
  launchPlan,
  ORCA_TERMINAL,
  resolveTerminal,
  SYSTEM_TERMINAL,
  TERMINALS,
} from "../src/lib/terminal";
import { ORCA_BUNDLE_ID } from "../src/lib/paths";
import { manifestDropdown } from "./fixtures";

const MAC = false;
const WIN = true;

test("the chosen terminal is taken as given", () => {
  assert.equal(resolveTerminal(ORCA_BUNDLE_ID, MAC), ORCA_TERMINAL);
  assert.equal(resolveTerminal("com.mitchellh.ghostty", MAC).name, "Ghostty");
  assert.equal(
    resolveTerminal("windows-terminal", WIN).name,
    "Windows Terminal",
  );
});

test("an id the dropdown cannot produce falls to the system terminal", () => {
  // A preference stored before an entry was removed, or a hand-edited manifest.
  // Driving an unknown id blind would front some unrelated app instead.
  for (const id of ["dev.warp.Warp", undefined, ""]) {
    for (const [windows, name] of [
      [MAC, "Terminal"],
      [WIN, "PowerShell"],
    ] as const) {
      const fallback = resolveTerminal(id, windows);
      assert.equal(fallback.name, name);
      // The id matters as much as the name: resumeInTerminal rethrows rather
      // than falling back when it is already holding the system terminal, so a
      // fallback carrying any other id would be launched a second time, two
      // eight-second timeouts before the clipboard takes over.
      assert.equal(fallback.id, SYSTEM_TERMINAL);
      // Only the real Orca entry may claim to be Orca; anything else with the
      // flag set would be handed to a CLI that has never heard of it.
      assert.equal(fallback.isOrca, false);
    }
  }
});

test("a terminal belonging to the other platform falls back too", () => {
  // The manifest cannot vary a dropdown by platform, so the list a Windows user
  // sees includes Ghostty and iTerm. Picking one has to mean something safe.
  assert.equal(
    resolveTerminal("com.mitchellh.ghostty", WIN).name,
    "PowerShell",
  );
  assert.equal(
    resolveTerminal("com.googlecode.iterm2", WIN).name,
    "PowerShell",
  );
  assert.equal(resolveTerminal("windows-terminal", MAC).name, "Terminal");
});

test("Orca is macOS only, and says so by resolving elsewhere on Windows", () => {
  assert.equal(resolveTerminal(ORCA_BUNDLE_ID, MAC).isOrca, true);
  const onWindows = resolveTerminal(ORCA_BUNDLE_ID, WIN);
  assert.equal(onWindows.isOrca, false);
  assert.equal(onWindows.name, "PowerShell");
  assert.equal(canDrive(ORCA_BUNDLE_ID, MAC), true);
  assert.equal(canDrive(ORCA_BUNDLE_ID, WIN), false);
});

test("every offered terminal can be driven on some platform", () => {
  // The whole point of curating the list: an entry we cannot hand a command to
  // anywhere would resume nothing and say nothing. Orca is the exception, being
  // reached through its own CLI rather than through a launch plan.
  for (const { id, name } of TERMINALS) {
    if (id === ORCA_BUNDLE_ID) continue;
    assert.ok(
      canDrive(id, MAC) || canDrive(id, WIN),
      `${name} is offered but has no driver on either platform`,
    );
  }
});

test("the manifest dropdown matches the terminals the code knows", () => {
  // Filtered to what a macOS user can actually pick, which is what `platforms`
  // currently declares. The Windows drivers stay in the table so that widening
  // it again is one manifest edit rather than a rewrite, and this assertion is
  // what stops one of them being offered to a Mac in the meantime.
  assert.deepEqual(
    manifestDropdown("terminalApp"),
    TERMINALS.filter((t) => canDrive(t.id, MAC)).map((t) => ({
      title: t.name,
      value: t.id,
    })),
  );
});

test("the Orca constant and the Orca dropdown entry stay one terminal", () => {
  // ORCA_TERMINAL is what `resolveTerminal` hands back and what titles the
  // action; the TERMINALS entry is what the manifest is pinned against. Renamed
  // in one place only, the row would offer "Orca" and the action would name
  // something else.
  const entry = TERMINALS.find((t) => t.id === ORCA_BUNDLE_ID);
  assert.equal(entry?.name, ORCA_TERMINAL.name);
});

test("Orca is launched through its own CLI, not through open", () => {
  assert.deepEqual(launchPlan(ORCA_TERMINAL, "/root/pixie", "claude", MAC), {
    kind: "orca",
  });
});

test("scripted terminals get a cd and the command", () => {
  const plan = launchPlan(
    resolveTerminal(SYSTEM_TERMINAL, MAC),
    "/root/pixie",
    "claude --resume abc",
    MAC,
  );
  assert.ok(plan.kind === "osascript");
  assert.match(
    plan.script,
    /do script "cd '\/root\/pixie' && claude --resume abc"/,
  );
  assert.match(plan.script, /^tell application "Terminal"/);
});

test("a directory with a quote cannot break out of either quoting layer", () => {
  // Two escapes stack here: shell single-quoting inside an AppleScript string
  // literal. Getting either wrong turns a directory name into script.
  const plan = launchPlan(
    resolveTerminal(SYSTEM_TERMINAL, MAC),
    `/root/it's "fine"`,
    "claude",
    MAC,
  );
  assert.ok(plan.kind === "osascript");
  // AppleScript unescapes this to cd '/root/it'\''s "fine"', which the shell in
  // turn reads as the one literal directory /root/it's "fine".
  assert.ok(
    plan.script.includes(String.raw`cd '/root/it'\\''s \"fine\"' && claude`),
  );
});

test("argv terminals take the directory as a flag and keep the shell alive", () => {
  const plan = launchPlan(
    resolveTerminal("com.mitchellh.ghostty", MAC),
    "/root/pixie",
    "codex resume abc",
    MAC,
  );
  assert.ok(plan.kind === "open");
  assert.deepEqual(plan.args.slice(0, 5), [
    "-n",
    "-b",
    "com.mitchellh.ghostty",
    "--args",
    "--working-directory=/root/pixie",
  ]);
  // No shell parses these, so the directory needs no quoting; what it does need
  // is a login shell, since Raycast spawns us without one.
  assert.equal(plan.args.at(-2), "-lc");
  assert.match(String(plan.args.at(-1)), /^codex resume abc; exec .* -l$/);
});

test("wezterm and kitty spell the same intent differently", () => {
  const wez = launchPlan(
    resolveTerminal("com.github.wez.wezterm", MAC),
    "/root/pixie",
    "claude",
    MAC,
  );
  assert.ok(wez.kind === "open");
  assert.deepEqual(wez.args.slice(3, 8), [
    "--args",
    "start",
    "--cwd",
    "/root/pixie",
    "--",
  ]);

  const kitty = launchPlan(
    resolveTerminal("net.kovidgoyal.kitty", MAC),
    "/root/pixie",
    "claude",
    MAC,
  );
  assert.ok(kitty.kind === "open");
  assert.deepEqual(kitty.args.slice(3, 6), [
    "--args",
    "--directory",
    "/root/pixie",
  ]);
});

test("PowerShell is started through a launcher that gives it a console", () => {
  // `open` does not exist on Windows, and the spawn is detached because -NoExit
  // means the process outlives the command. Detached is also why PowerShell
  // cannot be the process we spawn: a detached child is attached to no console,
  // so it would run windowless and, thanks to -NoExit, forever. What we spawn
  // is a windowless launcher; Start-Process is what makes the console.
  const plan = launchPlan(
    resolveTerminal(SYSTEM_TERMINAL, WIN),
    "C:\\code\\pixie",
    "claude --resume abc",
    WIN,
  );
  assert.ok(plan.kind === "detach");
  assert.equal(plan.exe, "powershell.exe");
  assert.deepEqual(plan.args, [
    "-NoProfile",
    "-Command",
    "Start-Process -FilePath 'powershell.exe' -ArgumentList " +
      "@('-NoExit','-Command','Set-Location -LiteralPath ''C:\\code\\pixie''; claude --resume abc') " +
      "-ErrorAction Stop",
  ]);
});

test("a Windows directory with a quote is doubled, not escaped", () => {
  // PowerShell single-quoted literals have no backslash escape at all; the
  // backslash is a path separator there, so the quote is doubled instead. Two
  // layers of that stack here, the launcher quoting the script that quotes the
  // directory, so the one quote the user typed arrives as four.
  const plan = launchPlan(
    resolveTerminal(SYSTEM_TERMINAL, WIN),
    "C:\\code\\it's",
    "claude",
    WIN,
  );
  assert.ok(plan.kind === "detach");
  assert.ok(
    String(plan.args.at(-1)).includes(
      "'Set-Location -LiteralPath ''C:\\code\\it''''s''; claude'",
    ),
  );
});

test("Windows Terminal takes the directory as a flag and the command bare", () => {
  // wt splits its command line on every unescaped semicolon, wherever in the
  // arguments it sits, and runs the remainder as another subcommand. A
  // Set-Location prefix carries one by construction, which would leave a pane
  // that only cd'd and a second broken subcommand; -d already puts the tab in
  // the directory, which is what makes dropping the prefix safe.
  const plan = launchPlan(
    resolveTerminal("windows-terminal", WIN),
    "C:\\code\\od;ds",
    "claude --resume abc",
    WIN,
  );
  assert.ok(plan.kind === "detach");
  assert.equal(plan.exe, "wt.exe");
  assert.deepEqual(plan.args, [
    "-d",
    "C:\\code\\od\\;ds",
    "powershell.exe",
    "-NoExit",
    "-Command",
    "claude --resume abc",
  ]);
});

test("a semicolon in the command is escaped for wt as well", () => {
  // Every argument is escaped, not only the directory: wt's parser has no
  // notion of which argument it is reading, so a command that chains would be
  // truncated exactly as a directory name would.
  const plan = launchPlan(
    resolveTerminal("windows-terminal", WIN),
    "C:\\code\\pixie",
    "claude --resume abc; echo done",
    WIN,
  );
  assert.ok(plan.kind === "detach");
  assert.deepEqual(plan.args.slice(-3), [
    "-NoExit",
    "-Command",
    "claude --resume abc\\; echo done",
  ]);
});

test("Alacritty is driven on both platforms", () => {
  const mac = launchPlan(
    resolveTerminal("org.alacritty", MAC),
    "/root/pixie",
    "claude",
    MAC,
  );
  assert.ok(mac.kind === "open");
  assert.deepEqual(mac.args.slice(0, 7), [
    "-n",
    "-b",
    "org.alacritty",
    "--args",
    "--working-directory",
    "/root/pixie",
    "-e",
  ]);
  assert.equal(mac.args.at(-2), "-lc");

  // The GUI executable is spawned directly, unlike PowerShell above: it opens
  // its own window, and the shell it hosts gets its console from Alacritty.
  const win = launchPlan(
    resolveTerminal("org.alacritty", WIN),
    "C:\\code\\pixie",
    "claude",
    WIN,
  );
  assert.ok(win.kind === "detach");
  assert.equal(win.exe, "alacritty.exe");
  assert.deepEqual(win.args, [
    "--working-directory",
    "C:\\code\\pixie",
    "-e",
    "powershell.exe",
    "-NoExit",
    "-Command",
    "Set-Location -LiteralPath 'C:\\code\\pixie'; claude",
  ]);
});

test("a terminal that exists on both platforms keeps both drivers", () => {
  assert.equal(canDrive("com.github.wez.wezterm", MAC), true);
  assert.equal(canDrive("com.github.wez.wezterm", WIN), true);
  const win = launchPlan(
    resolveTerminal("com.github.wez.wezterm", WIN),
    "C:\\code\\pixie",
    "claude",
    WIN,
  );
  assert.ok(win.kind === "detach");
  assert.equal(win.exe, "wezterm-gui.exe");
  assert.deepEqual(win.args.slice(0, 4), [
    "start",
    "--cwd",
    "C:\\code\\pixie",
    "--",
  ]);
});
