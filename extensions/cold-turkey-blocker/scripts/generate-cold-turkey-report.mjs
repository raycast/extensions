#!/usr/bin/env node

/**
 * Cold Turkey CLI Report Generator
 *
 * Generates Markdown + JSON reports showing what Cold Turkey CLI commands
 * print to stdout/stderr on this machine.
 *
 * Default mode is read-only:
 *   -help
 *   -list-blocks
 *
 * Optional status snapshots:
 *   -status "Existing Block Name"
 *
 * Optional lab mode uses a harmless website/app test block:
 *   -add-block
 *   -add ... -web
 *   -add ... -exception
 *   -status
 *   -start
 *   -start ... -as-is
 *   -stop
 *   -toggle
 *   -start-delay-break
 *   -stop-delay-break
 *   -stop-random-text-break
 *
 * Optional lab device creation:
 *   -add-device-block "Test Device Block"
 *   -add-device-block "Test Sign Out Device Block" -sign-out
 *   -add-device-block "Test Shut Down Device Block" -shut-down
 *
 * Dangerous actions are never run:
 *   -starting device blocks
 *   -timed locks
 *   -random-text locks
 *   -sign-out actions
 *   -shut-down actions
 *
 * Password lock testing is opt-in and only against the harmless website/app test block.
 *
 * Important:
 *   This report records raw CLI behaviour. It does not infer semantic success/failure
 *   from stdout/stderr because Cold Turkey's command output is undocumented and may
 *   change between versions.
 */

import { spawnSync } from "node:child_process";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const DEFAULT_CT_PATH =
  os.platform() === "win32"
    ? "C:\\Program Files\\Cold Turkey\\Cold Turkey Blocker.exe"
    : "/Applications/Cold Turkey Blocker.app/Contents/MacOS/Cold Turkey Blocker";

const args = process.argv.slice(2);

function hasArg(name) {
  return args.includes(name);
}

function getArgValue(name, fallback = undefined) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function getArgValues(name) {
  const values = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === name && args[i + 1]) {
      values.push(args[i + 1]);
    }
  }

  return values;
}

const CT_PATH =
  process.env.CT_BLOCKER_PATH || getArgValue("--ct-path", DEFAULT_CT_PATH);
const OUT_DIR = path.resolve(
  getArgValue("--out", path.join(process.cwd(), ".cold-turkey-reports")),
);
const RUN_LAB = hasArg("--lab");
const INCLUDE_PASSWORD_LOCK = hasArg("--include-password-lock");
const INCLUDE_DEVICE_BLOCK_CREATION = hasArg("--include-device-blocks");
const STATUS_ALL = hasArg("--status-all");

const TEST_BLOCK = getArgValue("--test-block", "Raycast_Report_Test");
const TEST_PASSWORD = getArgValue("--test-password", "ctreportpass");

const TEST_DEVICE_BLOCK = getArgValue(
  "--test-device-block",
  `${TEST_BLOCK}_Device`,
);
const TEST_SIGNOUT_DEVICE_BLOCK = getArgValue(
  "--test-signout-device-block",
  `${TEST_BLOCK}_SignOut`,
);
const TEST_SHUTDOWN_DEVICE_BLOCK = getArgValue(
  "--test-shutdown-device-block",
  `${TEST_BLOCK}_ShutDown`,
);

function usage() {
  console.log(
    `
Cold Turkey CLI report generator

Read-only report:
  node scripts/generate-cold-turkey-report.mjs

Read-only + status snapshots:
  node scripts/generate-cold-turkey-report.mjs --status-all
  node scripts/generate-cold-turkey-report.mjs --status-block "World Wide Web"

Lab report using harmless website/app test block:
  node scripts/generate-cold-turkey-report.mjs --lab

Lab report including device block creation:
  node scripts/generate-cold-turkey-report.mjs --lab --include-device-blocks

Lab report including password lock/unlock on website/app test block:
  node scripts/generate-cold-turkey-report.mjs --lab --include-password-lock

Full useful lab report:
  node scripts/generate-cold-turkey-report.mjs --lab --include-device-blocks --include-password-lock

Options:
  --ct-path "/custom/path/to/Cold Turkey Blocker"
  --out ./.cold-turkey-reports
  --test-block "Raycast_Report_Test"
  --test-password "ctreportpass"
  --test-device-block "Raycast_Report_Test_Device"
  --test-signout-device-block "Raycast_Report_Test_SignOut"
  --test-shutdown-device-block "Raycast_Report_Test_ShutDown"

Safety:
  This script never starts device blocks, signs out, shuts down, uses timed locks,
  or uses random-text locks.

  Device block creation can be included with:
    --include-device-blocks

  This creates device-block definitions only. It does not start them.

Output:
  A Markdown report for humans/coders.
  A JSON report with exact raw stdout/stderr and hashes.
`.trim(),
  );
}

