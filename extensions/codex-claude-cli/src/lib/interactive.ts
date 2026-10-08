import { environment } from "@raycast/api";
import { Terminal, type IBufferCell, type IBufferLine } from "@xterm/headless";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { IPty } from "node-pty";

import { buildResumeCommand, shellQuote } from "./commands";
import { codexModelSupportsFast } from "./codex-runtime";
import { permissionProfile } from "./permissions";
import { isChatSessionCurrentlyActive, loadTranscript } from "./sessions";
import { buildSharedSessionCommand, killSharedSession } from "./shared-session";
import {
  SessionStartupConfiguration,
  saveSessionStartupConfiguration,
  sessionStartupConfiguration,
} from "./startup-config";
import { ChatProvider, ChatSession, Transcript } from "./types";

type InteractiveStatus = "idle" | "starting" | "running" | "stopped" | "failed";

export interface InteractiveTerminalSpan {
  text: string;
  foreground?: string;
  background?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  inverse?: boolean;
}

export interface InteractiveTerminalLine {
  spans: InteractiveTerminalSpan[];
}

interface InteractiveTerminalCursor {
  line: number;
  column: number;
}

export interface InteractiveSnapshot {
  status: InteractiveStatus;
  command: string;
  output: string;
  error?: string;
  startedAt?: number;
  sentInputs: number;
  activeModel?: string;
  reasoningEffort?: string;
  fastMode?: boolean;
  terminalLines?: InteractiveTerminalLine[];
  terminalCursor?: InteractiveTerminalCursor;
  historyOutput?: string;
  historyMessageCount?: number;
  historyLoading?: boolean;
  lastAction?: string;
  operation?: string;
  permissionProfileId: string;
  permissionProfileTitle: string;
}

export interface InteractiveModelSelection {
  modelId: string;
  effort: string;
  selectorIndex?: number;
  supportedEfforts?: string[];
}

export type InteractiveControlKey =
  "up" | "down" | "left" | "right" | "enter" | "tab" | "backspace" | "escape" | "ctrl-c" | "ctrl-d" | "ctrl-v";

interface InteractiveRunner {
  child: IPty;
  terminal: Terminal;
  snapshot: InteractiveSnapshot;
  listeners: Set<(snapshot: InteractiveSnapshot) => void>;
  notifyTimer?: ReturnType<typeof setTimeout>;
  renderTimer?: ReturnType<typeof setTimeout>;
  ready: Promise<void>;
  markReady: () => void;
  inputReady: boolean;
  terminalRevision: number;
  lastTerminalUpdateAt: number;
  lastTerminalRenderAt: number;
}

const runners = new Map<string, InteractiveRunner>();
const runnerStarts = new Map<string, Promise<InteractiveRunner>>();
const listenersBySession = new Map<string, Set<(snapshot: InteractiveSnapshot) => void>>();
const permissionProfilesBySession = new Map<string, string>();
const permissionProfileStoragePath = join(environment.supportPath, "permission-profiles.json");
const terminalColumns = 95;
const terminalRows = 20;
const maximumRenderedLines = 4_000;
const maximumLiveRenderedLines = 1_200;
const terminalRenderInterval = 100;
const listenerNotifyInterval = 80;
let nodePtyPromise: Promise<typeof import("node-pty")> | undefined;
let cleanupRegistered = false;
let permissionProfilesLoaded = false;

export function getInteractiveSnapshot(session: ChatSession): InteractiveSnapshot {
  return runners.get(sessionKey(session))?.snapshot || idleSnapshot(session);
}

export function getInteractivePermissionProfileId(session: ChatSession): string {
  ensurePermissionProfilesLoaded();
  return permissionProfile(session.provider, permissionProfilesBySession.get(sessionKey(session))).id;
}

export function subscribeToInteractiveSession(
  session: ChatSession,
  listener: (snapshot: InteractiveSnapshot) => void,
): () => void {
  const key = sessionKey(session);
  const listeners = listenersBySession.get(key) || new Set();
  listeners.add(listener);
  listenersBySession.set(key, listeners);
  const existing = runners.get(key);
  if (existing) existing.listeners = listeners;
  listener(existing?.snapshot || idleSnapshot(session));

  return () => {
    listenersBySession.get(key)?.delete(listener);
  };
}

export function configureInteractivePermissionProfile(session: ChatSession, profileId: string): void {
  ensurePermissionProfilesLoaded();
  const key = sessionKey(session);
  const runner = runners.get(key);
  if (runner && (runner.snapshot.status === "running" || runner.snapshot.status === "starting")) {
    throw new Error("The CLI is already running. Use /permissions to change it live.");
  }
  const profile = permissionProfile(session.provider, profileId);
  permissionProfilesBySession.set(key, profile.id);
  persistPermissionProfiles();
  if (runner) runners.delete(key);
  const snapshot = idleSnapshot(session);
  for (const listener of listenersBySession.get(key) || []) listener(snapshot);
}

export function configureInteractiveStartup(session: ChatSession, configuration: SessionStartupConfiguration): void {
  const key = sessionKey(session);
  const runner = runners.get(key);
  if (runner && (runner.snapshot.status === "running" || runner.snapshot.status === "starting")) {
    throw new Error("The CLI is already running. End it before changing its startup configuration.");
  }
  saveSessionStartupConfiguration(session, configuration);
  if (runner) runners.delete(key);
  const snapshot = idleSnapshot(session);
  for (const listener of listenersBySession.get(key) || []) listener(snapshot);
}

