const SECTION_NAMES = ["weekly", "monthly", "projects", "repositories", "models", "tools", "activity", "sources", "providers", "costs", "insights", "skills", "agents"];
const VALUE_OPTIONS = new Map([["--from", "from"], ["--to", "to"], ["--top", "top"], ["--agent", "agent"]]);
const SWITCH_OPTIONS = new Map([["--global", ["global", true]], ["--json", ["json", true]], ["--no-cache", ["cache", false]], ["--clear-cache", ["clearCache", true]]]);

export function usage() {
  console.error(`Usage: codex-report [--agent codex|claude|all] [--json] [--global] [--from YYYY-MM-DD|null] [--to YYYY-MM-DD] [--top 10] [--no-cache] [--clear-cache] ${SECTION_NAMES.map((s) => `--${s}`).join(" ")}`);
}

function assignValue(args, option, value) {
  if (!value || value.startsWith("--")) throw new Error(`${option} requires a value`);
  const key = VALUE_OPTIONS.get(option);
  args[key] = key === "top" ? Number(value) : value;
}

function processSwitch(args, option) {
  if (SWITCH_OPTIONS.has(option)) {
    const [key, value] = SWITCH_OPTIONS.get(option);
    args[key] = value;
    return;
  }
  if (option === "--help" || option === "-h") { args.help = true; return; }
  const section = option.slice(2);
  if (!option.startsWith("--") || !SECTION_NAMES.includes(section)) throw new Error(`Unknown argument: ${option}`);
  if (!args.sections.includes(section)) args.sections.push(section);
}

export function parseArgs(argv) {
  const args = { agent: "codex", from: null, to: null, global: false, json: false, top: 10, cache: true, clearCache: false, sections: [] };
  for (let index = 0; index < argv.length; index++) {
    const option = argv[index];
    if (VALUE_OPTIONS.has(option)) assignValue(args, option, argv[++index]);
    else processSwitch(args, option);
  }
  if (!Number.isInteger(args.top) || args.top < 1) throw new Error("--top must be a positive integer");
  return args;
}
