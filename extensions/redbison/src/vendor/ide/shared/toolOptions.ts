/**
 * Every option each tool accepts, described once.
 *
 * The editors ask for these through a picker and the CLI takes them as flags,
 * but the set of options, their values and their defaults are a property of
 * the tool, not of the interface. Keeping them here means `redbison hash
 * --help` and the VS Code picker cannot disagree about what sha384 is called,
 * and a new option is added in one place.
 *
 * `values` means the option is a closed set and anything else is refused by
 * name. Without it the option takes free text, or a number when `type` says
 * so. `defaultValue` is what the tool does when the flag is absent; it must
 * match the implementation, and a test checks a sample of them.
 */

export type ToolOption = {
  /** The flag name, used as --<key>. */
  key: string;
  /** One line, lower case, no full stop: it is printed in a column. */
  describe: string;
  type?: 'string' | 'number' | 'boolean';
  /** A closed set of allowed values. */
  values?: { value: string; describe?: string }[];
  defaultValue?: string | number | boolean;
  /** The option must be given; the tool cannot guess it. */
  required?: boolean;
  /**
   * The tool wants a list here, so the comma-separated value typed on the
   * command line is split before it is sent.
   *
   * The describe line said "(comma separated)" long before anything split it,
   * and the server answered an input-validation error that the CLI then
   * printed as though it were the answer. Five options are like this
   * (templates, testPaths, stops, user_inputs, daysOfWeek) and none of them
   * worked.
   */
  list?: boolean;
  /**
   * The option carries a second body of text rather than a setting, so the
   * CLI also accepts it as a file with @path and reads stdin for the first.
   */
  isText?: boolean;
};

const hashAlgorithms: ToolOption = {
  key: 'algorithm',
  describe: 'digest algorithm',
  defaultValue: 'sha256',
  values: [
    { value: 'sha256', describe: 'the usual choice' },
    { value: 'sha512' },
    { value: 'sha384' },
    { value: 'sha1', describe: 'broken for signatures, fine for checksums' },
    { value: 'md5', describe: 'broken for signatures, fine for checksums' },
  ],
};

const hashEncoding: ToolOption = {
  key: 'encoding',
  describe: 'how to print the digest',
  defaultValue: 'hex',
  values: [{ value: 'hex' }, { value: 'base64' }],
};