export function saveInteractiveStartupForNextRun(
  session: ChatSession,
  profileId: string,
  configuration: SessionStartupConfiguration,
): void {
  ensurePermissionProfilesLoaded();
  const key = sessionKey(session);
  const selectedProfile = permissionProfile(session.provider, profileId);
  permissionProfilesBySession.set(key, selectedProfile.id);
  persistPermissionProfiles();
  saveSessionStartupConfiguration(session, configuration);

  const runner = runners.get(key);
  const runnerIsActive = runner?.snapshot.status === "running" || runner?.snapshot.status === "starting";
  if (runnerIsActive) return;
  if (runner) runners.delete(key);
  const snapshot = idleSnapshot(session);
  for (const listener of listenersBySession.get(key) || []) listener(snapshot);
}

export async function startInteractiveSession(session: ChatSession): Promise<void> {
  const runner = await ensureInteractiveRunner(session);
  await waitUntilInteractive(runner);
}

export async function sendInteractiveInput(session: ChatSession, input: string): Promise<void> {
  const runner = await ensureInteractiveRunner(session);
  await waitUntilInteractive(runner);
  assertRunnerIsActive(runner);

  const normalizedInput = input.replace(/\r\n/g, "\n").trim();
  const revisionBeforeInput = runner.terminalRevision;
  await writeAndSubmitInput(runner, session.provider, normalizedInput);
  updateSnapshot(runner, {
    ...runner.snapshot,
    status: "running",
    error: undefined,
    sentInputs: runner.snapshot.sentInputs + 1,
    operation: "Waiting For CLI Activity…",
    lastAction: normalizedInput.startsWith("/")
      ? `${normalizedInput} delivered to the PTY`
      : "Message delivered to the PTY",
  });

  try {
    await waitForTerminalActivity(runner, revisionBeforeInput, 6_000);
    updateSnapshot(runner, {
      ...runner.snapshot,
      operation: undefined,
      error: undefined,
      lastAction: normalizedInput.startsWith("/")
        ? `${normalizedInput} received by the CLI`
        : "The CLI received the message",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updateSnapshot(runner, {
      ...runner.snapshot,
      operation: undefined,
      error: message,
      lastAction: "Could not confirm the input",
    });
    throw error;
  }
}

export async function toggleInteractiveFastMode(session: ChatSession): Promise<void> {
  if (session.provider !== "codex") throw new Error("Fast mode is only available in Codex.");
  const runner = await ensureInteractiveRunner(session);
  await waitUntilInteractive(runner);
  assertRunnerIsActive(runner);
  await waitForCodexIdleComposer(runner);

  const activeModel = runner.snapshot.activeModel;
  if (!codexModelSupportsFast(session, activeModel)) {
    throw new Error("Select a Codex model that supports Fast mode first.");
  }

  const before = Boolean(runner.snapshot.fastMode);
  const expected = !before;
  const revisionBeforeInput = runner.terminalRevision;
  updateSnapshot(runner, {
    ...runner.snapshot,
    operation: expected ? "Turning On Fast Mode…" : "Turning Off Fast Mode…",
    error: undefined,
  });

  try {
    await writeAndSubmitInput(runner, "codex", "/fast");
    incrementSentInputs(runner, "/fast sent");
    await waitForCodexFastMode(runner, expected, revisionBeforeInput);
    updateSnapshot(runner, {
      ...runner.snapshot,
      fastMode: expected,
      operation: undefined,
      error: undefined,
      lastAction: expected ? "Fast mode on" : "Fast mode off",
    });
    saveSessionStartupConfiguration(session, {
      ...sessionStartupConfiguration(session),
      fastMode: expected,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updateSnapshot(runner, {
      ...runner.snapshot,
      operation: undefined,
      error: message,
      lastAction: "Fast mode could not be changed",
    });
    throw error;
  }
}

export async function changeInteractiveModel(
  session: ChatSession,
  selection: InteractiveModelSelection,
): Promise<void> {
  const runner = await ensureInteractiveRunner(session);
  await waitUntilInteractive(runner);
  assertRunnerIsActive(runner);
  updateSnapshot(runner, {
    ...runner.snapshot,
    operation: `Changing To ${selection.modelId} · ${selection.effort}`,
    error: undefined,
  });

  try {
    if (session.provider === "codex") await changeCodexModel(runner, selection);
    else await changeClaudeModel(runner, selection);

    updateSnapshot(runner, {
      ...runner.snapshot,
      activeModel: selection.modelId,
      reasoningEffort: selection.effort,
      operation: undefined,
      lastAction: `Model changed to ${selection.modelId} · ${selection.effort}`,
    });
    saveSessionStartupConfiguration(session, {
      ...sessionStartupConfiguration(session),
      modelId: selection.modelId,
      effort: selection.effort,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updateSnapshot(runner, {
      ...runner.snapshot,
      operation: undefined,
      error: message,
      lastAction: "The automatic selector could not complete",
    });
    throw error;
  }
}

export function interruptInteractiveSession(session: ChatSession): void {
  const runner = runners.get(sessionKey(session));
  if (!runner || (runner.snapshot.status !== "running" && runner.snapshot.status !== "starting")) return;
  runner.child.write("\u001B");
  updateSnapshot(runner, {
    ...runner.snapshot,
    lastAction: "Escape sent to interrupt",
  });
}

export function sendInteractiveControlKey(session: ChatSession, key: InteractiveControlKey): void {
  const runner = runners.get(sessionKey(session));
  if (!runner || (runner.snapshot.status !== "running" && runner.snapshot.status !== "starting")) return;
  const sequences: Record<InteractiveControlKey, string> = {
    up: "\u001B[A",
    down: "\u001B[B",
    right: "\u001B[C",
    left: "\u001B[D",
    enter: "\r",
    tab: "\t",
    backspace: "\u007F",
    escape: "\u001B",
    "ctrl-c": "\u0003",
    "ctrl-d": "\u0004",
    "ctrl-v": "\u0016",
  };
  runner.child.write(sequences[key]);
  updateSnapshot(runner, {
    ...runner.snapshot,
    lastAction: `Key ${key} sent`,
  });
}

export function resizeInteractiveSession(session: ChatSession, columns: number, rows: number): void {
  const runner = runners.get(sessionKey(session));
  if (!runner || (runner.snapshot.status !== "running" && runner.snapshot.status !== "starting")) return;
  const nextColumns = Math.max(48, Math.min(220, Math.floor(columns)));
  const nextRows = Math.max(8, Math.min(80, Math.floor(rows)));
  if (runner.terminal.cols === nextColumns && runner.terminal.rows === nextRows) return;
  try {
    runner.child.resize(nextColumns, nextRows);
    runner.terminal.resize(nextColumns, nextRows);
    runner.terminalRevision += 1;
    runner.lastTerminalUpdateAt = Date.now();
    scheduleTerminalRender(runner, session.provider);
  } catch (error) {
    void error;
  }
}

export async function stopInteractiveSession(session: ChatSession): Promise<void> {
  const key = sessionKey(session);
  const runner = runners.get(key);
  if (runner && (runner.snapshot.status === "running" || runner.snapshot.status === "starting")) {
    runner.child.write("/exit");
    await delay(70);
    runner.child.write("\r");
    await delay(220);
    if (codexComposerStillContains(runner.snapshot.output, "/exit")) runner.child.write("\r");
    updateSnapshot(runner, {
      ...runner.snapshot,
      operation: "Ending The Conversation…",
      lastAction: "Exit requested with /exit",
    });
    await delay(800);
  }

  await killSharedSession(session);
  if (runner && (runner.snapshot.status === "running" || runner.snapshot.status === "starting")) {
    runner.child.kill("SIGTERM");
  }
  runners.delete(key);
}

async function ensureInteractiveRunner(session: ChatSession): Promise<InteractiveRunner> {
  ensurePermissionProfilesLoaded();
  const key = sessionKey(session);
  const existing = runners.get(key);
  if (existing && (existing.snapshot.status === "running" || existing.snapshot.status === "starting")) {
    return existing;
  }

  const pending = runnerStarts.get(key);
  if (pending) return pending;

  const start = createInteractiveRunner(session, key);
  runnerStarts.set(key, start);
  try {
    return await start;
  } finally {
    if (runnerStarts.get(key) === start) runnerStarts.delete(key);
  }
}

async function createInteractiveRunner(session: ChatSession, key: string): Promise<InteractiveRunner> {
  const startup = sessionStartupConfiguration(session);
  const selectedPermissionProfile = permissionProfile(
    session.provider,
    permissionProfilesBySession.get(sessionKey(session)),
  );
  const command = buildResumeCommand(session, {
    permissionProfileId: selectedPermissionProfile.id,
  });
  const sharedCommand = await buildSharedSessionCommand(session, {
    permissionProfileId: selectedPermissionProfile.id,
  });
  const privateExternalSessionIsRunning = !sharedCommand?.isAttach
    ? await isChatSessionCurrentlyActive(session)
    : false;
  if (privateExternalSessionIsRunning) {
    throw new Error(
      "This conversation is already open in another application with a private PTY. Close it there, then reopen it in shared mode to control it from both applications.",
    );
  }
  registerRunnerCleanup();
  const runtimeCommand = sharedCommand || command;
  const runtimeArguments = sharedCommand
    ? ["/usr/bin/env", "-u", "TMUX", "-u", "TMUX_PANE", runtimeCommand.executable, ...runtimeCommand.arguments]
    : [runtimeCommand.executable, ...runtimeCommand.arguments];
  const shellCommand = `exec ${runtimeArguments.map(shellQuote).join(" ")}`;
  const { spawn: spawnPty } = await loadNodePty();
  const processEnvironment = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  const utf8Locale =
    [processEnvironment.LC_ALL, processEnvironment.LANG, processEnvironment.LC_CTYPE].find((value) =>
      /utf-?8/i.test(value || ""),
    ) || "en_US.UTF-8";
  delete processEnvironment.TMUX;
  delete processEnvironment.TMUX_PANE;
  const child = spawnPty("/bin/zsh", ["-lic", shellCommand], {
    name: "xterm-256color",
    cols: terminalColumns,
    rows: terminalRows,
    cwd: session.cwd,
    env: {
      ...processEnvironment,
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
      LANG: utf8Locale,
      LC_ALL: utf8Locale,
      LC_CTYPE: utf8Locale,
      COLUMNS: `${terminalColumns}`,
      LINES: `${terminalRows}`,
    },
  });
  const terminal = new Terminal({
    allowProposedApi: true,
    cols: terminalColumns,
    rows: terminalRows,
    scrollback: maximumRenderedLines,
    scrollOnEraseInDisplay: true,
    logLevel: "off",
  });

  let readyResolved = false;
  let resolveReady: () => void = () => undefined;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });
  const runner: InteractiveRunner = {
    child,
    terminal,
    snapshot: {
      status: "starting",
      command: sharedCommand?.display || command.display,
      output: "Starting Interactive CLI…",
      startedAt: Date.now(),
      sentInputs: 0,
      activeModel: startup.modelId || session.model,
      reasoningEffort: startup.effort,
      fastMode: startup.fastMode,
      historyLoading: true,
      permissionProfileId: selectedPermissionProfile.id,
      permissionProfileTitle: selectedPermissionProfile.title,
    },
    listeners: listenersBySession.get(key) || new Set(),
    ready,
    markReady: () => {
      if (readyResolved) return;
      readyResolved = true;
      resolveReady();
    },
    inputReady: false,
    terminalRevision: 0,
    lastTerminalUpdateAt: Date.now(),
    lastTerminalRenderAt: 0,
  };
  runners.set(key, runner);
  notify(runner);
  void loadRunnerHistory(session, runner);

  terminal.onData((data) => child.write(data));
  child.onData((chunk) => {
    runner.markReady();
    terminal.write(chunk, () => {
      runner.terminalRevision += 1;
      runner.lastTerminalUpdateAt = Date.now();
      scheduleTerminalRender(runner, session.provider);
    });
  });
  child.onExit(({ exitCode, signal }) => {
    runner.markReady();
    flushTerminalRender(runner, session.provider);
    const failed = Boolean(exitCode && exitCode !== 0);
    updateSnapshot(runner, {
      ...runner.snapshot,
      status: failed ? "failed" : "stopped",
      operation: undefined,
      error: failed ? `The CLI exited with code ${exitCode}${signal ? ` (${signal})` : ""}` : undefined,
      lastAction: failed ? "The CLI exited with an error" : "The CLI closed",
    });
    terminal.dispose();
  });

  setTimeout(() => {
    runner.markReady();
    if (runner.snapshot.status === "starting") updateSnapshot(runner, { ...runner.snapshot, status: "running" });
  }, 1_200);

  return runner;
}

async function changeCodexModel(runner: InteractiveRunner, selection: InteractiveModelSelection): Promise<void> {
  if (selection.selectorIndex === undefined) {
    throw new Error("This model is not available in the local Codex selector.");
  }

  await waitForCodexIdleComposer(runner);
  const modelRevision = runner.terminalRevision;
  await openCodexModelPicker(runner, modelRevision);
  incrementSentInputs(runner, "/model sent");
  const effortRevision = runner.terminalRevision;
  await chooseTerminalOption(runner, selection.selectorIndex);

  await waitForTerminalText(runner, `Select Reasoning Level for ${selection.modelId}`, effortRevision, 5_000);
  const supportedEfforts = selection.supportedEfforts?.length
    ? selection.supportedEfforts
    : ["low", "medium", "high", "xhigh", "max", "ultra"];
  const regularEfforts = supportedEfforts.filter((effort) => effort !== "max" && effort !== "ultra");
  const advancedEfforts = supportedEfforts.filter((effort) => effort === "max" || effort === "ultra");
  if (selection.effort === "max" || selection.effort === "ultra") {
    const advancedEffortIndex = advancedEfforts.indexOf(selection.effort);
    if (advancedEffortIndex < 0) throw new Error(`Codex does not recognize effort ${selection.effort}`);
    const advancedRevision = runner.terminalRevision;
    await chooseTerminalOption(runner, regularEfforts.length);
    await waitForTerminalText(runner, "Advanced Reasoning", advancedRevision, 5_000);
    await chooseTerminalOption(runner, advancedEffortIndex);
  } else {
    const effortIndex = regularEfforts.indexOf(selection.effort);
    if (effortIndex < 0) throw new Error(`Codex does not recognize effort ${selection.effort}`);
    await chooseTerminalOption(runner, effortIndex);
  }
  await delay(700);
}

async function openCodexModelPicker(runner: InteractiveRunner, afterRevision: number): Promise<void> {
  await writeAndSubmitInput(runner, "codex", "/model");
  try {
    await waitForTerminalCondition(runner, afterRevision, 3_000, isCodexModelSelectionView);
  } catch {
    assertRunnerIsActive(runner);
    if (!codexComposerStillContains(runner.snapshot.output, "/model")) {
      throw new Error("Codex did not open the model selector. Wait for the active task to finish and try again.");
    }
    runner.child.write("\r");
    await waitForTerminalCondition(runner, afterRevision, 5_000, isCodexModelSelectionView);
  }
}

async function changeClaudeModel(runner: InteractiveRunner, selection: InteractiveModelSelection): Promise<void> {
  runner.child.write(`/model ${selection.modelId}\r`);
  incrementSentInputs(runner, `/model ${selection.modelId} sent`);
  await delay(700);
  runner.child.write(`/effort ${selection.effort}\r`);
  incrementSentInputs(runner, `/effort ${selection.effort} sent`);
  await delay(700);
}

async function chooseTerminalOption(runner: InteractiveRunner, index: number): Promise<void> {
  runner.child.write("\u001B[H");
  await delay(120);
  if (index > 0) {
    runner.child.write("\u001B[B".repeat(index));
    await delay(120);
  }
  runner.child.write("\r");
}

async function writeAndSubmitInput(runner: InteractiveRunner, provider: ChatProvider, input: string) {
  runner.child.write(input.includes("\n") ? `\u001B[200~${input}\u001B[201~` : input);
  await delay(provider === "codex" ? 70 : 20);
  runner.child.write("\r");

  if (provider !== "codex") return;
  await delay(180);
  if (codexComposerStillContains(runner.snapshot.output, input)) runner.child.write("\r");
}

function codexComposerStillContains(output: string, input: string): boolean {
  const tail = output.split("\n").slice(-18).join("\n");
  if (/Select .+|Advanced Reasoning|Press enter to confirm|esc to interrupt|Working|Thinking/i.test(tail)) {
    return false;
  }
  const compactTail = tail.replace(/\s+/g, "").toLowerCase();
  const compactInput = input.replace(/\s+/g, "").toLowerCase();
  return compactInput.length > 0 && compactTail.includes(`›${compactInput}`);
}

async function waitForTerminalText(
  runner: InteractiveRunner,
  expectedText: string,
  afterRevision: number,
  timeoutMilliseconds: number,
): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMilliseconds) {
    if (
      runner.terminalRevision > afterRevision &&
      terminalTail(runner.snapshot.output, 80).toLocaleLowerCase().includes(expectedText.toLocaleLowerCase())
    )
      return;
    if (runner.snapshot.status === "failed" || runner.snapshot.status === "stopped") {
      throw new Error(runner.snapshot.error || "The CLI closed during selection");
    }
    await delay(80);
  }
  throw new Error(`The CLI did not show “${expectedText}”. Use the manual selector from the terminal.`);
}

async function waitForTerminalCondition(
  runner: InteractiveRunner,
  afterRevision: number,
  timeoutMilliseconds: number,
  condition: (output: string) => boolean,
): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMilliseconds) {
    if (runner.terminalRevision > afterRevision && condition(terminalTail(runner.snapshot.output, 80))) return;
    assertRunnerIsActive(runner);
    await delay(80);
  }
  throw new Error("Codex did not open the native selector.");
}

