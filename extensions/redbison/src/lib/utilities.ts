/**
 * The offline utilities, wired to the CLI's own code.
 *
 * Nothing here implements a tool. The list is the CLI catalogue, the options
 * and their checks are the CLI's, and the answer comes from runLocal, the
 * function the redbison CLI and the VS Code and IntelliJ plugins call. This
 * file only decides which tools a text selection can feed and turns form
 * values into the options the CLI would have parsed. Kept free of
 * @raycast/api so the tests can run it directly.
 */
import { TOOLS, GROUP_ORDER, type CliTool } from "../vendor/cli/src/catalog";
import { optionsFor, type ToolOption } from "../vendor/cli/src/options";
import { coerce, missingRequired, ArgError } from "../vendor/cli/src/args";
import { BINARY_TOOLS } from "../vendor/cli/src/binary";
import { EXAMPLES } from "../vendor/cli/src/examples";
import { runLocal, LocalToolError } from "../vendor/ide/vscode/src/local";

export type { ToolOption };
export type OptionValue = string | number | boolean;
export type Options = Record<string, OptionValue>;

export type Utility = CliTool & {
  /** The group name as shown, in US English. */
  section: string;
  /** The tool takes no input: a generator such as UUID or password. */
  generates: boolean;
  options: ToolOption[];
  /** Options the tool cannot run without. */
  required: ToolOption[];
};

export class UtilityError extends Error {}

/**
 * Raycast's store asks for US English. The CLI catalogue is written in
 * British English ("colour"), so the labels are respelled for display only;
 * ids, options and answers are untouched.
 */
export function usEnglish(text: string): string {
  return text
    .replace(/\bcolour/g, "color")
    .replace(/\bColour/g, "Color")
    .replace(/\bbehaviour/g, "behavior")
    .replace(/\bcentre\b/g, "center");
}

