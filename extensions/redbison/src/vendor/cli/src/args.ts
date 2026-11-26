/**
 * Argument parsing, kept apart from everything it feeds so it can be tested
 * without a process.
 *
 * The shape is `redbison <tool> [options] [input]`. Options come from the
 * shared spec, so the parser knows which flags a tool takes and can say
 * "hash takes --algorithm and --encoding" rather than ignoring a typo and
 * quietly hashing with the default, which is the failure that matters here:
 * a wrong digest looks exactly like a right one.
 */
import { optionsFor, type ToolOption } from './options';

export class ArgError extends Error {}

export type Parsed = {
  tool?: string;
  options: Record<string, string | number | boolean>;
  /** Positional text, if any was given on the command line. */
  input?: string;
  /** A file to read the input from, from --file or a leading @path. */
  file?: string;
  help: boolean;
  version: boolean;
  list: boolean;
  json: boolean;
  /** Refuse to reach the network; fail instead of calling the server. */
  offline: boolean;
  /** Ask for the full-screen picker, or refuse it. */
  ui: boolean;
  noUi: boolean;
  /** Which palette the picker should wear: terminal, default or none. */
  theme?: string;
  /** `--search <words>`: find tools by what they do rather than by name. */
  search?: string;
};

const GLOBAL_FLAGS = ['help', 'version', 'list', 'json', 'offline', 'ui'];

/** The palettes --theme accepts, which are the ones colourLevel knows. */
export const THEMES = ['terminal', 'ansi', 'shell', 'default', 'none', 'mono', 'plain'];

/** Levenshtein, small and good enough to suggest a flag the user meant. */
function near(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1)
    for (let j = 1; j <= b.length; j += 1)
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return d[a.length][b.length];
}

function suggest(given: string, candidates: string[]): string {
  const best = candidates
    .map((c) => ({ c, d: near(given.toLowerCase(), c.toLowerCase()) }))
    .sort((x, y) => x.d - y.d)[0];
  return best && best.d <= 3 ? ` Did you mean --${best.c}?` : '';
}

/**
 * A written value turned into the type the option takes, or refused.
 *
 * Exported because the interactive picker edits options too, and the two have
 * to refuse the same values: a `--variant xyz` that the command line rejects
 * and the TUI accepts would be a second, quieter way to get a wrong answer.
 */
export function coerce(opt: ToolOption, raw: string): string | number | boolean {
  if (opt.type === 'boolean') {
    if (['true', 'yes', '1', 'on'].includes(raw.toLowerCase())) return true;
    if (['false', 'no', '0', 'off'].includes(raw.toLowerCase())) return false;
    throw new ArgError(`--${opt.key} takes true or false, not ${JSON.stringify(raw)}.`);
  }
  if (opt.type === 'number') {
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new ArgError(`--${opt.key} takes a number, not ${JSON.stringify(raw)}.`);
    return n;
  }
  if (opt.values && !opt.values.some((v) => v.value === raw)) {
    const allowed = opt.values.map((v) => v.value).join(', ');
    throw new ArgError(`--${opt.key} takes one of: ${allowed}. Got ${JSON.stringify(raw)}.`);
  }
  return raw;
}

export function parseArgs(argv: string[]): Parsed {
  const out: Parsed = {
    options: {},
    help: false,
    version: false,
    list: false,
    json: false,
    offline: false,
    ui: false,
    noUi: false,
  };
  const rest: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];

    if (a === '--') {
      // Everything after -- is input, never a flag. It is how you pass text
      // that starts with a hyphen.
      rest.push(...argv.slice(i + 1));
      break;
    }

    if (a === '-h') { out.help = true; continue; }
    if (a === '-v') { out.version = true; continue; }

    if (a.startsWith('--')) {
      const [name, inline] = a.slice(2).split(/=(.*)/s);

      // Turning the picker off has to work before a tool is named, since the
      // picker is what runs when no tool is named at all.
      if (name === 'no-ui' || name === 'no-tui') {
        out.noUi = true;
        continue;
      }
      if (name === 'tui') {
        out.ui = true;
        continue;
      }

      if (name.startsWith('no-') && out.tool) {
        const bare = name.slice(3);
        const neg = optionsFor(out.tool).find((o) => o.key === bare && o.type === 'boolean');
        if (neg) {
          out.options[bare] = false;
          continue;
        }
      }

      if (GLOBAL_FLAGS.includes(name)) {
        (out as unknown as Record<string, boolean>)[name] = true;
        continue;
      }

      if (name === 'search' || name === 'find') {
        out.search = inline ?? argv[++i];
        if (!out.search) throw new ArgError('--search needs something to search for.');
        continue;
      }

      if (name === 'theme') {
        const value = inline ?? argv[++i];
        if (!value) throw new ArgError('--theme takes terminal, default or none.');
        // Checked here rather than swallowed downstream: an unrecognised
        // value used to be forwarded and quietly ignored, so --theme termnial
        // looked like it worked and changed nothing.
        if (!THEMES.includes(value.toLowerCase())) {
          throw new ArgError(`--theme takes one of: ${THEMES.join(', ')}. Got ${JSON.stringify(value)}.`);
        }
        out.theme = value.toLowerCase();
        continue;
      }

      if (name === 'file') {
        out.file = inline ?? argv[++i];
        if (!out.file) throw new ArgError('--file needs a path.');
        continue;
      }

      if (!out.tool) {
        throw new ArgError(`--${name} is an option of a tool, so it comes after the tool name.`);
      }

      const spec = optionsFor(out.tool).find((o) => o.key === name);
      if (!spec) {
        const takes = optionsFor(out.tool);
        const list = takes.length
          ? `${out.tool} takes ${takes.map((o) => `--${o.key}`).join(', ')}.`
          : `${out.tool} takes no options.`;
        throw new ArgError(`Unknown option --${name}. ${list}${suggest(name, takes.map((o) => o.key))}`);
      }

      /*
       * A switch never takes the next argument.
       *
       * Deciding from what follows looks helpful and is a trap: in
       * `redbison css-beautify --sort "a{color:red}"` the css is plainly the
       * input, but a parser that lets a boolean consume the next word reads
       * it as the flag's value and refuses the whole command. So a switch is
       * written --sort, --no-sort, or --sort=false, all of which are
       * unambiguous, and the text after it stays the input.
       */
      if (spec.type === 'boolean' && inline === undefined) {
        out.options[name] = true;
        continue;
      }

      const raw = inline ?? argv[++i];
      if (raw === undefined) throw new ArgError(`--${name} needs a value.`);
      out.options[name] = coerce(spec, raw);
      continue;
    }

    if (a.startsWith('-') && a.length > 1 && !/^-\d/.test(a)) {
      throw new ArgError(`Unknown flag ${a}. Options are spelled --like-this.`);
    }

    if (!out.tool) out.tool = a;
    else rest.push(a);
  }

  if (rest.length) {
    const joined = rest.join(' ');
    if (joined.startsWith('@')) out.file = joined.slice(1);
    else out.input = joined;
  }

  return out;
}

/** Options a tool requires but did not receive. */
export function missingRequired(toolId: string, options: Record<string, unknown>): ToolOption[] {
  return optionsFor(toolId).filter((o) => o.required && options[o.key] === undefined);
}