async function waitUntilInteractive(runner: InteractiveRunner): Promise<void> {
  if (runner.inputReady) return;
  await Promise.race([runner.ready, delay(8_000)]);
  assertRunnerIsActive(runner);

  const startedAt = Date.now();
  while (Date.now() - startedAt < 15_000) {
    assertRunnerIsActive(runner);
    const quietFor = Date.now() - runner.lastTerminalUpdateAt;
    const hasPrompt = hasInteractivePrompt(runner.snapshot.output);
    const hasReadyFooter = hasCodexReadyFooter(runner.snapshot.output);
    const hasActiveWork = hasActiveCliWork(runner.snapshot.output);
    const visiblySettled =
      runner.terminalRevision > 0 && quietFor >= 1_200 && Date.now() - startedAt >= 2_500 && !hasActiveWork;
    if ((hasPrompt && quietFor >= 200) || (hasReadyFooter && quietFor >= 500 && !hasActiveWork) || visiblySettled) {
      runner.inputReady = true;
      return;
    }
    await delay(100);
  }

  throw new Error("The CLI did not finish starting. Review the activity shown in the terminal.");
}

async function waitForTerminalActivity(
  runner: InteractiveRunner,
  afterRevision: number,
  timeoutMilliseconds: number,
): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMilliseconds) {
    if (runner.terminalRevision > afterRevision) return;
    assertRunnerIsActive(runner);
    await delay(80);
  }
  throw new Error("The CLI did not react to the input. The message was left in place so you can retry.");
}

