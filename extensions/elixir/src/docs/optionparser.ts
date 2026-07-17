import type { ModuleDoc } from "../types";

export const OptionParser: ModuleDoc = {
  functions: [
    {
      name: "to_argv/2",
      type: "function",
      specs: ["@spec to_argv(Enumerable.t(), options()) :: argv()"],
      documentation:
        'Receives a key-value enumerable and converts it to `t:argv/0`.\n\nKeys must be atoms. Keys with `nil` value are discarded,\nboolean values are converted to `--key` or `--no-key`\n(if the value is `true` or `false`, respectively),\nand all other values are converted using `to_string/1`.\n\nIt is advised to pass to `to_argv/2` the same set of `options`\ngiven to `parse/2`. Some switches can only be reconstructed\ncorrectly with the `:switches` information in hand.\n\n## Examples\n\n    iex> OptionParser.to_argv(foo_bar: "baz")\n    ["--foo-bar", "baz"]\n    iex> OptionParser.to_argv(bool: true, bool: false, discarded: nil)\n    ["--bool", "--no-bool"]\n\nSome switches will output different values based on the switches\ntypes:\n\n    iex> OptionParser.to_argv([number: 2], switches: [])\n    ["--number", "2"]\n    iex> OptionParser.to_argv([number: 2], switches: [number: :count])\n    ["--number", "--number"]\n\n',
    },
    {
      name: "split/1",
      type: "function",
      specs: ["@spec split(String.t()) :: argv()"],
      documentation:
        'Splits a string into `t:argv/0` chunks.\n\nThis function splits the given `string` into a list of strings in a similar\nway to many shells.\n\n## Examples\n\n    iex> OptionParser.split("foo bar")\n    ["foo", "bar"]\n\n    iex> OptionParser.split("foo \\"bar baz\\"")\n    ["foo", "bar baz"]\n\n',
    },
    {
      name: "parse_head!/2",
      type: "function",
      specs: ["@spec parse_head!(argv(), options()) :: {parsed(), argv()}"],
      documentation:
        'The same as `parse_head/2` but raises an `OptionParser.ParseError`\nexception if any invalid options are given.\n\nIf there are no errors, returns a `{parsed, rest}` tuple where:\n\n  * `parsed` is the list of parsed switches (same as in `parse_head/2`)\n  * `rest` is the list of arguments (same as in `parse_head/2`)\n\n## Examples\n\n    iex> OptionParser.parse_head!(\n    ...>   ["--source", "lib", "path/to/file", "--verbose"],\n    ...>   switches: [source: :string, verbose: :boolean]\n    ...> )\n    {[source: "lib"], ["path/to/file", "--verbose"]}\n\n    iex> OptionParser.parse_head!(\n    ...>   ["--number", "lib", "test/enum_test.exs", "--verbose"],\n    ...>   strict: [number: :integer]\n    ...> )\n    ** (OptionParser.ParseError) 1 error found!\n    --number : Expected type integer, got "lib"\n\n    iex> OptionParser.parse_head!(\n    ...>   ["--verbose", "--source", "lib", "test/enum_test.exs", "--unlock"],\n    ...>   strict: [verbose: :integer, source: :integer]\n    ...> )\n    ** (OptionParser.ParseError) 2 errors found!\n    --verbose : Missing argument of type integer\n    --source : Expected type integer, got "lib"\n\n',
    },
    {
      name: "parse_head/2",
      type: "function",
      specs: [
        "@spec parse_head(argv(), options()) :: {parsed(), argv(), errors()}",
      ],
      documentation:
        'Similar to `parse/2` but only parses the head of `argv`;\nas soon as it finds a non-switch, it stops parsing.\n\nSee `parse/2` for more information.\n\n## Example\n\n    iex> OptionParser.parse_head(\n    ...>   ["--source", "lib", "test/enum_test.exs", "--verbose"],\n    ...>   switches: [source: :string, verbose: :boolean]\n    ...> )\n    {[source: "lib"], ["test/enum_test.exs", "--verbose"], []}\n\n    iex> OptionParser.parse_head(\n    ...>   ["--verbose", "--source", "lib", "test/enum_test.exs", "--unlock"],\n    ...>   switches: [source: :string, verbose: :boolean, unlock: :boolean]\n    ...> )\n    {[verbose: true, source: "lib"], ["test/enum_test.exs", "--unlock"], []}\n\n',
    },
    {
      name: "parse!/2",
      type: "function",
      specs: ["@spec parse!(argv(), options()) :: {parsed(), argv()}"],
      documentation:
        'The same as `parse/2` but raises an `OptionParser.ParseError`\nexception if any invalid options are given.\n\nIf there are no errors, returns a `{parsed, rest}` tuple where:\n\n  * `parsed` is the list of parsed switches (same as in `parse/2`)\n  * `rest` is the list of arguments (same as in `parse/2`)\n\n## Examples\n\n    iex> OptionParser.parse!(["--debug", "path/to/file"], strict: [debug: :boolean])\n    {[debug: true], ["path/to/file"]}\n\n    iex> OptionParser.parse!(["--limit", "xyz"], strict: [limit: :integer])\n    ** (OptionParser.ParseError) 1 error found!\n    --limit : Expected type integer, got "xyz"\n\n    iex> OptionParser.parse!(["--unknown", "xyz"], strict: [])\n    ** (OptionParser.ParseError) 1 error found!\n    --unknown : Unknown option\n\n    iex> OptionParser.parse!(\n    ...>   ["-l", "xyz", "-f", "bar"],\n    ...>   switches: [limit: :integer, foo: :integer],\n    ...>   aliases: [l: :limit, f: :foo]\n    ...> )\n    ** (OptionParser.ParseError) 2 errors found!\n    -l : Expected type integer, got "xyz"\n    -f : Expected type integer, got "bar"\n\n',
    },
    {
      name: "parse/2",
      type: "function",
      specs: ["@spec parse(argv(), options()) :: {parsed(), argv(), errors()}"],
      documentation:
        'Parses `argv` into a keyword list.\n\nIt returns a three-element tuple with the form `{parsed, args, invalid}`, where:\n\n  * `parsed` is a keyword list of parsed switches with `{switch_name, value}`\n    tuples in it; `switch_name` is the atom representing the switch name while\n    `value` is the value for that switch parsed according to `opts` (see the\n    "Examples" section for more information)\n  * `args` is a list of the remaining arguments in `argv` as strings\n  * `invalid` is a list of invalid options as `{option_name, value}` where\n    `option_name` is the raw option and `value` is `nil` if the option wasn\'t\n    expected or the string value if the value didn\'t have the expected type for\n    the corresponding option\n\nElixir converts switches to underscored atoms, so `--source-path` becomes\n`:source_path`. This is done to better suit Elixir conventions. However, this\nmeans that switches can\'t contain underscores and switches that do contain\nunderscores are always returned in the list of invalid switches.\n\nWhen parsing, it is common to list switches and their expected types:\n\n    iex> OptionParser.parse(["--debug"], strict: [debug: :boolean])\n    {[debug: true], [], []}\n\n    iex> OptionParser.parse(["--source", "lib"], strict: [source: :string])\n    {[source: "lib"], [], []}\n\n    iex> OptionParser.parse(\n    ...>   ["--source-path", "lib", "test/enum_test.exs", "--verbose"],\n    ...>   strict: [source_path: :string, verbose: :boolean]\n    ...> )\n    {[source_path: "lib", verbose: true], ["test/enum_test.exs"], []}\n\nWe will explore the valid switches and operation modes of option parser below.\n\n## Options\n\nThe following options are supported:\n\n  * `:switches` or `:strict` - see the "Switch definitions" section below\n  * `:allow_nonexistent_atoms` - see the "Parsing unknown switches" section below\n  * `:aliases` - see the "Aliases" section below\n  * `:return_separator` - see the "Return separator" section below\n\n## Switch definitions\n\nSwitches can be specified via one of two options:\n\n  * `:strict` - defines strict switches and their types. Any switch\n    in `argv` that is not specified in the list is returned in the\n    invalid options list. This is the preferred way to parse options.\n\n  * `:switches` - defines switches and their types. This function\n    still attempts to parse switches that are not in this list.\n\nBoth these options accept a keyword list where the key is an atom\ndefining the name of the switch and value is the `type` of the\nswitch (see the "Types" section below for more information).\n\nNote that you should only supply the `:switches` or the `:strict` option.\nIf you supply both, an `ArgumentError` exception will be raised.\n\n### Types\n\nSwitches parsed by `OptionParser` may take zero or one arguments.\n\nThe following switches types take no arguments:\n\n  * `:boolean` - sets the value to `true` when given (see also the\n    "Negation switches" section below)\n  * `:count` - counts the number of times the switch is given\n\nThe following switches take one argument:\n\n  * `:integer` - parses the value as an integer\n  * `:float` - parses the value as a float\n  * `:string` - parses the value as a string\n\nIf a switch can\'t be parsed according to the given type, it is\nreturned in the invalid options list.\n\n### Modifiers\n\nSwitches can be specified with modifiers, which change how\nthey behave. The following modifiers are supported:\n\n  * `:keep` - keeps duplicate elements instead of overriding them;\n    works with all types except `:count`. Specifying `switch_name: :keep`\n    assumes the type of `:switch_name` will be `:string`.\n\nTo use `:keep` with a type other than `:string`, use a list as the type\nfor the switch. For example: `[foo: [:integer, :keep]]`.\n\n### Negation switches\n\nIn case a switch `SWITCH` is specified to have type `:boolean`, it may be\npassed as `--no-SWITCH` as well which will set the option to `false`:\n\n    iex> OptionParser.parse(["--no-op", "path/to/file"], switches: [op: :boolean])\n    {[op: false], ["path/to/file"], []}\n\n### Parsing unknown switches\n\nWhen the `:switches` option is given, `OptionParser` will attempt to parse\nunknown switches.\n\nSwitches without an argument will be set to `true`:\n\n    iex> OptionParser.parse(["--debug"], switches: [key: :string])\n    {[debug: true], [], []}\n\nEven though we haven\'t specified `--debug` in the list of switches, it is part\nof the returned options. The same happens for switches followed by another switch:\n\n    iex> OptionParser.parse(["--debug", "--ok"], switches: [])\n    {[debug: true, ok: true], [], []}\n\nSwitches followed by a value will be assigned the value, as a string:\n\n    iex> OptionParser.parse(["--debug", "value"], switches: [key: :string])\n    {[debug: "value"], [], []}\n\nSince we cannot assert the type of the switch value, it is preferred to use the\n`:strict` option that accepts only known switches and always verify their types.\n\nIf you do want to parse unknown switches, remember that Elixir converts switches\nto atoms. Since atoms are not garbage-collected, to avoid creating new ones,\nOptionParser by default only parses switches that translate to existing atoms.\nThe code below discards the `--option-parser-example` switch because the\n`:option_parser_example` atom is never used anywhere:\n\n    iex> OptionParser.parse(["--option-parser-example"], switches: [])\n    {[], [], []}\n\nIf a switch corresponds to an existing Elixir atom, whether from your\ncode, a dependency or from Elixir itself, it will be accepted. However,\nit is best to not rely on external code, and always define the atoms\nyou want to parse in the same module that calls `OptionParser` itself,\nas direct arguments to the `:switches` or `:strict` options.\n\nIf you would like to parse all switches, regardless if they exist or not,\nyou can force creation of atoms by passing `allow_nonexistent_atoms: true`\nas option. Use this option with care. It is only useful when you are building\ncommand-line applications that receive dynamically-named arguments and must\nbe avoided in long-running systems.\n\n## Aliases\n\nA set of aliases can be specified in the `:aliases` option:\n\n    iex> OptionParser.parse(["-d"], aliases: [d: :debug], strict: [debug: :boolean])\n    {[debug: true], [], []}\n\n## Examples\n\nHere are some examples of working with different types and modifiers:\n\n    iex> OptionParser.parse(["--unlock", "path/to/file"], strict: [unlock: :boolean])\n    {[unlock: true], ["path/to/file"], []}\n\n    iex> OptionParser.parse(\n    ...>   ["--unlock", "--limit", "0", "path/to/file"],\n    ...>   strict: [unlock: :boolean, limit: :integer]\n    ...> )\n    {[unlock: true, limit: 0], ["path/to/file"], []}\n\n    iex> OptionParser.parse(["--limit", "3"], strict: [limit: :integer])\n    {[limit: 3], [], []}\n\n    iex> OptionParser.parse(["--limit", "xyz"], strict: [limit: :integer])\n    {[], [], [{"--limit", "xyz"}]}\n\n    iex> OptionParser.parse(["--verbose"], switches: [verbose: :count])\n    {[verbose: 1], [], []}\n\n    iex> OptionParser.parse(["-v", "-v"], aliases: [v: :verbose], strict: [verbose: :count])\n    {[verbose: 2], [], []}\n\n    iex> OptionParser.parse(["--unknown", "xyz"], strict: [])\n    {[], ["xyz"], [{"--unknown", nil}]}\n\n    iex> OptionParser.parse(\n    ...>   ["--limit", "3", "--unknown", "xyz"],\n    ...>   switches: [limit: :integer]\n    ...> )\n    {[limit: 3, unknown: "xyz"], [], []}\n\n    iex> OptionParser.parse(\n    ...>   ["--unlock", "path/to/file", "--unlock", "path/to/another/file"],\n    ...>   strict: [unlock: :keep]\n    ...> )\n    {[unlock: "path/to/file", unlock: "path/to/another/file"], [], []}\n\n## Return separator\n\nThe separator `--` implies options should no longer be processed.\nBy default, the separator is not returned as parts of the arguments,\nbut that can be changed via the `:return_separator` option:\n\n    iex> OptionParser.parse(["--", "lib"], return_separator: true, strict: [])\n    {[], ["--", "lib"], []}\n\n    iex> OptionParser.parse(["--no-halt", "--", "lib"], return_separator: true, switches: [halt: :boolean])\n    {[halt: false], ["--", "lib"], []}\n\n    iex> OptionParser.parse(["script.exs", "--no-halt", "--", "foo"], return_separator: true, switches: [halt: :boolean])\n    {[{:halt, false}], ["script.exs", "--", "foo"], []}\n\n',
    },
    {
      name: "next/2",
      type: "function",
      specs: [
        "@spec next(argv(), options()) ::\n        {:ok, key :: atom(), value :: term(), argv()}\n        | {:invalid, String.t(), String.t() | nil, argv()}\n        | {:undefined, String.t(), String.t() | nil, argv()}\n        | {:error, argv()}",
      ],
      documentation:
        "Low-level function that parses one option.\n\nIt accepts the same options as `parse/2` and `parse_head/2`\nas both functions are built on top of this function. This function\nmay return:\n\n  * `{:ok, key, value, rest}` - the option `key` with `value` was\n    successfully parsed\n\n  * `{:invalid, key, value, rest}` - the option `key` is invalid with `value`\n    (returned when the value cannot be parsed according to the switch type)\n\n  * `{:undefined, key, value, rest}` - the option `key` is undefined\n    (returned in strict mode when the switch is unknown or on nonexistent atoms)\n\n  * `{:error, rest}` - there are no switches at the head of the given `argv`\n\n",
    },
  ],
  name: "OptionParser",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "options/0",
      type: "type",
      specs: [
        "@type options() :: [\n        switches: keyword(),\n        strict: keyword(),\n        aliases: keyword(),\n        allow_nonexistent_atoms: boolean(),\n        return_separator: boolean()\n      ]",
      ],
      documentation: null,
    },
    {
      name: "errors/0",
      type: "type",
      specs: ["@type errors() :: [{String.t(), String.t() | nil}]"],
      documentation: null,
    },
    {
      name: "parsed/0",
      type: "type",
      specs: ["@type parsed() :: keyword()"],
      documentation: null,
    },
    {
      name: "argv/0",
      type: "type",
      specs: ["@type argv() :: [String.t()]"],
      documentation: null,
    },
  ],
};