if (hasArg("--help") || hasArg("-h")) {
  usage();
  process.exit(0);
}

const ESC = String.fromCharCode(27);
const ANSI_ESCAPE_PATTERN = new RegExp(
  `${ESC}(?:[@-Z\\\\-_]|\\[[0-?]*[ -/]*[@-~])`,
  "g",
);

function stripAnsi(text) {
  return String(text || "").replace(ANSI_ESCAPE_PATTERN, "");
}

function decodeBuffer(buffer) {
  if (!buffer || buffer.length === 0) return "";

  const nulCount = [...buffer].filter((byte) => byte === 0).length;
  const likelyUtf16 = nulCount > buffer.length * 0.15;

  return likelyUtf16
    ? buffer.toString("utf16le").replace(/^\uFEFF/, "")
    : buffer.toString("utf8").replace(/^\uFEFF/, "");
}

function sha256(text) {
  return crypto
    .createHash("sha256")
    .update(text || "", "utf8")
    .digest("hex");
}

function quoteArg(arg) {
  if (/^[A-Za-z0-9._:/\\=-]+$/.test(arg)) return arg;
  return JSON.stringify(arg);
}

function displayCommand(argv) {
  return [quoteArg(CT_PATH), ...argv.map(quoteArg)].join(" ");
}

function isDeviceTestBlockName(blockName) {
  return (
    blockName === TEST_DEVICE_BLOCK ||
    blockName === TEST_SIGNOUT_DEVICE_BLOCK ||
    blockName === TEST_SHUTDOWN_DEVICE_BLOCK
  );
}

function assertDeviceBlockCreationIsSafe(argv) {
  if (!INCLUDE_DEVICE_BLOCK_CREATION) {
    throw new Error(
      `Refusing to create device block without --include-device-blocks: ${argv.join(" ")}`,
    );
  }

  const blockName = argv[1];
  const variant = argv[2] || "lock-screen";

  if (argv.length !== 2 && argv.length !== 3) {
    throw new Error(`Unexpected device-block command shape: ${argv.join(" ")}`);
  }

  if (variant === "lock-screen" && blockName !== TEST_DEVICE_BLOCK) {
    throw new Error(
      `Default device block creation is only allowed for "${TEST_DEVICE_BLOCK}".`,
    );
  }

  if (variant === "-sign-out" && blockName !== TEST_SIGNOUT_DEVICE_BLOCK) {
    throw new Error(
      `Sign-out device block creation is only allowed for "${TEST_SIGNOUT_DEVICE_BLOCK}".`,
    );
  }

  if (variant === "-shut-down" && blockName !== TEST_SHUTDOWN_DEVICE_BLOCK) {
    throw new Error(
      `Shut-down device block creation is only allowed for "${TEST_SHUTDOWN_DEVICE_BLOCK}".`,
    );
  }

  if (!["lock-screen", "-sign-out", "-shut-down"].includes(variant)) {
    throw new Error(`Unexpected device-block variant: ${variant}`);
  }
}

function assertAddCommandIsSafe(argv) {
  const [, blockName, addType, value] = argv;

  if (argv.length !== 4) {
    throw new Error(`Unexpected -add command shape: ${argv.join(" ")}`);
  }

  if (blockName !== TEST_BLOCK) {
    throw new Error(
      `-add may only modify the test website/app block "${TEST_BLOCK}".`,
    );
  }

  if (addType !== "-web" && addType !== "-exception") {
    throw new Error(`Unexpected -add subtype: ${addType}`);
  }

  if (!value || typeof value !== "string") {
    throw new Error(`Missing value for ${addType}.`);
  }
}