function hasInteractivePrompt(output: string): boolean {
  return output
    .split("\n")
    .slice(-16)
    .some((line) => /^\s*[›❯>](?:\s|$)/.test(line));
}

function hasCodexReadyFooter(output: string): boolean {
  return output
    .split("\n")
    .slice(-8)
    .some((line) => /\bgpt-[\w.-]+\b.*·\s*(?:~|\/)\S*/i.test(line));
}

async function waitForCodexIdleComposer(runner: InteractiveRunner): Promise<void> {
  const startedAt = Date.now();
  let dismissedAtRevision = -1;
  while (Date.now() - startedAt < 10_000) {
    assertRunnerIsActive(runner);

    const tail = terminalTail(runner.snapshot.output, 40);
    if (isCodexTranscriptOverlay(tail)) {
      if (dismissedAtRevision !== runner.terminalRevision) {
        dismissedAtRevision = runner.terminalRevision;
        runner.child.write("q");
      }
      await delay(120);
      continue;
    }
    if (isCodexSelectionView(tail)) {
      if (dismissedAtRevision !== runner.terminalRevision) {
        dismissedAtRevision = runner.terminalRevision;
        runner.child.write("\u001B");
      }
      await delay(120);
      continue;
    }

    const composer = codexComposerState(runner);
    if (composer.visible) {
      if (composer.hasDraft) {
        throw new Error(
          "The Codex composer already contains text. Send or clear it before using the automatic selector.",
        );
      }
      return;
    }
    await delay(100);
  }
  throw new Error("The Codex composer is not available. Close the current popup or wait for startup to finish.");
}