/** "Data and JSON" -> "Data and JSON", "Encoding and hashing" -> "Encoding and Hashing". */
function titleCase(group: string): string {
  const small = new Set(["and", "or", "of", "the", "to"]);
  return usEnglish(group)
    .split(" ")
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/**
 * Every tool the CLI answers on the machine and a text selection can feed:
 * offline in the catalogue (the flag the CLI itself routes on before calling
 * runLocal) and not one of the file-based inspectors (Parquet, SQLite,
 * pcap...) that read bytes. Tools that call redbison.dev are left out
 * entirely rather than shown and refused. LOCAL_IDS in local.ts is not the
 * test: it predates the second wave and lists 73 of the 97.
 */
export const UTILITIES: Utility[] = TOOLS.filter((t) => t.offline && !BINARY_TOOLS.has(t.id))
  .map((t) => {
    const options = optionsFor(t.id);
    return {
      ...t,
      title: usEnglish(t.title),
      summary: usEnglish(t.summary),
      section: titleCase(t.group),
      generates: t.kind === "insert",
      options,
      required: options.filter((o) => o.required),
    };
  })
  .sort((a, b) => {
    const g =
      GROUP_ORDER.indexOf(a.group as (typeof GROUP_ORDER)[number]) -
      GROUP_ORDER.indexOf(b.group as (typeof GROUP_ORDER)[number]);
    return g !== 0 ? g : a.title.localeCompare(b.title);
  });

export const SECTIONS: string[] = [...new Set(UTILITIES.map((u) => u.section))];

export function utility(id: string): Utility | undefined {
  return UTILITIES.find((u) => u.id === id);
}

/** The CLI's recorded example for a tool: a real input and the answer it gave. */
export function exampleFor(id: string): { input: string; options: Options } | undefined {
  const ex = EXAMPLES[id];
  if (!ex) return undefined;
  return { input: ex.input, options: ex.args as Options };
}

/** A label for an option, from its flag and description: "algorithm" -> "Algorithm". */
export function optionLabel(o: ToolOption): string {
  const words = o.key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

/**
 * Form values as the options the CLI would have parsed.
 *
 * A form gives strings and booleans; the CLI's coerce() turns a typed value
 * into the option's type and refuses what the command line would refuse, so
 * `--length abc` and a length field holding "abc" fail with the same message.
 * Empty fields are left out, so the tool applies its own default.
 */
export function optionsFromForm(id: string, values: Record<string, unknown>): Options {
  const out: Options = {};
  for (const o of optionsFor(id)) {
    const v = values[o.key];
    if (v === undefined || v === null) continue;
    if (typeof v === "boolean") {
      if (o.type === "boolean") out[o.key] = v;
      continue;
    }
    const raw = String(v);
    if (!raw.trim() && !o.isText) continue;
    if (!raw && o.isText) continue;
    try {
      out[o.key] = coerce(o, o.type === "number" ? raw.trim() : raw);
    } catch (e) {
      if (e instanceof ArgError) throw new UtilityError(`${optionLabel(o)}: ${stripFlags(e.message)}`);
      throw e;
    }
  }
  return out;
}

/** The CLI's messages name flags (--length); a form names fields. */
function stripFlags(message: string): string {
  return message.replace(/^--[\w-]+ /, "");
}

/**
 * Run one utility on text, on this machine.
 *
 * Refuses anything that is not in UTILITIES, so a tool that needs the network
 * can never be reached through here, and reports a refusal of the input as a
 * UtilityError the view can show as a message rather than a crash.
 */
export function runUtility(id: string, input: string, options: Options = {}): string {
  const u = utility(id);
  if (!u) throw new UtilityError(`${id} is not an offline RedBison utility.`);

  const missing = missingRequired(id, options);
  if (missing.length) {
    const names = missing.map((o) => `${optionLabel(o)} (${o.describe})`).join(", ");
    throw new UtilityError(`${u.title} needs ${names}. Use Run with Options to fill it in.`);
  }

  // Input goes through as given, as the CLI passes it: empty input is the
  // tool's own call (several refuse it with a message of their own), and the
  // views decide what a generator is fed.
  let out: string | undefined;
  try {
    out = runLocal(id, input, options);
  } catch (e) {
    if (e instanceof LocalToolError) throw new UtilityError(e.message);
    throw new UtilityError(e instanceof Error ? e.message : String(e));
  }
  if (out === undefined) throw new UtilityError(`${id} has no offline implementation. Please report this.`);
  return out;
}

/**
 * The same run as a terminal command, for people who want it in a script.
 *
 * A switch is written `--flag=true` or `--flag=false`: the CLI never lets a
 * boolean take the next word (cli/src/args.ts), so `--markCase false` read as
 * markCase on with "false" as the input. test/review-fixes.test.ts parses
 * every copied command back with the CLI's own parseArgs.
 */
export function cliCommand(id: string, options: Options = {}): string {
  const parts = ["redbison", id];
  for (const [k, v] of Object.entries(options)) {
    if (v === undefined || v === "") continue;
    if (typeof v === "boolean") parts.push(`--${k}=${v}`);
    else parts.push(`--${k}`, shellQuote(String(v)));
  }
  return parts.join(" ");
}

/** Results that are secrets, copied without entering Clipboard History. */
const SECRET_RESULTS = new Set(["password"]);

/** Options whose value is a secret, so a command carrying one is concealed too. */
const SECRET_OPTIONS: Record<string, string[]> = { hmac: ["key"] };

export function concealResult(id: string): boolean {
  return SECRET_RESULTS.has(id);
}

export function concealCommand(id: string, options: Options = {}): boolean {
  return (SECRET_OPTIONS[id] ?? []).some((k) => options[k] !== undefined && options[k] !== "");
}

/** An option's description as a form shows it: US English, capitalized. */
export function optionInfo(o: ToolOption): string {
  const text = usEnglish(o.describe);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The hint inside an empty field: its default (a value, never respelled), or its description. */
export function optionPlaceholder(o: ToolOption): string {
  return o.defaultValue !== undefined ? `Default: ${o.defaultValue}` : optionInfo(o);
}

/** A dropdown choice: "url: - and _, unpadded, safe in a URL", or the bare value. */
export function choiceTitle(v: { value: string; describe?: string }): string {
  return v.describe ? `${v.value}: ${usEnglish(v.describe)}` : v.value;
}

export function shellQuote(value: string): string {
  if (/^[\w@%+=:,./-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** A Markdown code fence that the text itself cannot close. */
export function codeBlock(text: string, language = ""): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((m) => m.length));
  const fence = "`".repeat(Math.max(3, longest + 1));
  return `${fence}${language}\n${text}\n${fence}`;
}

/** A syntax hint for the result, where the answer is plainly one language. */
export function languageFor(id: string, output: string): string {
  const t = output.trimStart();
  if ((t.startsWith("{") || t.startsWith("[")) && isJson(t)) return "json";
  if (id === "yaml-beautify" || id === "json-to-yaml") return "yaml";
  if (id === "xml-beautify") return "xml";
  if (id === "html-beautify") return "html";
  if (id === "sql-beautify") return "sql";
  if (id === "css-gradient") return "css";
  return "";
}

function isJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}