export const TOOL_OPTIONS: Record<string, ToolOption[]> = {
  /* ------------------------------------------------------------ generators */
  uuid: [
    {
      key: 'variant',
      describe: 'which kind of UUID',
      defaultValue: 'v4',
      values: [
        { value: 'v4', describe: 'random, the usual choice' },
        { value: 'v7', describe: 'time-ordered, sorts by creation, good as a database key' },
        { value: 'v4-upper', describe: 'uppercase' },
        { value: 'v4-compact', describe: '32 hex characters, no hyphens' },
        { value: 'nil', describe: 'all zeroes' },
      ],
    },
  ],
  password: [
    { key: 'length', describe: 'how many characters', type: 'number', defaultValue: 20 },
    {
      key: 'charset',
      describe: 'which characters to draw from',
      defaultValue: 'full',
      values: [
        { value: 'full', describe: 'letters, digits and symbols' },
        { value: 'alphanumeric', describe: 'letters and digits' },
        { value: 'letters' },
      ],
    },
  ],
  lorem: [
    { key: 'count', describe: 'how many to produce', type: 'number', defaultValue: 2 },
    {
      key: 'unit',
      describe: 'what to count',
      defaultValue: 'paragraphs',
      values: [{ value: 'paragraphs' }, { value: 'sentences' }, { value: 'words' }],
    },
  ],

  /* ----------------------------------------------------------------- hashes */
  hash: [hashAlgorithms, hashEncoding],
  hmac: [
    { key: 'key', describe: 'the secret key', required: true },
    hashAlgorithms,
    hashEncoding,
  ],
  'hash-compare': [
    { key: 'b', describe: 'the hash to compare against', required: true, isText: true },
  ],

  /* ------------------------------------------------------------------- text */
  'case-convert': [
    {
      key: 'style',
      describe: 'which case',
      defaultValue: 'camel',
      values: [
        { value: 'camel', describe: 'helloWorld' },
        { value: 'pascal', describe: 'HelloWorld' },
        { value: 'snake', describe: 'hello_world' },
        { value: 'kebab', describe: 'hello-world' },
        { value: 'constant', describe: 'HELLO_WORLD' },
        { value: 'title', describe: 'Hello World' },
        { value: 'upper' },
        { value: 'lower' },
      ],
    },
  ],
  'sort-lines': [
    {
      key: 'order',
      describe: 'how to order the lines',
      defaultValue: 'asc',
      values: [
        { value: 'asc', describe: 'A to Z' },
        { value: 'desc', describe: 'Z to A' },
        { value: 'natural', describe: 'file9 before file10' },
        { value: 'length', describe: 'shortest first' },
      ],
    },
  ],
  'dedupe-lines': [
    {
      key: 'compare',
      describe: 'how to decide two lines are the same',
      defaultValue: 'exact',
      values: [{ value: 'exact' }, { value: 'ignore-case' }],
    },
  ],
  'wrap-lines': [
    { key: 'width', describe: 'column to wrap at (minimum 20)', type: 'number', defaultValue: 72 },
  ],
  'lines-to-comma': [
    {
      key: 'quote',
      describe: 'how to quote each item',
      defaultValue: 'none',
      values: [{ value: 'none' }, { value: 'double' }, { value: 'single' }],
    },
    { key: 'separator', describe: 'what to join with', defaultValue: ', ' },
  ],
  'comma-to-lines': [{ key: 'separator', describe: 'what to split on', defaultValue: ',' }],
  'number-lines': [{ key: 'separator', describe: 'what to put after the number', defaultValue: '. ' }],
  'list-compare': [
    { key: 'b', describe: 'the second list', required: true, isText: true },
  ],

  /* ------------------------------------------------------------- encodings */
  'base64-encode': [
    {
      key: 'variant',
      describe: 'which alphabet',
      defaultValue: 'standard',
      values: [
        { value: 'standard', describe: '+ and /, padded' },
        { value: 'url', describe: '- and _, unpadded, safe in a URL' },
      ],
    },
  ],
  'url-encode': [
    {
      key: 'variant',
      describe: 'how much to escape',
      defaultValue: 'component',
      values: [
        { value: 'component', describe: 'escape separators too, for one parameter' },
        { value: 'uri', describe: 'keep the URL structure intact' },
      ],
    },
  ],
  'escape-characters': [
    {
      key: 'format',
      describe: 'what to escape for',
      defaultValue: 'json',
      values: [{ value: 'json' }, { value: 'html' }, { value: 'xml' }],
    },
  ],
  'to-hex': [{ key: 'separator', describe: 'what to put between bytes', defaultValue: ' ' }],

  /* ----------------------------------------------------------------- others */
  'json-format': [
    { key: 'indent', describe: 'spaces per level', type: 'number', defaultValue: 2 },
  ],
  'number-base': [
    { key: 'from', describe: 'base of the input when it carries no prefix', defaultValue: '10' },
  ],
  'regex-test': [
    { key: 'pattern', describe: 'the regular expression', required: true },
    { key: 'flags', describe: 'regular expression flags', defaultValue: 'g' },
  ],
  'date-diff': [{ key: 'to', describe: 'the second date', required: true }],
  'utm-build': [
    { key: 'source', describe: 'utm_source' },
    { key: 'medium', describe: 'utm_medium' },
    { key: 'campaign', describe: 'utm_campaign' },
    { key: 'term', describe: 'utm_term' },
    { key: 'content', describe: 'utm_content' },
  ],

  /* ----------- server-backed tools whose MCP call carries fixed arguments */
  'ascii-art': [{ key: 'font', describe: 'figlet font', defaultValue: 'Standard' }],
  'barcode-check': [
    {
      /*
       * These were ean13/ean8/upca, which the tool has never accepted: it
       * takes a reading, not a symbology, and works the symbology out from
       * the digit count. `--mode ean13` was the documented default, so the
       * command in the help page was a command the server refused — and
       * until the reply's isError flag was read, it printed that refusal as
       * though it were the answer. Nothing caught it because the option test
       * skips tools that are not local, and this one was not.
       */
      key: 'mode',
      describe: 'compute the check digit or validate the one that is there',
      defaultValue: 'auto',
      values: [
        { value: 'auto', describe: 'validate a full code, compute for a short one' },
        { value: 'compute' },
        { value: 'validate' },
      ],
    },
  ],
  'color-palette': [
    {
      key: 'rule',
      describe: 'harmony rule',
      defaultValue: 'analogous',
      values: [
        { value: 'complementary' }, { value: 'analogous' }, { value: 'triadic' },
        { value: 'split-complementary' }, { value: 'tetradic' }, { value: 'square' },
        { value: 'monochromatic' }, { value: 'shades' },
      ],
    },
    {
      key: 'wheel',
      describe: 'which colour wheel to rotate the hue on',
      defaultValue: 'rgb',
      values: [
        { value: 'rgb', describe: 'the screen/HSL wheel' },
        { value: 'ryb', describe: "the painter's wheel" },
        { value: 'oklch', describe: 'perceptual, keeps lightness' },
      ],
    },
    { key: 'name', describe: 'a name for the palette' },
  ],
  'curl-to-code': [
    {
      key: 'target',
      describe: 'which language',
      defaultValue: 'fetch',
      values: [
        { value: 'fetch', describe: 'JavaScript fetch' },
        // axios is a target the generator has always had and this list left
        // out, so the CLI refused a value the tool supports.
        { value: 'axios', describe: 'JavaScript axios' },
        { value: 'python' },
        { value: 'go' },
        { value: 'php' },
      ],
    },
  ],
  /*
   * Hand-written because these tools now run locally, and the generator only
   * derives options for the ones that call the server: a derived option can
   * advertise something the schema accepts and the local implementation
   * ignores, which is the failure this CLI is built to avoid. Written out
   * from the MCP schema, minus anything the local code does not honour, and
   * src/test/local-options.test.ts holds the two together.
   */
  'html-beautify': [
    { key: 'indent', describe: 'spaces per level', type: 'number', defaultValue: 2 },
  ],
  'xml-beautify': [
    { key: 'indent', describe: 'spaces per level', type: 'number', defaultValue: 2 },
  ],
  'timezone-convert': [
    { key: 'to', describe: 'target IANA zone, such as America/New_York', required: true },
  ],
  'text-diff': [
    // The second text, so it reads from a file with @path or from stdin the
    // way the other two-body tools do.
    { key: 'b', describe: 'the text to compare against', required: true, isText: true },
  ],
  morse: [
    {
      key: 'direction',
      describe: 'encode to morse or decode from it',
      defaultValue: 'auto',
      values: [
        { value: 'auto', describe: 'work it out from the input' },
        { value: 'encode' },
        { value: 'decode' },
      ],
    },
  ],
  nato: [
    {
      key: 'direction',
      describe: 'spell it out or read it back',
      defaultValue: 'spell',
      values: [{ value: 'spell' }, { value: 'decode' }],
    },
    {
      key: 'spelling',
      describe: 'which alphabet',
      defaultValue: 'icao',
      values: [{ value: 'icao', describe: 'the aviation standard' }, { value: 'common' }],
    },
    {
      key: 'digits',
      describe: 'how to say numbers',
      defaultValue: 'icao',
      values: [{ value: 'icao', describe: 'Fower, Niner' }, { value: 'plain' }],
    },
    { key: 'markCase', describe: 'say which letters are capitals', type: 'boolean', defaultValue: false },
  ],
  readability: [
    { key: 'lineBreaksEndSentences', describe: 'treat a line break as the end of a sentence', type: 'boolean', defaultValue: true },
    { key: 'maxSentences', describe: 'how many hard sentences to list', type: 'number', defaultValue: 20 },
  ],
  'redirect-rules': [
    {
      key: 'platform',
      describe: 'which server the rules are for',
      required: true,
      values: [{ value: 'apache' }, { value: 'nginx' }, { value: 'netlify' }, { value: 'vercel' }],
    },
    { key: 'defaultCode', describe: 'status code for a line that does not name one', type: 'number', defaultValue: 301 },
    { key: 'keepQuery', describe: 'carry the query string across', type: 'boolean', defaultValue: true },
    { key: 'forceHttps', describe: 'add a rule redirecting http to https', type: 'boolean', defaultValue: false },
    {
      key: 'canonicalHost',
      describe: 'send one host to the other',
      defaultValue: 'none',
      values: [{ value: 'none' }, { value: 'www' }, { value: 'apex' }],
    },
    { key: 'domain', describe: 'the domain, needed for a canonical host rule' },
  ],
  'contrast-check': [
    { key: 'background', describe: 'the background colour, hex', required: true },
  ],
  'css-gradient': [
    {
      key: 'type',
      describe: 'gradient type',
      // Required, so no default: the two contradict, and the server
      // requires it too.
      required: true,
      values: [{ value: 'linear' }, { value: 'radial' }],
    },
    { key: 'angle', describe: 'angle in degrees, for a linear gradient', type: 'number', defaultValue: 90 },
    { key: 'stops', describe: 'the colour stops (comma separated)', required: true, list: true },
  ],
  'random-name': [
    { key: 'count', describe: 'how many names', type: 'number', defaultValue: 5 },
  ],
  'random-email': [
    { key: 'count', describe: 'how many addresses', type: 'number', defaultValue: 5 },
    { key: 'domain', describe: 'use this domain for all of them' },
  ],
  'random-number': [
    { key: 'min', describe: 'lowest value', type: 'number', required: true },
    { key: 'max', describe: 'highest value', type: 'number', required: true },
    { key: 'count', describe: 'how many numbers', type: 'number', defaultValue: 1 },
    {
      key: 'mode',
      describe: 'whole numbers or decimals',
      defaultValue: 'integer',
      values: [{ value: 'integer' }, { value: 'float' }],
    },
  ],
  gitignore: [
    // `list` matters here as much as the wording: the hand-written entry wins
    // over the derived one, so without it this is the one array option the
    // generator cannot mark for itself.
    { key: 'templates', describe: 'comma-separated templates, such as node,macos', required: true, list: true },
    { key: 'extra', describe: 'extra lines to append, one pattern per line' },
    { key: 'testPaths', describe: 'paths to check against the result (comma separated)', list: true },
  ],
};

/** The options a tool takes, or an empty list. */
export function optionsFor(toolId: string): ToolOption[] {
  return TOOL_OPTIONS[toolId] ?? [];
}

/** Every option key any tool accepts, for the CLI's unknown-flag message. */
export const ALL_OPTION_KEYS: string[] = [
  ...new Set(Object.values(TOOL_OPTIONS).flatMap((list) => list.map((o) => o.key))),
].sort();