function hasActiveCliWork(output: string): boolean {
  return /Starting MCP servers|esc to interrupt/i.test(terminalTail(output, 10));
}

function codexComposerState(runner: InteractiveRunner): {
  visible: boolean;
  hasDraft: boolean;
} {
  const lines = (runner.snapshot.terminalLines || []).slice(-14);
  for (let lineIndex = lines.length - 1; lineIndex >= 0; lineIndex -= 1) {
    const line = lines[lineIndex];
    const text = line.spans.map((span) => span.text).join("");
    if (!/^\s*[›❯>](?:\s|$)/.test(text)) continue;

    const hasDraft = lineHasNonDimComposerText(line);
    const followingLines = lines
      .slice(lineIndex + 1)
      .map((followingLine) => followingLine.spans.map((span) => span.text).join(""));
    const onlyFooterFollows = followingLines.every(
      (followingLine) =>
        !followingLine.trim() ||
        /\bgpt-[\w.-]+\b.*·\s*(?:~|\/)/i.test(followingLine) ||
        /esc to interrupt/i.test(followingLine),
    );
    return { visible: hasDraft || onlyFooterFollows, hasDraft };
  }

  return {
    visible:
      hasCodexReadyFooter(runner.snapshot.output) &&
      !isCodexTranscriptOverlay(terminalTail(runner.snapshot.output, 20)),
    hasDraft: false,
  };
}

function lineHasNonDimComposerText(line: InteractiveTerminalLine): boolean {
  let foundPrompt = false;
  for (const span of line.spans) {
    let text = span.text;
    if (!foundPrompt) {
      const markerIndex = text.search(/[›❯>]/);
      if (markerIndex < 0) continue;
      foundPrompt = true;
      text = text.slice(markerIndex + 1);
    }
    if (text.trim() && !span.dim) return true;
  }
  return false;
}

function isCodexTranscriptOverlay(output: string): boolean {
  return /\/\s*T\s*R\s*A\s*N\s*S\s*C\s*R\s*I\s*P\s*T\s*\//i.test(output) && /q to quit/i.test(output);
}

