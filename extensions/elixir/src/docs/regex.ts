import type { ModuleDoc } from "../types";

export const Regex: ModuleDoc = {
  functions: [
    {
      name: "version/0",
      type: "function",
      specs: ["@spec version() :: term()"],
      documentation: "Returns the version of the underlying Regex engine.\n",
    },
    {
      name: "split/3",
      type: "function",
      specs: ["@spec split(t(), String.t(), [term()]) :: [String.t()]"],
      documentation:
        'Splits the given target based on the given pattern and in the given number of\nparts.\n\n## Options\n\n  * `:parts` - when specified, splits the string into the given number of\n    parts. If not specified, `:parts` defaults to `:infinity`, which will\n    split the string into the maximum number of parts possible based on the\n    given pattern.\n\n  * `:trim` - when `true`, removes empty strings (`""`) from the result.\n    Defaults to `false`.\n\n  * `:on` - specifies which captures to split the string on, and in what\n    order. Defaults to `:first` which means captures inside the regex do not\n    affect the splitting process. See the ["Captures" section](#module-captures)\n    to see the possible capture values.\n\n  * `:include_captures` - when `true`, includes in the result the matches of\n    the regular expression. The matches are not counted towards the maximum\n    number of parts if combined with the `:parts` option. Defaults to `false`.\n\n## Examples\n\n    iex> Regex.split(~r{-}, "a-b-c")\n    ["a", "b", "c"]\n\n    iex> Regex.split(~r{-}, "a-b-c", parts: 2)\n    ["a", "b-c"]\n\n    iex> Regex.split(~r{-}, "abc")\n    ["abc"]\n\n    iex> Regex.split(~r{}, "abc")\n    ["", "a", "b", "c", ""]\n\n    iex> Regex.split(~r{a(?<second>b)c}, "abc")\n    ["", ""]\n\n    iex> Regex.split(~r{a(?<second>b)c}, "abc", on: [:second])\n    ["a", "c"]\n\n    iex> Regex.split(~r{(x)}, "Elixir", include_captures: true)\n    ["Eli", "x", "ir"]\n\n    iex> Regex.split(~r{a(?<second>b)c}, "abc", on: [:second], include_captures: true)\n    ["a", "b", "c"]\n\n    iex> Regex.split(~r{-}, "-a-b--c", trim: true)\n    ["a", "b", "c"]\n\n',
    },
    {
      name: "source/1",
      type: "function",
      specs: ["@spec source(t()) :: String.t()"],
      documentation:
        'Returns the regex source as a binary.\n\n## Examples\n\n    iex> Regex.source(~r/foo/)\n    "foo"\n\n',
    },
    {
      name: "scan/3",
      type: "function",
      specs: [
        "@spec scan(t(), String.t(), [term()]) ::\n        [[String.t()]] | [[{integer(), integer()}]]",
      ],
      documentation:
        'Same as `run/3` but returns all non-overlapping matches of the regular expression.\n\nA list of lists is returned, where each entry in the primary list represents a\nmatch and each entry in the secondary list represents the captured contents.\n\n## Options\n\n  * `:return` - when set to `:index`, returns byte index and match length.\n    Defaults to `:binary`.\n  * `:capture` - what to capture in the result. See the ["Captures" section](#module-captures)\n    to see the possible capture values.\n  * `:offset` - (since v1.12.0) specifies the starting offset to match in the given string.\n    Defaults to zero.\n\n## Examples\n\n    iex> Regex.scan(~r/c(d|e)/, "abcd abce")\n    [["cd", "d"], ["ce", "e"]]\n\n    iex> Regex.scan(~r/c(?:d|e)/, "abcd abce")\n    [["cd"], ["ce"]]\n\n    iex> Regex.scan(~r/e/, "abcd")\n    []\n\n    iex> Regex.scan(~r/ab|bc|cd/, "abcd")\n    [["ab"], ["cd"]]\n\n    iex> Regex.scan(~r/ab|bc|cd/, "abbccd")\n    [["ab"], ["bc"], ["cd"]]\n\n    iex> Regex.scan(~r/\\p{Sc}/u, "$, £, and €")\n    [["$"], ["£"], ["€"]]\n\n    iex> Regex.scan(~r/=+/, "=ü†ƒ8===", return: :index)\n    [[{0, 1}], [{9, 3}]]\n\n    iex> Regex.scan(~r/c(d|e)/, "abcd abce", capture: :first)\n    [["cd"], ["ce"]]\n\n',
    },
    {
      name: "run/3",
      type: "function",
      specs: [
        "@spec run(t(), binary(), [term()]) ::\n        nil | [binary()] | [{integer(), integer()}]",
      ],
      documentation:
        'Runs the regular expression against the given string until the first match.\nIt returns a list with all captures or `nil` if no match occurred.\n\n## Options\n\n  * `:return` - when set to `:index`, returns byte index and match length.\n    Defaults to `:binary`.\n  * `:capture` - what to capture in the result. See the ["Captures" section](#module-captures)\n    to see the possible capture values.\n  * `:offset` - (since v1.12.0) specifies the starting offset to match in the given string.\n    Defaults to zero.\n\n## Examples\n\n    iex> Regex.run(~r/c(d)/, "abcd")\n    ["cd", "d"]\n\n    iex> Regex.run(~r/e/, "abcd")\n    nil\n\n    iex> Regex.run(~r/c(d)/, "abcd", return: :index)\n    [{2, 2}, {3, 1}]\n\n    iex> Regex.run(~r/c(d)/, "abcd", capture: :first)\n    ["cd"]\n\n    iex> Regex.run(~r/c(?<foo>d)/, "abcd", capture: ["foo", "bar"])\n    ["d", ""]\n\n',
    },
    {
      name: "replace/4",
      type: "function",
      specs: [
        "@spec replace(t(), String.t(), String.t() | (... -> String.t()), [\n        {:global, boolean()}\n      ]) :: String.t()",
      ],
      documentation:
        'Receives a regex, a binary and a replacement, returns a new\nbinary where all matches are replaced by the replacement.\n\nThe replacement can be either a string or a function that returns a string.\nThe resulting string is used as a replacement for every match.\n\nWhen the replacement is a string, it allows specific captures of the match\nusing brackets at the regex expression and accessing them in the replacement\nvia `\\N` or `\\g{N}`, where `N` is the number of the capture. In case `\\0` is\nused, the whole match is inserted. Note that in regexes the backslash needs\nto be escaped, hence in practice you\'ll need to use `\\\\N` and `\\\\g{N}`.\n\nWhen the replacement is a function, it allows specific captures too.\nThe function may have arity N where each argument maps to a capture,\nwith the first argument being the whole match. If the function expects more\narguments than captures found, the remaining arguments will receive `""`.\n\n## Options\n\n  * `:global` - when `false`, replaces only the first occurrence\n    (defaults to `true`)\n\n## Examples\n\n    iex> Regex.replace(~r/d/, "abc", "d")\n    "abc"\n\n    iex> Regex.replace(~r/b/, "abc", "d")\n    "adc"\n\n    iex> Regex.replace(~r/b/, "abc", "[\\\\0]")\n    "a[b]c"\n\n    iex> Regex.replace(~r/a(b|d)c/, "abcadc", "[\\\\1]")\n    "[b][d]"\n\n    iex> Regex.replace(~r/\\.(\\d)$/, "500.5", ".\\\\g{1}0")\n    "500.50"\n\n    iex> Regex.replace(~r/a(b|d)c/, "abcadc", fn _, x -> "[#{x}]" end)\n    "[b][d]"\n\n    iex> Regex.replace(~r/(\\w+)@(\\w+).(\\w+)/, "abc@def.com", fn _full, _c1, _c2, c3 -> "TLD: #{c3}" end)\n    "TLD: com"\n\n    iex> Regex.replace(~r/a/, "abcadc", "A", global: false)\n    "Abcadc"\n\n',
    },
    {
      name: "recompile!/1",
      type: "function",
      specs: ["@spec recompile!(t()) :: t()"],
      documentation:
        "Recompiles the existing regular expression and raises `Regex.CompileError` in case of errors.\n",
    },
    {
      name: "recompile/1",
      type: "function",
      specs: ["@spec recompile(t()) :: {:ok, t()} | {:error, any()}"],
      documentation:
        "Recompiles the existing regular expression if necessary.\n\nThis checks the version stored in the regular expression\nand recompiles the regex in case of version mismatch.\n",
    },
    {
      name: "re_pattern/1",
      type: "function",
      specs: ["@spec re_pattern(t()) :: term()"],
      documentation:
        "Returns the underlying `re_pattern` in the regular expression.\n",
    },
    {
      name: "opts/1",
      type: "function",
      specs: ["@spec opts(t()) :: [term()]"],
      documentation:
        'Returns the regex options.\n\nSee the documentation of `Regex.compile/2` for more information.\n\n## Examples\n\n    iex> Regex.opts(~r/foo/m)\n    [:multiline]\n\n    iex> Regex.opts(Regex.compile!("foo", [:caseless]))\n    [:caseless]\n\n',
    },
    {
      name: "names/1",
      type: "function",
      specs: ["@spec names(t()) :: [String.t()]"],
      documentation:
        'Returns a list of names in the regex.\n\n## Examples\n\n    iex> Regex.names(~r/(?<foo>bar)/)\n    ["foo"]\n\n',
    },
    {
      name: "named_captures/3",
      type: "function",
      specs: ["@spec named_captures(t(), String.t(), [term()]) :: map() | nil"],
      documentation:
        'Returns the given captures as a map or `nil` if no captures are found.\n\n## Options\n\n  * `:return` - when set to `:index`, returns byte index and match length.\n    Defaults to `:binary`.\n\n## Examples\n\n    iex> Regex.named_captures(~r/c(?<foo>d)/, "abcd")\n    %{"foo" => "d"}\n\n    iex> Regex.named_captures(~r/a(?<foo>b)c(?<bar>d)/, "abcd")\n    %{"bar" => "d", "foo" => "b"}\n\n    iex> Regex.named_captures(~r/a(?<foo>b)c(?<bar>d)/, "efgh")\n    nil\n\n',
    },
    {
      name: "match?/2",
      type: "function",
      specs: ["@spec match?(t(), String.t()) :: boolean()"],
      documentation:
        'Returns a boolean indicating whether there was a match or not.\n\n## Examples\n\n    iex> Regex.match?(~r/foo/, "foo")\n    true\n\n    iex> Regex.match?(~r/foo/, "bar")\n    false\n\nElixir also provides text-based match operator `=~/2` and function `String.match?/2` as\nan alternative to test strings against regular expressions and\nstrings.\n',
    },
    {
      name: "escape/1",
      type: "function",
      specs: ["@spec escape(String.t()) :: String.t()"],
      documentation:
        'Escapes a string to be literally matched in a regex.\n\n## Examples\n\n    iex> Regex.escape(".")\n    "\\\\."\n\n    iex> Regex.escape("\\\\what if")\n    "\\\\\\\\what\\\\ if"\n\n',
    },
    {
      name: "compile!/2",
      type: "function",
      specs: ["@spec compile!(binary(), binary() | [term()]) :: t()"],
      documentation:
        "Compiles the regular expression and raises `Regex.CompileError` in case of errors.\n",
    },
    {
      name: "compile/2",
      type: "function",
      specs: [
        "@spec compile(binary(), binary() | [term()]) :: {:ok, t()} | {:error, any()}",
      ],
      documentation:
        'Compiles the regular expression.\n\nThe given options can either be a binary with the characters\nrepresenting the same regex options given to the\n`~r` (see `sigil_r/2`) sigil, or a list of options, as\nexpected by the Erlang\'s [`:re`](`:re`) module.\n\nIt returns `{:ok, regex}` in case of success,\n`{:error, reason}` otherwise.\n\n## Examples\n\n    iex> Regex.compile("foo")\n    {:ok, ~r/foo/}\n\n    iex> Regex.compile("*foo")\n    {:error, {~c"nothing to repeat", 0}}\n\n    iex> Regex.compile("foo", "i")\n    {:ok, ~r/foo/i}\n\n    iex> Regex.compile("foo", [:caseless])\n    {:ok, Regex.compile!("foo", [:caseless])}\n\n',
    },
  ],
  name: "Regex",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "t/0",
      type: "type",
      specs: [
        "@type t() :: %Regex{\n        opts: binary() | [term()],\n        re_pattern: term(),\n        re_version: term(),\n        source: binary()\n      }",
      ],
      documentation: null,
    },
  ],
};