function assertWebsiteBlockCommandIsSafe(argv) {
  const base = argv[0];
  const blockName = argv[1];

  if (blockName !== TEST_BLOCK) {
    throw new Error(
      `${base} may only target the test website/app block "${TEST_BLOCK}".`,
    );
  }

  if (isDeviceTestBlockName(blockName)) {
    throw new Error(`Refusing to ${base} device block: ${blockName}`);
  }

  if (argv.includes("-lock")) {
    throw new Error(`Refusing to run timed lock command: ${argv.join(" ")}`);
  }

  if (argv.includes("-random-text")) {
    throw new Error(
      `Refusing to run random-text lock command: ${argv.join(" ")}`,
    );
  }

  if (argv.includes("-sign-out") || argv.includes("-shut-down")) {
    throw new Error(`Refusing sign-out/shut-down action: ${argv.join(" ")}`);
  }

  if (argv.includes("-password")) {
    if (!INCLUDE_PASSWORD_LOCK) {
      throw new Error(
        `Refusing to run password lock command without --include-password-lock`,
      );
    }

    if (blockName !== TEST_BLOCK) {
      throw new Error(
        `Password lock testing is only allowed on the test block "${TEST_BLOCK}"`,
      );
    }

    if (!/^[A-Za-z0-9_-]+$/.test(TEST_PASSWORD)) {
      throw new Error(
        "Test password must contain only letters, numbers, underscores, or hyphens.",
      );
    }

    const passwordIndex = argv.indexOf("-password");

    if (passwordIndex === -1 || argv[passwordIndex + 1] !== TEST_PASSWORD) {
      throw new Error(
        "Password command must use the configured test password.",
      );
    }
  }

  const allowedShapes = [
    ["-start", TEST_BLOCK],
    ["-start", TEST_BLOCK, "-as-is"],
    ["-start", TEST_BLOCK, "-password", TEST_PASSWORD],
    ["-stop", TEST_BLOCK],
    ["-stop", TEST_BLOCK, "-password", TEST_PASSWORD],
    ["-toggle", TEST_BLOCK],
    ["-start-delay-break", TEST_BLOCK],
    ["-stop-delay-break", TEST_BLOCK],
    ["-stop-random-text-break", TEST_BLOCK],
  ];

  const matchesAllowedShape = allowedShapes.some(
    (shape) =>
      shape.length === argv.length &&
      shape.every((value, index) => value === argv[index]),
  );

  if (!matchesAllowedShape) {
    throw new Error(
      `Unexpected website/app lab command shape: ${argv.join(" ")}`,
    );
  }
}

function assertSafeToRun(argv) {
  const base = argv[0];

  const alwaysSafe = new Set(["-help", "-list-blocks", "-status"]);

  const labSafe = new Set([
    "-add-block",
    "-add",
    "-add-device-block",
    "-start",
    "-stop",
    "-toggle",
    "-start-delay-break",
    "-stop-delay-break",
    "-stop-random-text-break",
  ]);

  if (alwaysSafe.has(base)) return;

  if (!RUN_LAB) {
    throw new Error(
      `Refusing to run non-read-only command outside --lab mode: ${argv.join(" ")}`,
    );
  }

  if (!labSafe.has(base)) {
    throw new Error(
      `Refusing to run unsupported lab command: ${argv.join(" ")}`,
    );
  }

  if (base === "-add-device-block") {
    assertDeviceBlockCreationIsSafe(argv);
    return;
  }

  if (base === "-add") {
    assertAddCommandIsSafe(argv);
    return;
  }

  if (base === "-add-block") {
    if (argv.length !== 2 || argv[1] !== TEST_BLOCK) {
      throw new Error(
        `-add-block may only create the test website/app block "${TEST_BLOCK}".`,
      );
    }

    return;
  }

  assertWebsiteBlockCommandIsSafe(argv);
}