function isCodexSelectionView(output: string): boolean {
  return (
    /Press enter to confirm or esc to go back/i.test(output) &&
    (/Select Model|Select Reasoning Level|Advanced Reasoning/i.test(output) || isCodexModelSelectionView(output))
  );
}

function isCodexModelSelectionView(output: string): boolean {
  return (
    /Press enter to confirm or esc to go back/i.test(output) &&
    (/Select Model(?: and Effort)?/i.test(output) || /\b1\.\s*gpt-[\w.-]+/i.test(output))
  );
}

async function waitForCodexFastMode(
  runner: InteractiveRunner,
  expected: boolean,
  afterRevision: number,
): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 6_000) {
    assertRunnerIsActive(runner);
    if (runner.terminalRevision > afterRevision && runner.snapshot.fastMode === expected) return;

    const tail = terminalTail(runner.snapshot.output, 24);
    if (runner.terminalRevision > afterRevision && /Unrecognized command ['“‘]?\/fast/i.test(tail)) {
      throw new Error("The active Codex model does not expose Fast mode. Select a compatible model and try again.");
    }
    if (/Failed to save default service tier/i.test(tail)) {
      throw new Error("Codex could not save Fast mode.");
    }
    await delay(80);
  }
  throw new Error("Codex did not confirm the Fast mode change.");
}

function terminalTail(output: string, lineCount: number): string {
  return output.split("\n").slice(-lineCount).join("\n");
}

function assertRunnerIsActive(runner: InteractiveRunner): void {
  if (runner.snapshot.status !== "running" && runner.snapshot.status !== "starting") {
    throw new Error(runner.snapshot.error || "The interactive session is no longer running");
  }
}

function incrementSentInputs(runner: InteractiveRunner, lastAction: string): void {
  updateSnapshot(runner, {
    ...runner.snapshot,
    sentInputs: runner.snapshot.sentInputs + 1,
    lastAction,
  });
}

function renderTerminal(terminal: Terminal): {
  output: string;
  terminalLines: InteractiveTerminalLine[];
  terminalCursor?: InteractiveTerminalCursor;
} {
  const buffer = terminal.buffer.active;
  const firstLine = Math.max(0, buffer.length - maximumLiveRenderedLines);
  const renderedLines: InteractiveTerminalLine[] = [];
  const reusableCell = buffer.getNullCell();
  const cursorBufferLine = buffer.baseY + buffer.cursorY;
  let terminalCursor: InteractiveTerminalCursor | undefined;

  for (let lineIndex = firstLine; lineIndex < buffer.length; lineIndex += 1) {
    const line = buffer.getLine(lineIndex);
    if (!line) continue;
    const renderedLine = renderTerminalLine(line, reusableCell);
    if (line.isWrapped && renderedLines.length > 0) {
      const currentLine = renderedLines[renderedLines.length - 1];
      if (lineIndex === cursorBufferLine) {
        terminalCursor = {
          line: renderedLines.length - 1,
          column: terminalLineColumns(currentLine) + buffer.cursorX,
        };
      }
      appendTerminalSpans(currentLine.spans, renderedLine.spans);
    } else {
      if (lineIndex === cursorBufferLine) terminalCursor = { line: renderedLines.length, column: buffer.cursorX };
      renderedLines.push(renderedLine);
    }
  }

  let removedLeadingLines = 0;
  while (
    renderedLines[0] &&
    terminalLineText(renderedLines[0]).trim() === "" &&
    terminalCursor?.line !== removedLeadingLines
  ) {
    renderedLines.shift();
    removedLeadingLines += 1;
  }
  if (terminalCursor)
    terminalCursor = {
      ...terminalCursor,
      line: terminalCursor.line - removedLeadingLines,
    };
  while (
    renderedLines.at(-1) &&
    terminalLineText(renderedLines.at(-1)!).trim() === "" &&
    terminalCursor?.line !== renderedLines.length - 1
  ) {
    renderedLines.pop();
  }
  if (terminalCursor && (terminalCursor.line < 0 || terminalCursor.line >= renderedLines.length)) {
    terminalCursor = undefined;
  }
  return {
    output: renderedLines.map(terminalLineText).join("\n"),
    terminalLines: renderedLines,
    terminalCursor,
  };
}

function renderTerminalLine(line: IBufferLine, reusableCell: IBufferCell): InteractiveTerminalLine {
  const spans: InteractiveTerminalSpan[] = [];
  for (let column = 0; column < line.length; column += 1) {
    const cell = line.getCell(column, reusableCell);
    if (!cell || cell.getWidth() === 0) continue;
    const text = cell.isInvisible() ? " ".repeat(cell.getWidth()) : cell.getChars() || " ".repeat(cell.getWidth());
    appendTerminalSpan(spans, {
      text,
      foreground: terminalCellColor(cell, "foreground"),
      background: terminalCellColor(cell, "background"),
      bold: Boolean(cell.isBold()),
      dim: Boolean(cell.isDim()),
      italic: Boolean(cell.isItalic()),
      underline: Boolean(cell.isUnderline()),
      strikethrough: Boolean(cell.isStrikethrough()),
      inverse: Boolean(cell.isInverse()),
    });
  }

  trimInvisibleTrailingSpaces(spans);
  return { spans };
}

function appendTerminalSpans(target: InteractiveTerminalSpan[], source: InteractiveTerminalSpan[]): void {
  for (const span of source) appendTerminalSpan(target, span);
}

function appendTerminalSpan(target: InteractiveTerminalSpan[], span: InteractiveTerminalSpan): void {
  const previous = target.at(-1);
  if (previous && terminalSpanStyleKey(previous) === terminalSpanStyleKey(span)) previous.text += span.text;
  else target.push({ ...span });
}

