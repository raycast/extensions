import type { ModuleDoc } from "../types";

export const Code: ModuleDoc = {
  functions: [
    {
      name: "with_diagnostics/2",
      type: "function",
      specs: [
        "@spec with_diagnostics(\n        keyword(),\n        (-> result)\n      ) :: {result, [diagnostic(:warning | :error)]}\n      when result: term()",
      ],
      documentation:
        "Executes the given `fun` and capture all diagnostics.\n\nDiagnostics are warnings and errors emitted during code\nevaluation or single-file compilation and by functions\nsuch as `IO.warn/2`.\n\nIf using `mix compile` or `Kernel.ParallelCompiler`,\nnote they already capture and return diagnostics.\n\n## Options\n\n  * `:log` - if the diagnostics should be logged as they happen.\n    Defaults to `false`.\n\n> #### Rescuing errors {: .info}\n>\n> `with_diagnostics/2` does not automatically handle exceptions.\n> You may capture them by adding a `try/1` in `fun`:\n>\n>     {result, all_errors_and_warnings} =\n>       Code.with_diagnostics(fn ->\n>         try do\n>           {:ok, Code.compile_quoted(quoted)}\n>         rescue\n>           err -> {:error, err}\n>         end\n>       end)\n\n",
    },
    {
      name: "unrequire_files/1",
      type: "function",
      specs: ["@spec unrequire_files([binary()]) :: :ok"],
      documentation:
        'Removes files from the required files list.\n\nThe modules defined in the file are not removed;\ncalling this function only removes them from the list,\nallowing them to be required again.\n\nThe list of files is managed per Erlang VM node.\n\n## Examples\n\n    # Require EEx test code\n    Code.require_file("../eex/test/eex_test.exs")\n\n    # Now unrequire all files\n    Code.unrequire_files(Code.required_files())\n\n    # Note that modules are still available\n    function_exported?(EExTest.Compiled, :before_compile, 0)\n    #=> true\n\n',
    },
    {
      name: "string_to_quoted_with_comments!/2",
      type: "function",
      specs: [
        "@spec string_to_quoted_with_comments!(\n        List.Chars.t(),\n        keyword()\n      ) :: {Macro.t(), [map()]}",
      ],
      documentation:
        "Converts the given string to its quoted form and a list of comments.\n\nReturns the AST and a list of comments if it succeeds, raises an exception\notherwise. The exception is a `TokenMissingError` in case a token is missing\n(usually because the expression is incomplete), `SyntaxError` otherwise.\n\nCheck `string_to_quoted/2` for options information.\n",
    },
    {
      name: "string_to_quoted_with_comments/2",
      type: "function",
      specs: [
        "@spec string_to_quoted_with_comments(\n        List.Chars.t(),\n        keyword()\n      ) ::\n        {:ok, Macro.t(), [map()]}\n        | {:error, {location :: keyword(), term(), term()}}",
      ],
      documentation:
        'Converts the given string to its quoted form and a list of comments.\n\nThis function is useful when performing textual changes to the source code,\nwhile preserving information like comments and literals position.\n\nReturns `{:ok, quoted_form, comments}` if it succeeds,\n`{:error, {line, error, token}}` otherwise.\n\nComments are maps with the following fields:\n\n  * `:line` - The line number of the source code\n\n  * `:text` - The full text of the comment, including the leading `#`\n\n  * `:previous_eol_count` - How many end of lines there are between the comment and the previous AST node or comment\n\n  * `:next_eol_count` - How many end of lines there are between the comment and the next AST node or comment\n\nCheck `string_to_quoted/2` for options information.\n\n## Examples\n\n    iex> Code.string_to_quoted_with_comments("""\n    ...> :foo\n    ...>\n    ...> # Hello, world!\n    ...>\n    ...>\n    ...> # Some more comments!\n    ...> """)\n    {:ok, :foo, [\n      %{line: 3, column: 1, previous_eol_count: 2, next_eol_count: 3, text: "# Hello, world!"},\n      %{line: 6, column: 1, previous_eol_count: 3, next_eol_count: 1, text: "# Some more comments!"},\n    ]}\n\n    iex> Code.string_to_quoted_with_comments(":foo # :bar")\n    {:ok, :foo, [\n      %{line: 1, column: 6, previous_eol_count: 0, next_eol_count: 0, text: "# :bar"}\n    ]}\n\n',
    },
    {
      name: "string_to_quoted!/2",
      type: "function",
      specs: [
        "@spec string_to_quoted!(\n        List.Chars.t(),\n        keyword()\n      ) :: Macro.t()",
      ],
      documentation:
        "Converts the given string to its quoted form.\n\nIt returns the AST if it succeeds,\nraises an exception otherwise. The exception is a `TokenMissingError`\nin case a token is missing (usually because the expression is incomplete),\n`MismatchedDelimiterError` (in case of mismatched opening and closing delimiters) and\n`SyntaxError` otherwise.\n\nCheck `string_to_quoted/2` for options information.\n",
    },
    {
      name: "string_to_quoted/2",
      type: "function",
      specs: [
        "@spec string_to_quoted(\n        List.Chars.t(),\n        keyword()\n      ) ::\n        {:ok, Macro.t()}\n        | {:error,\n           {location :: keyword(), binary() | {binary(), binary()}, binary()}}",
      ],
      documentation:
        'Converts the given string to its quoted form.\n\nReturns `{:ok, quoted_form}` if it succeeds,\n`{:error, {meta, message_info, token}}` otherwise.\n\n## Options\n\n  * `:file` - the filename to be reported in case of parsing errors.\n    Defaults to `"nofile"`.\n\n  * `:line` - the starting line of the string being parsed.\n    Defaults to 1.\n\n  * `:column` - (since v1.11.0) the starting column of the string being parsed.\n    Defaults to 1.\n\n  * `:columns` - when `true`, attach a `:column` key to the quoted\n    metadata. Defaults to `false`.\n\n  * `:unescape` (since v1.10.0) - when `false`, preserves escaped sequences.\n    For example, `"null byte\\\\t\\\\x00"` will be kept as is instead of being\n    converted to a bitstring literal. Note if you set this option to false, the\n    resulting AST is no longer valid, but it can be useful to analyze/transform\n    source code, typically in combination with `quoted_to_algebra/2`.\n    Defaults to `true`.\n\n  * `:existing_atoms_only` - when `true`, raises an error\n    when non-existing atoms are found by the tokenizer.\n    Defaults to `false`.\n\n  * `:token_metadata` (since v1.10.0) - when `true`, includes token-related\n    metadata in the expression AST, such as metadata for `do` and `end`\n    tokens, for closing tokens, end of expressions, as well as delimiters\n    for sigils. See `t:Macro.metadata/0`. Defaults to `false`.\n\n  * `:literal_encoder` (since v1.10.0) - how to encode literals in the AST.\n    It must be a function that receives two arguments, the literal and its\n    metadata, and it must return `{:ok, ast :: Macro.t}` or\n    `{:error, reason :: binary}`. If you return anything than the literal\n    itself as the `term`, then the AST is no longer valid. This option\n    may still useful for textual analysis of the source code.\n\n  * `:static_atoms_encoder` - the static atom encoder function, see\n    "The `:static_atoms_encoder` function" section below. Note this\n    option overrides the `:existing_atoms_only` behavior for static\n    atoms but `:existing_atoms_only` is still used for dynamic atoms,\n    such as atoms with interpolations.\n\n  * `:emit_warnings` (since v1.16.0) - when `false`, does not emit\n    tokenizing/parsing related warnings. Defaults to `true`.\n\n## `Macro.to_string/2`\n\nThe opposite of converting a string to its quoted form is\n`Macro.to_string/2`, which converts a quoted form to a string/binary\nrepresentation.\n\n## The `:static_atoms_encoder` function\n\nWhen `static_atoms_encoder: &my_encoder/2` is passed as an argument,\n`my_encoder/2` is called every time the tokenizer needs to create a\n"static" atom. Static atoms are atoms in the AST that function as\naliases, remote calls, local calls, variable names, regular atoms\nand keyword lists.\n\nThe encoder function will receive the atom name (as a binary) and a\nkeyword list with the current file, line and column. It must return\n`{:ok, token :: term} | {:error, reason :: binary}`.\n\nThe encoder function is supposed to create an atom from the given\nstring. To produce a valid AST, it is required to return `{:ok, term}`,\nwhere `term` is an atom. It is possible to return something other than an atom,\nhowever, in that case the AST is no longer "valid" in that it cannot\nbe used to compile or evaluate Elixir code. A use case for this is\nif you want to use the Elixir parser in a user-facing situation, but\nyou don\'t want to exhaust the atom table.\n\nThe atom encoder is not called for *all* atoms that are present in\nthe AST. It won\'t be invoked for the following atoms:\n\n  * operators (`:+`, `:-`, and so on)\n\n  * syntax keywords (`fn`, `do`, `else`, and so on)\n\n  * atoms containing interpolation (`:"#{1 + 1} is two"`), as these\n    atoms are constructed at runtime\n\n  * atoms used to represent single-letter sigils like `:sigil_X`\n    (but multi-letter sigils like `:sigil_XYZ` are encoded).\n\n',
    },
    {
      name: "required_files/0",
      type: "function",
      specs: ["@spec required_files() :: [binary()]"],
      documentation:
        'Lists all required files.\n\n## Examples\n\n    Code.require_file("../eex/test/eex_test.exs")\n    List.first(Code.required_files()) =~ "eex_test.exs"\n    #=> true\n\n',
    },
    {
      name: "require_file/2",
      type: "function",
      specs: [
        "@spec require_file(binary(), nil | binary()) :: [{module(), binary()}] | nil",
      ],
      documentation:
        'Requires the given `file`.\n\nAccepts `relative_to` as an argument to tell where the file is located.\nIf the file was already required, `require_file/2` doesn\'t do anything and\nreturns `nil`.\n\nNote that if `require_file/2` is invoked by different processes concurrently,\nthe first process to invoke `require_file/2` acquires a lock and the remaining\nones will block until the file is available. This means that if `require_file/2`\nis called more than once with a given file, that file will be compiled only once.\nThe first process to call `require_file/2` will get the list of loaded modules,\nothers will get `nil`. The list of required files is managed per Erlang VM node.\n\nSee `compile_file/2` if you would like to compile a file without tracking its\nfilenames. Finally, if you would like to get the result of evaluating a file rather\nthan the modules defined in it, see `eval_file/2`.\n\n## Examples\n\nIf the file has not been required, it returns the list of modules:\n\n    modules = Code.require_file("eex_test.exs", "../eex/test")\n    List.first(modules)\n    #=> {EExTest.Compiled, <<70, 79, 82, 49, ...>>}\n\nIf the file has been required, it returns `nil`:\n\n    Code.require_file("eex_test.exs", "../eex/test")\n    #=> nil\n\n',
    },
    {
      name: "quoted_to_algebra/2",
      type: "function",
      specs: [
        "@spec quoted_to_algebra(\n        Macro.t(),\n        keyword()\n      ) :: Inspect.Algebra.t()",
      ],
      documentation:
        "Converts a quoted expression to an algebra document using Elixir's formatter rules.\n\nThe algebra document can be converted into a string by calling:\n\n    doc\n    |> Inspect.Algebra.format(:infinity)\n    |> IO.iodata_to_binary()\n\nFor a high-level function that does the same, see `Macro.to_string/1`.\n\n## Formatting considerations\n\nThe Elixir AST does not contain metadata for literals like strings, lists, or\ntuples with two elements, which means that the produced algebra document will\nnot respect all of the user preferences and comments may be misplaced.\nTo get better results, you can use the `:token_metadata`, `:unescape` and\n`:literal_encoder` options to `string_to_quoted/2` to provide additional\ninformation to the formatter:\n\n    [\n      literal_encoder: &{:ok, {:__block__, &2, [&1]}},\n      token_metadata: true,\n      unescape: false\n    ]\n\nThis will produce an AST that contains information such as `do` blocks start\nand end lines or sigil delimiters, and by wrapping literals in blocks they can\nnow hold metadata like line number, string delimiter and escaped sequences, or\ninteger formatting (such as `0x2a` instead of `47`). However, **note this AST is\nnot valid**. If you evaluate it, it won't have the same semantics as the regular\nElixir AST due to the `:unescape` and `:literal_encoder` options. However,\nthose options are useful if you're doing source code manipulation, where it's\nimportant to preserve user choices and comments placing.\n\n## Options\n\n  * `:comments` - the list of comments associated with the quoted expression.\n    Defaults to `[]`. It is recommended that both `:token_metadata` and\n    `:literal_encoder` options are given to `string_to_quoted_with_comments/2`\n    in order to get proper placement for comments\n\n  * `:escape` - when `true`, escaped sequences like `\\n` will be escaped into\n    `\\\\n`. If the `:unescape` option was set to `false` when using\n    `string_to_quoted/2`, setting this option to `false` will prevent it from\n    escaping the sequences twice. Defaults to `true`.\n\n  * `:locals_without_parens` - a keyword list of name and arity\n    pairs that should be kept without parens whenever possible.\n    The arity may be the atom `:*`, which implies all arities of\n    that name. The formatter already includes a list of functions\n    and this option augments this list.\n\n  * `:syntax_colors` - a keyword list of colors the output is colorized.\n    See `Inspect.Opts` for more information.\n",
    },
    {
      name: "put_compiler_option/2",
      type: "function",
      specs: ["@spec put_compiler_option(atom(), term()) :: :ok"],
      documentation:
        "Stores a compilation option.\n\nChanging the compilation options affect all processes running in a\ngiven Erlang VM node.\n\nAvailable options are:\n\n  * `:docs` - when `true`, retains documentation in the compiled module.\n    Defaults to `true`.\n\n  * `:debug_info` - when `true`, retains debug information in the compiled\n    module. Defaults to `true`.\n    This enables static analysis tools as it allows developers to\n    partially reconstruct the original source code. Therefore, disabling\n    `:debug_info` is not recommended as it removes the ability of the\n    Elixir compiler and other tools to provide feedback. If you want to\n    remove the `:debug_info` while deploying, tools like `mix release`\n    already do such by default.\n    Additionally, `mix test` disables it via the `:test_elixirc_options`\n    project configuration option.\n    This option can also be overridden per module using the `@compile` directive.\n\n  * `:ignore_already_consolidated` (since v1.10.0) - when `true`, does not warn\n    when a protocol has already been consolidated and a new implementation is added.\n    Defaults to `false`.\n\n  * `:ignore_module_conflict` - when `true`, does not warn when a module has\n    already been defined. Defaults to `false`.\n\n  * `:relative_paths` - when `true`, uses relative paths in quoted nodes,\n    warnings, and errors generated by the compiler. Note disabling this option\n    won't affect runtime warnings and errors. Defaults to `true`.\n\n  * `:warnings_as_errors` - causes compilation to fail when warnings are\n    generated. Defaults to `false`.\n\n  * `:no_warn_undefined` (since v1.10.0) - list of modules and `{Mod, fun, arity}`\n    tuples that will not emit warnings that the module or function does not exist\n    at compilation time. Pass atom `:all` to skip warning for all undefined\n    functions. This can be useful when doing dynamic compilation. Defaults to `[]`.\n\n  * `:tracers` (since v1.10.0) - a list of tracers (modules) to be used during\n    compilation. See the module docs for more information. Defaults to `[]`.\n\n  * `:parser_options` (since v1.10.0) - a keyword list of options to be given\n    to the parser when compiling files. It accepts the same options as\n    `string_to_quoted/2` (except by the options that change the AST itself).\n    This can be used in combination with the tracer to retrieve localized\n    information about events happening during compilation. Defaults to `[columns: true]`.\n    This option only affects code compilation functions, such as `compile_string/2`\n    and `compile_file/2` but not `string_to_quoted/2` and friends, as the\n    latter is used for other purposes beyond compilation.\n\n  * `:on_undefined_variable` (since v1.15.0) - either `:raise` or `:warn`.\n    When `:raise` (the default), undefined variables will trigger a compilation\n    error. You may be set it to `:warn` if you want undefined variables to\n    emit a warning and expand as to a local call to the zero-arity function\n    of the same name (for example, `node` would be expanded as `node()`).\n    This `:warn` behavior only exists for compatibility reasons when working\n    with old dependencies, its usage is discouraged and it will be removed\n    in future releases.\n\nIt always returns `:ok`. Raises an error for invalid options.\n\n## Examples\n\n    Code.put_compiler_option(:debug_info, true)\n    #=> :ok\n\n",
    },
    {
      name: "purge_compiler_modules/0",
      type: "function",
      specs: ["@spec purge_compiler_modules() :: {:ok, non_neg_integer()}"],
      documentation:
        "Purge compiler modules.\n\nThe compiler utilizes temporary modules to compile code. For example,\n`elixir_compiler_1`, `elixir_compiler_2`, and so on. In case the compiled code\nstores references to anonymous functions or similar, the Elixir compiler\nmay be unable to reclaim those modules, keeping an unnecessary amount of\ncode in memory and eventually leading to modules such as `elixir_compiler_12345`.\n\nThis function purges all modules currently kept by the compiler, allowing\nold compiler module names to be reused. If there are any processes running\nany code from such modules, they will be terminated too.\n\nThis function is only meant to be called if you have a long running node\nthat is constantly evaluating code.\n\nIt returns `{:ok, number_of_modules_purged}`.\n",
    },
    {
      name: "print_diagnostic/2",
      type: "function",
      specs: [
        "@spec print_diagnostic(\n        diagnostic(:warning | :error),\n        keyword()\n      ) :: :ok",
      ],
      documentation:
        "Prints a diagnostic into the standard error.\n\nA diagnostic is either returned by `Kernel.ParallelCompiler`\nor by `Code.with_diagnostics/2`.\n\n## Options\n\n  * `:snippet` - whether to read the code snippet in the diagnostic location.\n    As it may impact performance, it is not recommended to be used in runtime.\n    Defaults to `true`.\n",
    },
    {
      name: "prepend_paths/2",
      type: "function",
      specs: ["@spec prepend_paths([Path.t()], [{:cache, boolean()}]) :: :ok"],
      documentation:
        'Prepends a list of `paths` to the Erlang VM code path list.\n\nThis is the list of directories the Erlang VM uses for\nfinding module code. The list of files is managed per Erlang\nVM node.\n\nAll paths are expanded with `Path.expand/1` before being prepended.\nOnly existing paths are prepended. This function always returns `:ok`,\nregardless of how many paths were prepended. Use `prepend_path/1`\nif you need more control.\n\n## Examples\n\n    Code.prepend_paths([".", "/does_not_exist"])\n    #=> :ok\n\n## Options\n\n  * `:cache` - when true, the code path is cached the first time\n    it is traversed in order to reduce file system operations.\n    It requires Erlang/OTP 26, otherwise it is a no-op.\n',
    },
    {
      name: "prepend_path/2",
      type: "function",
      specs: [
        "@spec prepend_path(Path.t(), [{:cache, boolean()}]) :: boolean()",
      ],
      documentation:
        'Prepends a path to the Erlang VM code path list.\n\nThis is the list of directories the Erlang VM uses for\nfinding module code. The list of files is managed per Erlang\nVM node.\n\nThe path is expanded with `Path.expand/1` before being prepended.\nIt requires the path to exist. Returns a boolean indicating if\nthe path was successfully added.\n\n## Examples\n\n    Code.prepend_path(".")\n    #=> true\n\n    Code.prepend_path("/does_not_exist")\n    #=> false\n\n## Options\n\n  * `:cache` - (since v1.15.0) when true, the code path is cached\n    the first time it is traversed in order to reduce file system\n    operations. It requires Erlang/OTP 26, otherwise it is a no-op.\n\n',
    },
    {
      name: "loaded?/1",
      type: "function",
      specs: ["@spec loaded?(module()) :: boolean()"],
      documentation:
        "Returns `true` if the module is loaded.\n\nThis function doesn't attempt to load the module. For such behavior,\n`ensure_loaded?/1` can be used.\n\n## Examples\n\n    iex> Code.loaded?(Atom)\n    true\n\n    iex> Code.loaded?(NotYetLoaded)\n    false\n\n",
    },
    {
      name: "get_compiler_option/1",
      type: "function",
      specs: ["@spec get_compiler_option(atom()) :: term()"],
      documentation:
        "Returns the value of a given compiler option.\n\nFor a description of all options, see `put_compiler_option/2`.\n\n## Examples\n\n    Code.get_compiler_option(:debug_info)\n    #=> true\n\n",
    },
    {
      name: "format_string!/2",
      type: "function",
      specs: [
        "@spec format_string!(\n        binary(),\n        keyword()\n      ) :: iodata()",
      ],
      documentation:
        'Formats the given code `string`.\n\nThe formatter receives a string representing Elixir code and\nreturns iodata representing the formatted code according to\npre-defined rules.\n\n## Options\n\n  * `:file` - the file which contains the string, used for error\n    reporting\n\n  * `:line` - the line the string starts, used for error reporting\n\n  * `:line_length` - the line length to aim for when formatting\n    the document. Defaults to 98. This value indicates when an expression\n    should be broken over multiple lines but it is not guaranteed\n    to do so. See the "Line length" section below for more information\n\n  * `:locals_without_parens` - a keyword list of name and arity\n    pairs that should be kept without parens whenever possible.\n    The arity may be the atom `:*`, which implies all arities of\n    that name. The formatter already includes a list of functions\n    and this option augments this list.\n\n  * `:force_do_end_blocks` (since v1.9.0) - when `true`, converts all\n    inline usages of `do: ...`,  `else: ...` and friends into `do`-`end`\n    blocks. Defaults to `false`. Note that this option is convergent:\n    once you set it to `true`, **all keywords** will be converted.\n    If you set it to `false` later on, `do`-`end` blocks won\'t be\n    converted back to keywords.\n\n  * `:normalize_bitstring_modifiers` (since v1.14.0) - when `true`,\n    removes unnecessary parentheses in known bitstring\n    [modifiers](`<<>>/1`), for example `<<foo::binary()>>`\n    becomes `<<foo::binary>>`, or adds parentheses for custom\n    modifiers, where `<<foo::custom_type>>` becomes `<<foo::custom_type()>>`.\n    Defaults to `true`. This option changes the AST.\n\n  * `:normalize_charlists_as_sigils` (since v1.15.0) - when `true`,\n    formats charlists as [`~c`](`Kernel.sigil_c/2`) sigils, for example\n    `\'foo\'` becomes `~c"foo"`.\n    Defaults to `true`. This option changes the AST.\n\n## Design principles\n\nThe formatter was designed under three principles.\n\nFirst, the formatter never changes the semantics of the code.\nThis means the input AST and the output AST are almost always equivalent.\nThe only cases where the formatter will change the AST is when the input AST\nwould cause *compiler warnings* and the output AST won\'t. The cases where\nthe formatter changes the AST can be disabled through formatting options\nif desired.\n\nThe second principle is to provide as little configuration as possible.\nThis eases the formatter adoption by removing contention points while\nmaking sure a single style is followed consistently by the community as\na whole.\n\nThe formatter does not hard code names. The formatter will not behave\nspecially because a function is named `defmodule`, `def`, or the like. This\nprinciple mirrors Elixir\'s goal of being an extensible language where\ndevelopers can extend the language with new constructs as if they were\npart of the language. When it is absolutely necessary to change behavior\nbased on the name, this behavior should be configurable, such as the\n`:locals_without_parens` option.\n\n## Running the formatter\n\nThe formatter attempts to fit the most it can on a single line and\nintroduces line breaks wherever possible when it cannot.\n\nIn some cases, this may lead to undesired formatting. Therefore, **some\ncode generated by the formatter may not be aesthetically pleasing and\nmay require explicit intervention from the developer**. That\'s why we\ndo not recommend to run the formatter blindly in an existing codebase.\nInstead you should format and sanity check each formatted file.\n\nFor example, the formatter may break a long function definition over\nmultiple clauses:\n\n    def my_function(\n      %User{name: name, age: age, ...},\n      arg1,\n      arg2\n    ) do\n      ...\n    end\n\nWhile the code above is completely valid, you may prefer to match on\nthe struct variables inside the function body in order to keep the\ndefinition on a single line:\n\n    def my_function(%User{} = user, arg1, arg2) do\n      %{name: name, age: age, ...} = user\n      ...\n    end\n\nIn some situations, you can use the fact the formatter does not generate\nelegant code as a hint for refactoring. Take this code:\n\n    def board?(board_id, %User{} = user, available_permissions, required_permissions) do\n      Tracker.OrganizationMembers.user_in_organization?(user.id, board.organization_id) and\n        required_permissions == Enum.to_list(MapSet.intersection(MapSet.new(required_permissions), MapSet.new(available_permissions)))\n    end\n\nThe code above has very long lines and running the formatter is not going\nto address this issue. In fact, the formatter may make it more obvious that\nyou have complex expressions:\n\n    def board?(board_id, %User{} = user, available_permissions, required_permissions) do\n      Tracker.OrganizationMembers.user_in_organization?(user.id, board.organization_id) and\n        required_permissions ==\n          Enum.to_list(\n            MapSet.intersection(\n              MapSet.new(required_permissions),\n              MapSet.new(available_permissions)\n            )\n          )\n    end\n\nTake such cases as a suggestion that your code should be refactored:\n\n    def board?(board_id, %User{} = user, available_permissions, required_permissions) do\n      Tracker.OrganizationMembers.user_in_organization?(user.id, board.organization_id) and\n        matching_permissions?(required_permissions, available_permissions)\n    end\n\n    defp matching_permissions?(required_permissions, available_permissions) do\n      intersection =\n        required_permissions\n        |> MapSet.new()\n        |> MapSet.intersection(MapSet.new(available_permissions))\n        |> Enum.to_list()\n\n      required_permissions == intersection\n    end\n\nTo sum it up: since the formatter cannot change the semantics of your\ncode, sometimes it is necessary to tweak or refactor the code to get\noptimal formatting. To help better understand how to control the formatter,\nwe describe in the next sections the cases where the formatter keeps the\nuser encoding and how to control multiline expressions.\n\n## Line length\n\nAnother point about the formatter is that the `:line_length` configuration\nindicates when an expression should be broken over multiple lines but it is\nnot guaranteed to do so. In many cases, it is not possible for the formatter\nto break your code apart, which means it will go over the line length.\nFor example, if you have a long string:\n\n    "this is a very long string that will go over the line length"\n\nThe formatter doesn\'t know how to break it apart without changing the\ncode underlying syntax representation, so it is up to you to step in:\n\n    "this is a very long string " <>\n       "that will go over the line length"\n\nThe string concatenation makes the code fit on a single line and also\ngives more options to the formatter.\n\nThis may also appear in keywords such as do/end blocks and operators,\nwhere the `do` keyword may go over the line length because there is no\nopportunity for the formatter to introduce a line break in a readable way.\nFor example, if you do:\n\n    case very_long_expression() do\n    end\n\nAnd only the `do` keyword is beyond the line length, Elixir **will not**\nemit this:\n\n    case very_long_expression()\n    do\n    end\n\nSo it prefers to not touch the line at all and leave `do` above the\nline limit.\n\n## Keeping user\'s formatting\n\nThe formatter respects the input format in some cases. Those are\nlisted below:\n\n  * Insignificant digits in numbers are kept as is. The formatter,\n    however, always inserts underscores for decimal numbers with more\n    than 5 digits and converts hexadecimal digits to uppercase\n\n  * Strings, charlists, atoms and sigils are kept as is. No character\n    is automatically escaped or unescaped. The choice of delimiter is\n    also respected from the input\n\n  * Newlines inside blocks are kept as in the input except for:\n    1) expressions that take multiple lines will always have an empty\n    line before and after and 2) empty lines are always squeezed\n    together into a single empty line\n\n  * The choice between `:do` keyword and `do`-`end` blocks is left\n    to the user\n\n  * Lists, tuples, bitstrings, maps, structs and function calls will be\n    broken into multiple lines if they are followed by a newline in the\n    opening bracket and preceded by a new line in the closing bracket\n\n  * Newlines before certain operators (such as the pipeline operators)\n    and before other operators (such as comparison operators)\n\nThe behaviors above are not guaranteed. We may remove or add new\nrules in the future. The goal of documenting them is to provide better\nunderstanding on what to expect from the formatter.\n\n### Multi-line lists, maps, tuples, and the like\n\nYou can force lists, tuples, bitstrings, maps, structs and function\ncalls to have one entry per line by adding a newline after the opening\nbracket and a new line before the closing bracket lines. For example:\n\n    [\n      foo,\n      bar\n    ]\n\nIf there are no newlines around the brackets, then the formatter will\ntry to fit everything on a single line, such that the snippet below\n\n    [foo,\n     bar]\n\nwill be formatted as\n\n    [foo, bar]\n\nYou can also force function calls and keywords to be rendered on multiple\nlines by having each entry on its own line:\n\n    defstruct name: nil,\n              age: 0\n\nThe code above will be kept with one keyword entry per line by the\nformatter. To avoid that, just squash everything into a single line.\n\n### Parens and no parens in function calls\n\nElixir has two syntaxes for function calls. With parens and no parens.\nBy default, Elixir will add parens to all calls except for:\n\n  1. calls that have `do`-`end` blocks\n  2. local calls without parens where the name and arity of the local\n     call is also listed under `:locals_without_parens` (except for\n     calls with arity 0, where the compiler always require parens)\n\nThe choice of parens and no parens also affects indentation. When a\nfunction call with parens doesn\'t fit on the same line, the formatter\nintroduces a newline around parens and indents the arguments with two\nspaces:\n\n    some_call(\n      arg1,\n      arg2,\n      arg3\n    )\n\nOn the other hand, function calls without parens are always indented\nby the function call length itself, like this:\n\n    some_call arg1,\n              arg2,\n              arg3\n\nIf the last argument is a data structure, such as maps and lists, and\nthe beginning of the data structure fits on the same line as the function\ncall, then no indentation happens, this allows code like this:\n\n    Enum.reduce(some_collection, initial_value, fn element, acc ->\n      # code\n    end)\n\n    some_function_without_parens %{\n      foo: :bar,\n      baz: :bat\n    }\n\n## Code comments\n\nThe formatter also handles code comments in a way to guarantee a space\nis always added between the beginning of the comment (#) and the next\ncharacter.\n\nThe formatter also extracts all trailing comments to their previous line.\nFor example, the code below\n\n    hello #world\n\nwill be rewritten to\n\n    # world\n    hello\n\nBecause code comments are handled apart from the code representation (AST),\nthere are some situations where code comments are seen as ambiguous by the\ncode formatter. For example, the comment in the anonymous function below\n\n    fn\n      arg1 ->\n        body1\n        # comment\n\n      arg2 ->\n        body2\n    end\n\nand in this one\n\n    fn\n      arg1 ->\n        body1\n\n      # comment\n      arg2 ->\n        body2\n    end\n\nare considered equivalent (the nesting is discarded alongside most of\nuser formatting). In such cases, the code formatter will always format to\nthe latter.\n\n## Newlines\n\nThe formatter converts all newlines in code from `\\r\\n` to `\\n`.\n',
    },
    {
      name: "format_file!/2",
      type: "function",
      specs: [
        "@spec format_file!(\n        binary(),\n        keyword()\n      ) :: iodata()",
      ],
      documentation:
        "Formats a file.\n\nSee `format_string!/2` for more information on code formatting and\navailable options.\n",
    },
    {
      name: "fetch_docs/1",
      type: "function",
      specs: [
        "@spec fetch_docs(module() | String.t()) ::\n        {:docs_v1, annotation, beam_language, format, module_doc :: doc_content,\n         metadata, docs :: [doc_element]}\n        | {:error,\n           :module_not_found\n           | :chunk_not_found\n           | {:invalid_chunk, binary()}\n           | :invalid_beam}\n      when annotation: :erl_anno.anno(),\n           beam_language: :elixir | :erlang | atom(),\n           doc_content: %{optional(binary()) => binary()} | :none | :hidden,\n           doc_element:\n             {{kind :: atom(), function_name :: atom(), arity()}, annotation,\n              signature, doc_content, metadata},\n           format: binary(),\n           signature: [binary()],\n           metadata: map()",
      ],
      documentation:
        'Returns the docs for the given module or path to `.beam` file.\n\nWhen given a module name, it finds its BEAM code and reads the docs from it.\n\nWhen given a path to a `.beam` file, it will load the docs directly from that\nfile.\n\nIt returns the term stored in the documentation chunk in the format defined by\n[EEP 48](https://www.erlang.org/eeps/eep-0048.html) or `{:error, reason}` if\nthe chunk is not available.\n\n## Examples\n\n    # Module documentation of an existing module\n    iex> {:docs_v1, _, :elixir, _, %{"en" => module_doc}, _, _} = Code.fetch_docs(Atom)\n    iex> module_doc |> String.split("\\n") |> Enum.at(0)\n    "Atoms are constants whose values are their own name."\n\n    # A module that doesn\'t exist\n    iex> Code.fetch_docs(ModuleNotGood)\n    {:error, :module_not_found}\n\n',
    },
    {
      name: "eval_string/3",
      type: "function",
      specs: [
        "@spec eval_string(List.Chars.t(), binding(), Macro.Env.t() | keyword()) ::\n        {term(), binding()}",
      ],
      documentation:
        'Evaluates the contents given by `string`.\n\nThe `binding` argument is a list of all variables and their values.\nThe `opts` argument is a keyword list of environment options.\n\n**Warning**: `string` can be any Elixir code and will be executed with\nthe same privileges as the Erlang VM: this means that such code could\ncompromise the machine (for example by executing system commands).\nDon\'t use `eval_string/3` with untrusted input (such as strings coming\nfrom the network).\n\n## Options\n\nOptions can be:\n\n  * `:file` - the file to be considered in the evaluation\n\n  * `:line` - the line on which the script starts\n\nAdditionally, you may also pass an environment as second argument,\nso the evaluation happens within that environment.\n\nReturns a tuple of the form `{value, binding}`, where `value` is the value\nreturned from evaluating `string`. If an error occurs while evaluating\n`string`, an exception will be raised.\n\n`binding` is a list with all variable names and their values after evaluating\n`string`. The binding keys are usually atoms, but they may be a tuple for variables\ndefined in a different context. The names are in no particular order.\n\n## Examples\n\n    iex> {result, binding} = Code.eval_string("a + b", [a: 1, b: 2], file: __ENV__.file, line: __ENV__.line)\n    iex> result\n    3\n    iex> Enum.sort(binding)\n    [a: 1, b: 2]\n\n    iex> {result, binding} = Code.eval_string("c = a + b", [a: 1, b: 2], __ENV__)\n    iex> result\n    3\n    iex> Enum.sort(binding)\n    [a: 1, b: 2, c: 3]\n\n    iex> {result, binding} = Code.eval_string("a = a + b", [a: 1, b: 2])\n    iex> result\n    3\n    iex> Enum.sort(binding)\n    [a: 3, b: 2]\n\nFor convenience, you can pass `__ENV__/0` as the `opts` argument and\nall imports, requires and aliases defined in the current environment\nwill be automatically carried over:\n\n    iex> {result, binding} = Code.eval_string("a + b", [a: 1, b: 2], __ENV__)\n    iex> result\n    3\n    iex> Enum.sort(binding)\n    [a: 1, b: 2]\n\n',
    },
    {
      name: "eval_quoted_with_env/4",
      type: "function",
      specs: [
        "@spec eval_quoted_with_env(Macro.t(), binding(), Macro.Env.t(), keyword()) ::\n        {term(), binding(), Macro.Env.t()}",
      ],
      documentation:
        "Evaluates the given `quoted` contents with `binding` and `env`.\n\nThis function is meant to be called in a loop, to implement features\nsuch as interactive shells or anything else with multiple evaluations.\nTherefore, the first time you call this function, you must compute\nthe initial environment with `env_for_eval/1`. The remaining calls\nmust pass the environment that was returned by this function.\n\n## Options\n\n  * `:prune_binding` - (since v1.14.2) prune binding to keep only\n    variables read or written by the evaluated code. Note that\n    variables used by modules are always pruned, even if later used\n    by the modules. You can submit to the `:on_module` tracer event\n    and access the variables used by the module from its environment.\n\n",
    },
    {
      name: "eval_quoted/3",
      type: "function",
      specs: [
        "@spec eval_quoted(Macro.t(), binding(), Macro.Env.t() | keyword()) ::\n        {term(), binding()}",
      ],
      documentation:
        "Evaluates the quoted contents.\n\n**Warning**: Calling this function inside a macro is considered bad\npractice as it will attempt to evaluate runtime values at compile time.\nMacro arguments are typically transformed by unquoting them into the\nreturned quoted expressions (instead of evaluated).\n\nSee `eval_string/3` for a description of `binding` and `opts`.\n\n## Examples\n\n    iex> contents = quote(do: var!(a) + var!(b))\n    iex> {result, binding} = Code.eval_quoted(contents, [a: 1, b: 2], file: __ENV__.file, line: __ENV__.line)\n    iex> result\n    3\n    iex> Enum.sort(binding)\n    [a: 1, b: 2]\n\nFor convenience, you can pass `__ENV__/0` as the `opts` argument and\nall options will be automatically extracted from the current environment:\n\n    iex> contents = quote(do: var!(a) + var!(b))\n    iex> {result, binding} = Code.eval_quoted(contents, [a: 1, b: 2], __ENV__)\n    iex> result\n    3\n    iex> Enum.sort(binding)\n    [a: 1, b: 2]\n\n",
    },
    {
      name: "eval_file/2",
      type: "function",
      specs: [
        "@spec eval_file(binary(), nil | binary()) :: {term(), binding()}",
      ],
      documentation:
        "Evaluates the given file.\n\nAccepts `relative_to` as an argument to tell where the file is located.\n\nWhile `require_file/2` and `compile_file/2` return the loaded modules and their\nbytecode, `eval_file/2` simply evaluates the file contents and returns the\nevaluation result and its binding (exactly the same return value as `eval_string/3`).\n",
    },
    {
      name: "env_for_eval/1",
      type: "function",
      specs: [],
      documentation:
        "Returns an environment for evaluation.\n\nIt accepts either a `Macro.Env`, that is then pruned and prepared,\nor a list of options. It returns an environment that is ready for\nevaluation.\n\nMost functions in this module will automatically prepare the given\nenvironment for evaluation, so you don't need to explicitly call\nthis function, with the exception of `eval_quoted_with_env/3`,\nwhich was designed precisely to be called in a loop, to implement\nfeatures such as interactive shells or anything else with multiple\nevaluations.\n\n## Options\n\nIf an env is not given, the options can be:\n\n  * `:file` - the file to be considered in the evaluation\n\n  * `:line` - the line on which the script starts\n",
    },
    {
      name: "ensure_loaded?/1",
      type: "function",
      specs: ["@spec ensure_loaded?(module()) :: boolean()"],
      documentation:
        "Ensures the given module is loaded.\n\nSimilar to `ensure_loaded/1`, but returns `true` if the module\nis already loaded or was successfully loaded. Returns `false`\notherwise.\n\n## Examples\n\n    iex> Code.ensure_loaded?(String)\n    true\n\n",
    },
    {
      name: "ensure_loaded!/1",
      type: "function",
      specs: ["@spec ensure_loaded!(module()) :: module()"],
      documentation:
        "Same as `ensure_loaded/1` but raises if the module cannot be loaded.\n",
    },
    {
      name: "ensure_loaded/1",
      type: "function",
      specs: [
        "@spec ensure_loaded(module()) ::\n        {:module, module()}\n        | {:error, :embedded | :badfile | :nofile | :on_load_failure}",
      ],
      documentation:
        "Ensures the given module is loaded.\n\nIf the module is already loaded, this works as no-op. If the module\nwas not yet loaded, it tries to load it.\n\nIf it succeeds in loading the module, it returns `{:module, module}`.\nIf not, returns `{:error, reason}` with the error reason.\n\nSee the module documentation for more information on code loading.\n\n## Examples\n\n    iex> Code.ensure_loaded(Atom)\n    {:module, Atom}\n\n    iex> Code.ensure_loaded(DoesNotExist)\n    {:error, :nofile}\n\n",
    },
    {
      name: "ensure_compiled!/1",
      type: "function",
      specs: ["@spec ensure_compiled!(module()) :: module()"],
      documentation:
        "Ensures the given module is compiled and loaded.\n\nIf the module is already loaded, it works as no-op. If the module was\nnot compiled yet, `ensure_compiled!/1` halts the compilation of the caller\nuntil the module given to `ensure_compiled!/1` becomes available or\nall files for the current project have been compiled. If compilation\nfinishes and the module is not available or is in a deadlock, an error\nis raised.\n\nGiven this function halts compilation, use it carefully. In particular,\navoid using it to guess which modules are in the system. Overuse of this\nfunction can also lead to deadlocks, where two modules check at the same time\nif the other is compiled. This returns a specific unavailable error code,\nwhere we cannot successfully verify a module is available or not.\n\nSee the module documentation for more information on code loading.\n",
    },
    {
      name: "ensure_compiled/1",
      type: "function",
      specs: [
        "@spec ensure_compiled(module()) ::\n        {:module, module()}\n        | {:error,\n           :embedded | :badfile | :nofile | :on_load_failure | :unavailable}",
      ],
      documentation:
        "Similar to `ensure_compiled!/1` but indicates you can continue without said module.\n\nWhile `ensure_compiled!/1` indicates to the Elixir compiler you can\nonly continue when said module is available, this function indicates\nyou may continue compilation without said module.\n\nIf it succeeds in loading the module, it returns `{:module, module}`.\nIf not, returns `{:error, reason}` with the error reason.\nIf the module being checked is currently in a compiler deadlock,\nthis function returns `{:error, :unavailable}`. Unavailable doesn't\nnecessarily mean the module doesn't exist, just that it is not currently\navailable, but it (or may not) become available in the future.\n\nTherefore, if you can only continue if the module is available, use\n`ensure_compiled!/1` instead. In particular, do not do this:\n\n    case Code.ensure_compiled(module) do\n      {:module, _} -> module\n      {:error, _} -> raise ...\n    end\n\nSee the module documentation for more information on code loading.\n",
    },
    {
      name: "ensure_all_loaded!/1",
      type: "function",
      specs: ["@spec ensure_all_loaded!([module()]) :: :ok"],
      documentation:
        "Same as `ensure_all_loaded/1` but raises if any of the modules cannot be loaded.\n",
    },
    {
      name: "ensure_all_loaded/1",
      type: "function",
      specs: [
        "@spec ensure_all_loaded([module()]) :: :ok | {:error, [{module(), reason}]}\n      when reason: :badfile | :nofile | :on_load_failure",
      ],
      documentation:
        "Ensures the given modules are loaded.\n\nSimilar to `ensure_loaded/1`, but accepts a list of modules instead of a single\nmodule, and loads all of them.\n\nIf all modules load successfully, returns `:ok`. Otherwise, returns `{:error, errors}`\nwhere `errors` is a list of tuples made of the module and the reason it failed to load.\n\n## Examples\n\n    iex> Code.ensure_all_loaded([Atom, String])\n    :ok\n\n    iex> Code.ensure_all_loaded([Atom, DoesNotExist])\n    {:error, [{DoesNotExist, :nofile}]}\n\n",
    },
    {
      name: "delete_paths/1",
      type: "function",
      specs: ["@spec delete_paths([Path.t()]) :: :ok"],
      documentation:
        "Deletes a list of paths from the Erlang VM code path list.\n\nThis is the list of directories the Erlang VM uses for finding\nmodule code. The list of files is managed per Erlang VM node.\n\nThe path is expanded with `Path.expand/1` before being deleted. If the\npath does not exist, this function returns `false`.\n",
    },
    {
      name: "delete_path/1",
      type: "function",
      specs: ["@spec delete_path(Path.t()) :: boolean()"],
      documentation:
        'Deletes a path from the Erlang VM code path list.\n\nThis is the list of directories the Erlang VM uses for finding\nmodule code. The list of files is managed per Erlang VM node.\n\nThe path is expanded with `Path.expand/1` before being deleted. If the\npath does not exist, this function returns `false`.\n\n## Examples\n\n    Code.prepend_path(".")\n    Code.delete_path(".")\n    #=> true\n\n    Code.delete_path("/does_not_exist")\n    #=> false\n\n',
    },
    {
      name: "compiler_options/1",
      type: "function",
      specs: [
        "@spec compiler_options(Enumerable.t({atom(), term()})) :: %{\n        optional(atom()) => term()\n      }",
      ],
      documentation:
        "Stores all given compilation options.\n\nChanging the compilation options affect all processes\nrunning in a given Erlang VM node. To store individual\noptions and for a description of all options, see\n`put_compiler_option/2`.\n\nReturns a map with previous values.\n\n## Examples\n\n    Code.compiler_options(warnings_as_errors: true)\n    #=> %{warnings_as_errors: false}\n\n",
    },
    {
      name: "compiler_options/0",
      type: "function",
      specs: ["@spec compiler_options() :: map()"],
      documentation:
        "Gets all compilation options from the code server.\n\nTo get individual options, see `get_compiler_option/1`.\nFor a description of all options, see `put_compiler_option/2`.\n\n## Examples\n\n    Code.compiler_options()\n    #=> %{debug_info: true, docs: true, ...}\n\n",
    },
    {
      name: "compile_string/2",
      type: "function",
      specs: [
        "@spec compile_string(List.Chars.t(), binary()) :: [{module(), binary()}]",
      ],
      documentation:
        "Compiles the given string.\n\nReturns a list of tuples where the first element is the module name\nand the second one is its bytecode (as a binary). A `file` can be\ngiven as a second argument which will be used for reporting warnings\nand errors.\n\n**Warning**: `string` can be any Elixir code and code can be executed with\nthe same privileges as the Erlang VM: this means that such code could\ncompromise the machine (for example by executing system commands).\nDon't use `compile_string/2` with untrusted input (such as strings coming\nfrom the network).\n",
    },
    {
      name: "compile_quoted/2",
      type: "function",
      specs: [
        "@spec compile_quoted(Macro.t(), binary()) :: [{module(), binary()}]",
      ],
      documentation:
        "Compiles the quoted expression.\n\nReturns a list of tuples where the first element is the module name and\nthe second one is its bytecode (as a binary). A `file` can be\ngiven as second argument which will be used for reporting warnings\nand errors.\n",
    },
    {
      name: "compile_file/2",
      type: "function",
      specs: [
        "@spec compile_file(binary(), nil | binary()) :: [{module(), binary()}]",
      ],
      documentation:
        "Compiles the given file.\n\nAccepts `relative_to` as an argument to tell where the file is located.\n\nReturns a list of tuples where the first element is the module name and\nthe second one is its bytecode (as a binary). Opposite to `require_file/2`,\nit does not track the filename of the compiled file.\n\nIf you would like to get the result of evaluating file rather than the\nmodules defined in it, see `eval_file/2`.\n\nFor compiling many files concurrently, see `Kernel.ParallelCompiler.compile/2`.\n",
    },
    {
      name: "can_await_module_compilation?/0",
      type: "function",
      specs: ["@spec can_await_module_compilation?() :: boolean()"],
      documentation:
        "Returns `true` if the current process can await for module compilation.\n\nWhen compiling Elixir code via `Kernel.ParallelCompiler`, which is\nused by Mix and `elixirc`, calling a module that has not yet been\ncompiled will block the caller until the module becomes available.\nExecuting Elixir scripts, such as passing a filename to `elixir`,\ndoes not await.\n",
    },
    {
      name: "available_compiler_options/0",
      type: "function",
      specs: ["@spec available_compiler_options() :: [atom()]"],
      documentation:
        "Returns a list with all available compiler options.\n\nFor a description of all options, see `put_compiler_option/2`.\n\n## Examples\n\n    Code.available_compiler_options()\n    #=> [:docs, :debug_info, ...]\n\n",
    },
    {
      name: "append_paths/2",
      type: "function",
      specs: ["@spec append_paths([Path.t()], [{:cache, boolean()}]) :: :ok"],
      documentation:
        'Appends a list of `paths` to the Erlang VM code path list.\n\nThis is the list of directories the Erlang VM uses for\nfinding module code. The list of files is managed per Erlang\nVM node.\n\nAll paths are expanded with `Path.expand/1` before being appended.\nOnly existing paths are appended. This function always returns `:ok`,\nregardless of how many paths were appended. Use `append_path/1`\nif you need more control.\n\n## Examples\n\n    Code.append_paths([".", "/does_not_exist"])\n    #=> :ok\n\n## Options\n\n  * `:cache` - when true, the code path is cached the first time\n    it is traversed in order to reduce file system operations.\n    It requires Erlang/OTP 26, otherwise it is a no-op.\n',
    },
    {
      name: "append_path/2",
      type: "function",
      specs: [
        "@spec append_path(Path.t(), [{:cache, boolean()}]) :: true | false",
      ],
      documentation:
        'Appends a path to the Erlang VM code path list.\n\nThis is the list of directories the Erlang VM uses for\nfinding module code. The list of files is managed per Erlang\nVM node.\n\nThe path is expanded with `Path.expand/1` before being appended.\nIt requires the path to exist. Returns a boolean indicating if\nthe path was successfully added.\n\n## Examples\n\n    Code.append_path(".")\n    #=> true\n\n    Code.append_path("/does_not_exist")\n    #=> false\n\n## Options\n\n  * `:cache` - (since v1.15.0) when true, the code path is cached\n    the first time it is traversed in order to reduce file system\n    operations. It requires Erlang/OTP 26, otherwise it is a no-op.\n\n',
    },
  ],
  name: "Code",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "position/0",
      type: "type",
      specs: [
        "@type position() :: line() | {line :: pos_integer(), column :: pos_integer()}",
      ],
      documentation:
        "The position of the diagnostic.\n\nCan be either a line number or a `{line, column}`.\nLine and columns numbers are one-based.\nA position of `0` represents unknown.\n",
    },
    {
      name: "line/0",
      type: "type",
      specs: ["@type line() :: non_neg_integer()"],
      documentation: "The line. 0 indicates no line.",
    },
    {
      name: "diagnostic/1",
      type: "type",
      specs: [
        "@type diagnostic(severity) :: %{\n        :source => Path.t() | nil,\n        :file => Path.t() | nil,\n        :severity => severity,\n        :message => String.t(),\n        :position => position(),\n        :stacktrace => Exception.stacktrace(),\n        :span => {line :: pos_integer(), column :: pos_integer()} | nil,\n        optional(:details) => term(),\n        optional(any()) => any()\n      }",
      ],
      documentation:
        "Diagnostics returned by the compiler and code evaluation.\n\nThe file and position relate to where the diagnostic should be shown.\nIf there is a file and position, then the diagnostic is precise\nand you can use the given file and position for generating snippets,\nIDEs annotations, and so on. An optional span is available with\nthe line and column the diagnostic ends.\n\nOtherwise, a stacktrace may be given, which you can place your own\nheuristics to provide better reporting.\n\nThe source field points to the source file the compiler tracked\nthe error to. For example, a file `lib/foo.ex` may embed `.eex`\ntemplates from `lib/foo/bar.eex`. A syntax error on the EEx template\nwill point to file `lib/foo/bar.eex` but the source is `lib/foo.ex`.\n",
    },
    {
      name: "binding/0",
      type: "type",
      specs: ["@type binding() :: [{atom() | tuple(), any()}]"],
      documentation:
        "A list with all variables and their values.\n\nThe binding keys are usually atoms, but they may be a tuple for variables\ndefined in a different context.\n",
    },
  ],
};