function runColdTurkey(argv) {
  assertSafeToRun(argv);

  const startedAt = new Date();
  const startNs = process.hrtime.bigint();

  const result = spawnSync(CT_PATH, argv, {
    timeout: 10000,
    windowsHide: true,
    encoding: "buffer",
    env: {
      ...process.env,
      NO_COLOR: "1",
      CLICOLOR: "0",
      FORCE_COLOR: "0",
      TERM: "dumb",
    },
  });

  const endNs = process.hrtime.bigint();

  const stdoutRaw = decodeBuffer(result.stdout);
  const stderrRaw = decodeBuffer(result.stderr);
  const stdoutClean = stripAnsi(stdoutRaw);
  const stderrClean = stripAnsi(stderrRaw);

  return {
    argv,
    displayCommand: displayCommand(argv),
    startedAt: startedAt.toISOString(),
    durationMs: Number(endNs - startNs) / 1_000_000,
    launched: !result.error,
    exitCode: result.status,
    signal: result.signal,
    spawnError: result.error ? result.error.message : "",
    stdoutRaw,
    stderrRaw,
    stdoutClean,
    stderrClean,
    stdoutHash: sha256(stdoutRaw),
    stderrHash: sha256(stderrRaw),
    combinedHash: sha256(`${stdoutRaw}\n${stderrRaw}`),
  };
}

function parseBlockListFromRawOutput(text) {
  const clean = stripAnsi(text).replace(/\r\n/g, "\n");
  const blocks = [];

  let section = null;

  for (const rawLine of clean.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line === "Website & App Blocks" || line === "Device Blocks") {
      section = line;
      continue;
    }

    if (section) {
      blocks.push({ section, name: line });
    }
  }

  return blocks;
}

function parseHelpSignatures(text) {
  const clean = stripAnsi(text).replace(/\r\n/g, "\n");

  return Array.from(
    new Set(
      clean
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => /^-[A-Za-z0-9-]+(?:\s|$)/.test(line))
        .map((line) => line.replace(/[ \t]+/g, " ")),
    ),
  ).sort();
}

function addSkipped(skipped, command, reason) {
  skipped.push({
    command,
    reason,
  });
}