function terminalSpanStyleKey(span: InteractiveTerminalSpan): string {
  return [
    span.foreground || "",
    span.background || "",
    span.bold ? "1" : "0",
    span.dim ? "1" : "0",
    span.italic ? "1" : "0",
    span.underline ? "1" : "0",
    span.strikethrough ? "1" : "0",
    span.inverse ? "1" : "0",
  ].join(":");
}

function trimInvisibleTrailingSpaces(spans: InteractiveTerminalSpan[]): void {
  while (spans.length > 0) {
    const span = spans.at(-1)!;
    if (span.background || span.inverse || span.underline || span.strikethrough) return;
    span.text = span.text.replace(/\s+$/u, "");
    if (span.text) return;
    spans.pop();
  }
}

function terminalLineText(line: InteractiveTerminalLine): string {
  return line.spans.map((span) => span.text).join("");
}

function terminalLineColumns(line: InteractiveTerminalLine): number {
  return line.spans.reduce((total, span) => total + Array.from(span.text).length, 0);
}

function terminalCellColor(cell: IBufferCell, kind: "foreground" | "background"): string | undefined {
  const isRgb = kind === "foreground" ? cell.isFgRGB() : cell.isBgRGB();
  const isPalette = kind === "foreground" ? cell.isFgPalette() : cell.isBgPalette();
  const color = kind === "foreground" ? cell.getFgColor() : cell.getBgColor();
  if (isRgb) return `#${color.toString(16).padStart(6, "0")}`;
  if (isPalette) return xtermPaletteColor(color);
  return undefined;
}

function xtermPaletteColor(index: number): string {
  const basePalette = [
    "#000000",
    "#cd3131",
    "#0dbc79",
    "#e5e510",
    "#2472c8",
    "#bc3fbc",
    "#11a8cd",
    "#e5e5e5",
    "#666666",
    "#f14c4c",
    "#23d18b",
    "#f5f543",
    "#3b8eea",
    "#d670d6",
    "#29b8db",
    "#ffffff",
  ];
  if (index < basePalette.length) return basePalette[index];
  if (index >= 232) {
    const level = 8 + (index - 232) * 10;
    return rgbHex(level, level, level);
  }
  const colorIndex = index - 16;
  const red = Math.floor(colorIndex / 36);
  const green = Math.floor((colorIndex % 36) / 6);
  const blue = colorIndex % 6;
  const level = (value: number) => (value === 0 ? 0 : 55 + value * 40);
  return rgbHex(level(red), level(green), level(blue));
}

function rgbHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

async function loadRunnerHistory(session: ChatSession, runner: InteractiveRunner): Promise<void> {
  try {
    const transcript = await loadTranscript(session);
    if (runners.get(sessionKey(session)) !== runner) return;
    updateSnapshot(runner, {
      ...runner.snapshot,
      historyOutput: formatTerminalHistory(session, transcript),
      historyMessageCount: transcript.messages.length,
      historyLoading: false,
    });
  } catch {
    if (runners.get(sessionKey(session)) !== runner) return;
    updateSnapshot(runner, { ...runner.snapshot, historyLoading: false });
  }
}

function formatTerminalHistory(session: ChatSession, transcript: Transcript): string {
  if (transcript.messages.length === 0) return "";
  const assistant = session.provider === "codex" ? "Codex" : "Claude";
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const messages = transcript.messages.map((message) => {
    const author = message.role === "user" ? "You" : assistant;
    const timestamp = message.timestamp ? ` · ${dateFormatter.format(new Date(message.timestamp))}` : "";
    return `${author}${timestamp}\n${message.content.trim()}`;
  });
  return [`Full history · ${transcript.messages.length} messages`, "", ...messages, "", "Live session"].join("\n\n");
}

function detectCodexStatus(output: string): { model: string; effort?: string; fastMode: boolean } | undefined {
  const statusLines = output
    .split("\n")
    .filter((line) => /\bgpt-[\w.-]+\b.*·/.test(line))
    .slice(-3);
  if (statusLines.length === 0) return undefined;
  const statusLine = statusLines.at(-1) || "";
  const match = statusLine.match(
    /\b(gpt-[\w.-]+)\b(?:\s+(low|medium|high|xhigh|extra high|max|ultra|default))?(?:\s+(fast))?\s*·/i,
  );
  if (!match) return undefined;
  return {
    model: match[1],
    effort: match[2]?.toLowerCase().replace("extra high", "xhigh").replace("default", "") || undefined,
    fastMode: Boolean(match[3]),
  };
}

async function loadNodePty(): Promise<typeof import("node-pty")> {
  if (!nodePtyPromise) {
    prepareNodePtyNativeFiles();
    nodePtyPromise = import("node-pty");
  }
  return nodePtyPromise;
}

function prepareNodePtyNativeFiles(): void {
  if (process.platform !== "darwin" || (process.arch !== "arm64" && process.arch !== "x64")) {
    throw new Error(`The interactive terminal does not support ${process.platform}-${process.arch}`);
  }

  const platformDirectory = `${process.platform}-${process.arch}`;
  const sourceDirectory = join(environment.assetsPath, "node-pty", platformDirectory);
  const destinationDirectory = join(dirname(environment.assetsPath), "prebuilds", platformDirectory);
  const nativeFiles = [
    { name: "pty.node", mode: 0o644 },
    { name: "spawn-helper", mode: 0o755 },
  ] as const;

  mkdirSync(destinationDirectory, { recursive: true });
  for (const file of nativeFiles) {
    const sourcePath = join(sourceDirectory, file.name);
    if (!existsSync(sourcePath)) throw new Error(`Missing native terminal resource: ${sourcePath}`);
    const destinationPath = join(destinationDirectory, file.name);
    copyFileSync(sourcePath, destinationPath);
    chmodSync(destinationPath, file.mode);
  }
}

function updateSnapshot(runner: InteractiveRunner, snapshot: InteractiveSnapshot): void {
  runner.snapshot = snapshot;
  scheduleNotify(runner);
}

