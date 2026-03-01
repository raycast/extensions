import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const required = [
  "init",
  "info",
  "balance",
  "receive",
  "send",
  "payments",
  "payment",
  "paylink",
  "withdraw",
  "onchain",
  "fetch",
];

const args = process.argv.slice(2);
const strictManifest = args.includes("--strict-manifest");
const simulateMissingFieldIndex = args.indexOf("--simulate-missing-field");
const simulateMismatchIndex = args.indexOf("--simulate-command-mismatch");

const packageJsonPath = resolve(process.cwd(), "package.json");
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const commandNames = Array.isArray(packageJson.commands)
  ? packageJson.commands.map((command) => command?.name).filter((name) => typeof name === "string")
  : [];

let ok = true;

if (simulateMissingFieldIndex >= 0) {
  const field = args[simulateMissingFieldIndex + 1] ?? "unknown_field";
  console.error(`contract failure: simulated missing required field '${field}'`);
  process.exit(1);
}

if (simulateMismatchIndex >= 0) {
  const command = args[simulateMismatchIndex + 1] ?? "unknown";
  console.error(`contract failure: simulated command mismatch '${command}'`);
  process.exit(1);
}

for (const name of required) {
  if (!commandNames.includes(name)) {
    console.error(`contract failure: missing top-level command '${name}' in manifest`);
    ok = false;
  }
}

if (strictManifest) {
  for (const name of commandNames) {
    if (!required.includes(name)) {
      console.error(`contract failure: unexpected manifest command '${name}'`);
      ok = false;
    }
  }
}

if (!ok) {
  process.exit(1);
}

process.stdout.write(
  JSON.stringify(
    {
      status: "ok",
      required_count: required.length,
      found_count: commandNames.length,
      mapped_commands: commandNames,
    },
    null,
    2,
  ) + "\n",
);