function generateReport() {
  const commands = [];
  const skipped = [];

  const help = runColdTurkey(["-help"]);
  commands.push(help);

  const list = runColdTurkey(["-list-blocks"]);
  commands.push(list);

  const helpSignatures = parseHelpSignatures(help.stdoutRaw);
  const parsedBlocks = parseBlockListFromRawOutput(list.stdoutRaw);

  const explicitStatusBlocks = getArgValues("--status-block");

  if (STATUS_ALL) {
    for (const block of parsedBlocks) {
      commands.push(runColdTurkey(["-status", block.name]));
    }
  }

  for (const blockName of explicitStatusBlocks) {
    commands.push(runColdTurkey(["-status", blockName]));
  }

  if (RUN_LAB) {
    commands.push(runColdTurkey(["-add-block", TEST_BLOCK]));
    commands.push(runColdTurkey(["-add", TEST_BLOCK, "-web", "example.com"]));
    commands.push(
      runColdTurkey(["-add", TEST_BLOCK, "-exception", "example.com/safe"]),
    );
    commands.push(runColdTurkey(["-status", TEST_BLOCK]));

    if (INCLUDE_DEVICE_BLOCK_CREATION) {
      commands.push(runColdTurkey(["-add-device-block", TEST_DEVICE_BLOCK]));
      commands.push(
        runColdTurkey([
          "-add-device-block",
          TEST_SIGNOUT_DEVICE_BLOCK,
          "-sign-out",
        ]),
      );
      commands.push(
        runColdTurkey([
          "-add-device-block",
          TEST_SHUTDOWN_DEVICE_BLOCK,
          "-shut-down",
        ]),
      );

      commands.push(runColdTurkey(["-list-blocks"]));

      commands.push(runColdTurkey(["-status", TEST_DEVICE_BLOCK]));
      commands.push(runColdTurkey(["-status", TEST_SIGNOUT_DEVICE_BLOCK]));
      commands.push(runColdTurkey(["-status", TEST_SHUTDOWN_DEVICE_BLOCK]));
    }

    commands.push(runColdTurkey(["-start", TEST_BLOCK]));
    commands.push(runColdTurkey(["-status", TEST_BLOCK]));
    commands.push(runColdTurkey(["-stop", TEST_BLOCK]));
    commands.push(runColdTurkey(["-status", TEST_BLOCK]));

    commands.push(runColdTurkey(["-start", TEST_BLOCK, "-as-is"]));
    commands.push(runColdTurkey(["-status", TEST_BLOCK]));
    commands.push(runColdTurkey(["-stop", TEST_BLOCK]));
    commands.push(runColdTurkey(["-status", TEST_BLOCK]));

    commands.push(runColdTurkey(["-toggle", TEST_BLOCK]));
    commands.push(runColdTurkey(["-status", TEST_BLOCK]));
    commands.push(runColdTurkey(["-toggle", TEST_BLOCK]));
    commands.push(runColdTurkey(["-status", TEST_BLOCK]));

    commands.push(runColdTurkey(["-start-delay-break", TEST_BLOCK]));
    commands.push(runColdTurkey(["-stop-delay-break", TEST_BLOCK]));
    commands.push(runColdTurkey(["-stop-random-text-break", TEST_BLOCK]));

    if (INCLUDE_PASSWORD_LOCK) {
      commands.push(
        runColdTurkey(["-start", TEST_BLOCK, "-password", TEST_PASSWORD]),
      );
      commands.push(runColdTurkey(["-status", TEST_BLOCK]));
      commands.push(
        runColdTurkey(["-stop", TEST_BLOCK, "-password", TEST_PASSWORD]),
      );
      commands.push(runColdTurkey(["-status", TEST_BLOCK]));

      // Safety cleanup attempt, recorded in report.
      commands.push(
        runColdTurkey(["-stop", TEST_BLOCK, "-password", TEST_PASSWORD]),
      );
    }
  }

  addSkipped(
    skipped,
    `-start "${TEST_BLOCK}" -lock 1`,
    "Skipped: timed lock can leave the test block locked if behaviour changes.",
  );

  addSkipped(
    skipped,
    `-start "${TEST_BLOCK}" -random-text 5`,
    "Skipped: random-text lock is intentionally not automated.",
  );

  if (!INCLUDE_DEVICE_BLOCK_CREATION) {
    addSkipped(
      skipped,
      `-add-device-block "Block Name"`,
      "Skipped by default. Use --include-device-blocks to create harmless test device block definitions.",
    );

    addSkipped(
      skipped,
      `-add-device-block "Block Name" -sign-out`,
      "Skipped by default. Use --include-device-blocks to create, but not start, a sign-out test device block.",
    );

    addSkipped(
      skipped,
      `-add-device-block "Block Name" -shut-down`,
      "Skipped by default. Use --include-device-blocks to create, but not start, a shut-down test device block.",
    );
  }

  addSkipped(
    skipped,
    `-start "Device Block"`,
    "Skipped: starting a device block can enable a lock screen, sign out, or shut down depending on the block type/settings.",
  );

  addSkipped(
    skipped,
    `-start "Device Block" -lock X`,
    "Skipped: starting a device block with -lock can immediately lock, sign out, or shut down the machine depending on block settings.",
  );

  addSkipped(
    skipped,
    `-start "Block Name" -random-text X`,
    "Skipped: random-text locks are intentionally not automated.",
  );

  return {
    generatedAt: new Date().toISOString(),
    platform: os.platform(),
    arch: os.arch(),
    node: process.version,
    executable: CT_PATH,
    mode: {
      readOnlyDefault: !RUN_LAB,
      lab: RUN_LAB,
      passwordLockIncluded: INCLUDE_PASSWORD_LOCK,
      deviceBlockCreationIncluded: INCLUDE_DEVICE_BLOCK_CREATION,
      statusAll: STATUS_ALL,
      explicitStatusBlocks,
      testWebsiteAppBlock: TEST_BLOCK,
      testDeviceBlock: TEST_DEVICE_BLOCK,
      testSignOutDeviceBlock: TEST_SIGNOUT_DEVICE_BLOCK,
      testShutdownDeviceBlock: TEST_SHUTDOWN_DEVICE_BLOCK,
    },
    safetyNote:
      "This report records raw CLI behaviour. It does not infer semantic success/failure from stdout/stderr.",
    helpSignatures,
    parsedBlocks,
    commands,
    skipped,
  };
}