function scheduleTerminalRender(runner: InteractiveRunner, provider: ChatProvider): void {
  if (runner.renderTimer) return;
  const elapsed = Date.now() - runner.lastTerminalRenderAt;
  const delayMilliseconds = Math.max(0, terminalRenderInterval - elapsed);
  runner.renderTimer = setTimeout(() => {
    runner.renderTimer = undefined;
    renderRunnerTerminal(runner, provider);
  }, delayMilliseconds);
}

function flushTerminalRender(runner: InteractiveRunner, provider: ChatProvider): void {
  if (runner.renderTimer) clearTimeout(runner.renderTimer);
  runner.renderTimer = undefined;
  renderRunnerTerminal(runner, provider);
}

function renderRunnerTerminal(runner: InteractiveRunner, provider: ChatProvider): void {
  const { output, terminalLines, terminalCursor } = renderTerminal(runner.terminal);
  const codexStatus = provider === "codex" ? detectCodexStatus(output) : undefined;
  const nextStatus = runner.snapshot.status === "starting" ? "running" : runner.snapshot.status;
  const nextActiveModel = codexStatus?.model || runner.snapshot.activeModel;
  const nextReasoningEffort = codexStatus?.effort || runner.snapshot.reasoningEffort;
  const nextFastMode = provider === "codex" ? (codexStatus?.fastMode ?? runner.snapshot.fastMode) : undefined;
  runner.lastTerminalRenderAt = Date.now();
  if (
    runner.snapshot.status === nextStatus &&
    runner.snapshot.output === output &&
    runner.snapshot.activeModel === nextActiveModel &&
    runner.snapshot.reasoningEffort === nextReasoningEffort &&
    runner.snapshot.fastMode === nextFastMode &&
    terminalCursorMatches(runner.snapshot.terminalCursor, terminalCursor) &&
    terminalLinesMatch(runner.snapshot.terminalLines, terminalLines)
  ) {
    return;
  }
  runner.snapshot = {
    ...runner.snapshot,
    status: nextStatus,
    output,
    terminalLines,
    terminalCursor,
    activeModel: nextActiveModel,
    reasoningEffort: nextReasoningEffort,
    fastMode: nextFastMode,
  };
  scheduleNotify(runner);
}

function terminalCursorMatches(
  current: InteractiveTerminalCursor | undefined,
  next: InteractiveTerminalCursor | undefined,
): boolean {
  return current === next || Boolean(current && next && current.line === next.line && current.column === next.column);
}

function terminalLinesMatch(current: InteractiveTerminalLine[] | undefined, next: InteractiveTerminalLine[]): boolean {
  if (!current || current.length !== next.length) return false;
  for (let lineIndex = 0; lineIndex < current.length; lineIndex += 1) {
    const currentSpans = current[lineIndex].spans;
    const nextSpans = next[lineIndex].spans;
    if (currentSpans.length !== nextSpans.length) return false;
    for (let spanIndex = 0; spanIndex < currentSpans.length; spanIndex += 1) {
      const currentSpan = currentSpans[spanIndex];
      const nextSpan = nextSpans[spanIndex];
      if (currentSpan.text !== nextSpan.text || terminalSpanStyleKey(currentSpan) !== terminalSpanStyleKey(nextSpan)) {
        return false;
      }
    }
  }
  return true;
}

function scheduleNotify(runner: InteractiveRunner): void {
  if (runner.notifyTimer) return;
  runner.notifyTimer = setTimeout(() => {
    runner.notifyTimer = undefined;
    notify(runner);
  }, listenerNotifyInterval);
}

function notify(runner: InteractiveRunner): void {
  for (const listener of runner.listeners) listener({ ...runner.snapshot });
}

function idleSnapshot(session: ChatSession): InteractiveSnapshot {
  ensurePermissionProfilesLoaded();
  const startup = sessionStartupConfiguration(session);
  const selectedPermissionProfile = permissionProfile(
    session.provider,
    permissionProfilesBySession.get(sessionKey(session)),
  );
  return {
    status: "idle",
    command: buildResumeCommand(session, {
      permissionProfileId: selectedPermissionProfile.id,
    }).display,
    output: "",
    sentInputs: 0,
    activeModel: startup.modelId || session.model,
    reasoningEffort: startup.effort,
    fastMode: startup.fastMode,
    historyLoading: false,
    permissionProfileId: selectedPermissionProfile.id,
    permissionProfileTitle: selectedPermissionProfile.title,
  };
}

function ensurePermissionProfilesLoaded(): void {
  if (permissionProfilesLoaded) return;
  permissionProfilesLoaded = true;
  try {
    const stored = JSON.parse(readFileSync(permissionProfileStoragePath, "utf8")) as Record<string, unknown>;
    for (const [key, profileId] of Object.entries(stored)) {
      if (typeof profileId === "string") permissionProfilesBySession.set(key, profileId);
    }
  } catch (error) {
    void error;
  }
}

function persistPermissionProfiles(): void {
  mkdirSync(environment.supportPath, { recursive: true });
  writeFileSync(permissionProfileStoragePath, JSON.stringify(Object.fromEntries(permissionProfilesBySession), null, 2));
}

function registerRunnerCleanup(): void {
  if (cleanupRegistered) return;
  cleanupRegistered = true;
  process.once("exit", () => {
    for (const runner of runners.values()) {
      try {
        if (runner.notifyTimer) clearTimeout(runner.notifyTimer);
        if (runner.renderTimer) clearTimeout(runner.renderTimer);
        runner.child.kill("SIGTERM");
        runner.terminal.dispose();
      } catch (error) {
        void error;
      }
    }
  });
}

function sessionKey(session: ChatSession): string {
  return `${session.provider}:${session.id}`;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