function renderMarkdown(report) {
  const lines = [];

  lines.push("# Cold Turkey CLI Behaviour Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Platform: ${report.platform} ${report.arch}`);
  lines.push(`Node: ${report.node}`);
  lines.push(`Executable: \`${report.executable}\``);
  lines.push("");
  lines.push("## Safety model");
  lines.push("");
  lines.push("- This report records raw CLI behaviour.");
  lines.push("- It does not interpret stdout/stderr as success or failure.");
  lines.push("- Default mode is read-only.");
  lines.push("- Lab mode modifies only a harmless website/app test block.");
  lines.push(
    "- Device block creation is optional and safe because created device blocks are never started.",
  );
  lines.push(
    "- Device block starts, timed locks, random-text locks, sign-out actions, and shut-down actions are never executed.",
  );
  lines.push("");
  lines.push("## Mode");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(report.mode, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Command signatures parsed from `-help`");
  lines.push("");

  if (report.helpSignatures.length === 0) {
    lines.push(
      "_No command signatures parsed. Check raw `-help` output below._",
    );
  } else {
    for (const signature of report.helpSignatures) {
      lines.push(`- \`${signature}\``);
    }
  }

  lines.push("");
  lines.push("## Parsed blocks from `-list-blocks`");
  lines.push("");

  if (report.parsedBlocks.length === 0) {
    lines.push("_No blocks parsed. See raw `-list-blocks` output below._");
  } else {
    for (const block of report.parsedBlocks) {
      lines.push(`- ${block.section}: \`${block.name}\``);
    }
  }

  lines.push("");
  lines.push("## Executed command snapshots");
  lines.push("");

  for (const item of report.commands) {
    lines.push(`### \`${item.displayCommand}\``);
    lines.push("");
    lines.push(`- launched: \`${item.launched}\``);
    lines.push(`- exitCode: \`${item.exitCode}\``);
    lines.push(`- signal: \`${item.signal}\``);
    lines.push(`- durationMs: \`${item.durationMs.toFixed(1)}\``);
    lines.push(`- stdoutHash: \`${item.stdoutHash}\``);
    lines.push(`- stderrHash: \`${item.stderrHash}\``);
    lines.push(`- combinedHash: \`${item.combinedHash}\``);

    if (item.spawnError) {
      lines.push(`- spawnError: \`${item.spawnError}\``);
    }

    lines.push("");
    lines.push("stdout:");
    lines.push("");
    lines.push("```text");
    lines.push(item.stdoutClean.trim() || "(empty)");
    lines.push("```");
    lines.push("");
    lines.push("stderr:");
    lines.push("");
    lines.push("```text");
    lines.push(item.stderrClean.trim() || "(empty)");
    lines.push("```");
    lines.push("");
  }

  lines.push("## Commands intentionally not executed");
  lines.push("");

  for (const item of report.skipped) {
    lines.push(`- \`${item.command}\` â€” ${item.reason}`);
  }

  lines.push("");

  return lines.join("\n");
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const baseName = `cold-turkey-cli-report-${timestamp}`;

const report = generateReport();

const jsonPath = path.join(OUT_DIR, `${baseName}.json`);
const mdPath = path.join(OUT_DIR, `${baseName}.md`);

fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n");
fs.writeFileSync(mdPath, renderMarkdown(report) + "\n");

console.log(`Wrote Markdown report: ${mdPath}`);
console.log(`Wrote JSON report:     ${jsonPath}`);
console.log("");
console.log(
  "Share the Markdown report with whoever is implementing against the CLI.",
);
console.log("Keep the JSON report for exact raw stdout/stderr and hashes.");
