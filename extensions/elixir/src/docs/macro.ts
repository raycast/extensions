import type { ModuleDoc } from "../types";

export const Macro: ModuleDoc = {
  functions: [
    {
      name: "var/2",
      type: "function",
      specs: [
        "@spec var(var, context) :: {var, [], context} when var: atom(), context: atom()",
      ],
      documentation:
        "Generates an AST node representing the variable given\nby the atoms `var` and `context`.\n\nNote this variable is not unique. If you later on want\nto access this same variable, you can invoke `var/2`\nagain with the same arguments. Use `unique_var/2` to\ngenerate a unique variable that can't be overridden.\n\n## Examples\n\nIn order to build a variable, a context is expected.\nMost of the times, in order to preserve hygiene, the\ncontext must be `__MODULE__/0`:\n\n    iex> Macro.var(:foo, __MODULE__)\n    {:foo, [], __MODULE__}\n\nHowever, if there is a need to access the user variable,\nnil can be given:\n\n    iex> Macro.var(:foo, nil)\n    {:foo, [], nil}\n\n",
    },
    {
      name: "validate/1",
      type: "function",
      specs: ["@spec validate(term()) :: :ok | {:error, term()}"],
      documentation:
        "Validates the given expressions are valid quoted expressions.\n\nCheck the type `t:Macro.t/0` for a complete specification of a\nvalid quoted expression.\n\nIt returns `:ok` if the expression is valid. Otherwise it returns\na tuple in the form of `{:error, remainder}` where `remainder` is\nthe invalid part of the quoted expression.\n\n## Examples\n\n    iex> Macro.validate({:two_element, :tuple})\n    :ok\n    iex> Macro.validate({:three, :element, :tuple})\n    {:error, {:three, :element, :tuple}}\n\n    iex> Macro.validate([1, 2, 3])\n    :ok\n    iex> Macro.validate([1, 2, 3, {4}])\n    {:error, {4}}\n\n",
    },
    {
      name: "update_meta/2",
      type: "function",
      specs: ["@spec update_meta(t(), (keyword() -> keyword())) :: t()"],
      documentation:
        "Applies the given function to the node metadata if it contains one.\n\nThis is often useful when used with `Macro.prewalk/2` to remove\ninformation like lines and hygienic counters from the expression\nfor either storage or comparison.\n\n## Examples\n\n    iex> quoted = quote line: 10, do: sample()\n    {:sample, [line: 10], []}\n    iex> Macro.update_meta(quoted, &Keyword.delete(&1, :line))\n    {:sample, [], []}\n\n",
    },
    {
      name: "unpipe/1",
      type: "function",
      specs: ["@spec unpipe(t()) :: [t()]"],
      documentation:
        "Breaks a pipeline expression into a list.\n\nThe AST for a pipeline (a sequence of applications of `|>/2`) is similar to the\nAST of a sequence of binary operators or function applications: the top-level\nexpression is the right-most `:|>` (which is the last one to be executed), and\nits left-hand and right-hand sides are its arguments:\n\n    quote do: 100 |> div(5) |> div(2)\n    #=> {:|>, _, [arg1, arg2]}\n\nIn the example above, the `|>/2` pipe is the right-most pipe; `arg1` is the AST\nfor `100 |> div(5)`, and `arg2` is the AST for `div(2)`.\n\nIt's often useful to have the AST for such a pipeline as a list of function\napplications. This function does exactly that:\n\n    Macro.unpipe(quote do: 100 |> div(5) |> div(2))\n    #=> [{100, 0}, {{:div, [], [5]}, 0}, {{:div, [], [2]}, 0}]\n\nWe get a list that follows the pipeline directly: first the `100`, then the\n`div(5)` (more precisely, its AST), then `div(2)`. The `0` as the second\nelement of the tuples is the position of the previous element in the pipeline\ninside the current function application: `{{:div, [], [5]}, 0}` means that the\nprevious element (`100`) will be inserted as the 0th (first) argument to the\n`div/2` function, so that the AST for that function will become `{:div, [],\n[100, 5]}` (`div(100, 5)`).\n",
    },
    {
      name: "unique_var/2",
      type: "function",
      specs: [
        "@spec unique_var(var, context) :: {var, [{:counter, integer()}], context}\n      when var: atom(), context: atom()",
      ],
      documentation:
        "Generates an AST node representing a unique variable\ngiven by the atoms `var` and `context`.\n\nCalling this function with the same arguments will\ngenerate another variable, with its own unique counter.\nSee `var/2` for an alternative.\n\n## Examples\n\n    iex> {:foo, [counter: c], __MODULE__} = Macro.unique_var(:foo, __MODULE__)\n    iex> is_integer(c)\n    true\n\n",
    },
    {
      name: "unescape_string/2",
      type: "function",
      specs: [
        "@spec unescape_string(String.t(), (non_neg_integer() ->\n                                     non_neg_integer() | false)) :: String.t()",
      ],
      documentation:
        'Unescapes characters in a string according to the given mapping.\n\nCheck `unescape_string/1` if you want to use the same mapping\nas Elixir single- and double-quoted strings.\n\n## Mapping function\n\nThe mapping function receives an integer representing the code point\nof the character it wants to unescape. There are also the special atoms\n`:newline`, `:unicode`, and `:hex`, which control newline, unicode,\nand escaping respectively.\n\nHere is the default mapping function implemented by Elixir:\n\n    def unescape_map(:newline), do: true\n    def unescape_map(:unicode), do: true\n    def unescape_map(:hex), do: true\n    def unescape_map(?0), do: ?0\n    def unescape_map(?a), do: ?\\a\n    def unescape_map(?b), do: ?\\b\n    def unescape_map(?d), do: ?\\d\n    def unescape_map(?e), do: ?\\e\n    def unescape_map(?f), do: ?\\f\n    def unescape_map(?n), do: ?\\n\n    def unescape_map(?r), do: ?\\r\n    def unescape_map(?s), do: ?\\s\n    def unescape_map(?t), do: ?\\t\n    def unescape_map(?v), do: ?\\v\n    def unescape_map(e), do: e\n\nIf the `unescape_map/1` function returns `false`, the char is\nnot escaped and the backslash is kept in the string.\n\n## Examples\n\nUsing the `unescape_map/1` function defined above is easy:\n\n    Macro.unescape_string("example\\\\n", &unescape_map(&1))\n\n',
    },
    {
      name: "unescape_string/1",
      type: "function",
      specs: ["@spec unescape_string(String.t()) :: String.t()"],
      documentation:
        'Unescapes characters in a string.\n\nThis is the unescaping behaviour used by default in Elixir\nsingle- and double-quoted strings. Check `unescape_string/2`\nfor information on how to customize the escaping map.\n\nIn this setup, Elixir will escape the following: `\\0`, `\\a`, `\\b`,\n`\\d`, `\\e`, `\\f`, `\\n`, `\\r`, `\\s`, `\\t` and `\\v`. Bytes can be\ngiven as hexadecimals via `\\xNN` and Unicode code points as\n`\\uNNNN` escapes.\n\nThis function is commonly used on sigil implementations\n(like `~r`, `~s` and others), which receive a raw, unescaped\nstring, and it can be used anywhere that needs to mimic how\nElixir parses strings.\n\n## Examples\n\n    iex> Macro.unescape_string("example\\\\n")\n    "example\\n"\n\nIn the example above, we pass a string with `\\n` escaped\nand return a version with it unescaped.\n',
    },
    {
      name: "underscore/1",
      type: "function",
      specs: ["@spec underscore(module() | atom() | String.t()) :: String.t()"],
      documentation:
        'Converts the given argument to a string with the underscore-slash format.\n\nThe argument must either be an atom or a string.\nIf an atom is given, it is assumed to be an Elixir module,\nso it is converted to a string and then processed.\n\nThis function was designed to format language identifiers/tokens with the underscore-slash format,\nthat\'s why it belongs to the `Macro` module. Do not use it as a general\nmechanism for underscoring strings as it does not support Unicode or\ncharacters that are not valid in Elixir identifiers.\n\n## Examples\n\n    iex> Macro.underscore("FooBar")\n    "foo_bar"\n\n    iex> Macro.underscore("Foo.Bar")\n    "foo/bar"\n\n    iex> Macro.underscore(Foo.Bar)\n    "foo/bar"\n\nIn general, `underscore` can be thought of as the reverse of\n`camelize`, however, in some cases formatting may be lost:\n\n    iex> Macro.underscore("SAPExample")\n    "sap_example"\n\n    iex> Macro.camelize("sap_example")\n    "SapExample"\n\n    iex> Macro.camelize("hello_10")\n    "Hello10"\n\n    iex> Macro.camelize("foo/bar")\n    "Foo.Bar"\n\n',
    },
    {
      name: "traverse/4",
      type: "function",
      specs: [
        "@spec traverse(t(), any(), (t(), any() -> {t(), any()}), (t(), any() ->\n                                                            {t(), any()})) ::\n        {t(), any()}",
      ],
      documentation:
        "Performs a depth-first traversal of quoted expressions\nusing an accumulator.\n\nReturns a tuple where the first element is a new AST and the second one is\nthe final accumulator. The new AST is the result of invoking `pre` on each\nnode of `ast` during the pre-order phase and `post` during the post-order\nphase.\n\n## Examples\n\n    iex> ast = quote do: 5 + 3 * 7\n    iex> {:+, _, [5, {:*, _, [3, 7]}]} = ast\n    iex> {new_ast, acc} =\n    ...>  Macro.traverse(\n    ...>    ast,\n    ...>    [],\n    ...>    fn\n    ...>      {:+, meta, children}, acc -> {{:-, meta, children}, [:- | acc]}\n    ...>      {:*, meta, children}, acc -> {{:/, meta, children}, [:/ | acc]}\n    ...>      other, acc -> {other, acc}\n    ...>    end,\n    ...>    fn\n    ...>      {:-, meta, children}, acc -> {{:min, meta, children}, [:min | acc]}\n    ...>      {:/, meta, children}, acc -> {{:max, meta, children}, [:max | acc]}\n    ...>      other, acc -> {other, acc}\n    ...>    end\n    ...>  )\n    iex> {:min, _, [5, {:max, _, [3, 7]}]} = new_ast\n    iex> [:min, :max, :/, :-] = acc\n    iex> Code.eval_quoted(new_ast)\n    {5, []}\n\n",
    },
    {
      name: "to_string/2",
      type: "function",
      specs: [
        "@spec to_string(t(), (t(), String.t() -> String.t())) :: String.t()",
      ],
      documentation:
        'Converts the given expression AST to a string.\n\nThe given `fun` is called for every node in the AST with two arguments: the\nAST of the node being printed and the string representation of that same\nnode. The return value of this function is used as the final string\nrepresentation for that AST node.\n\nThis function discards all formatting of the original code.\n\n## Examples\n\n    Macro.to_string(quote(do: 1 + 2), fn\n      1, _string -> "one"\n      2, _string -> "two"\n      _ast, string -> string\n    end)\n    #=> "one + two"\n\n',
    },
    {
      name: "to_string/1",
      type: "function",
      specs: ["@spec to_string(t()) :: String.t()"],
      documentation:
        'Converts the given expression AST to a string.\n\nThis is a convenience function for converting AST into\na string, which discards all formatting of the original\ncode and wraps newlines around 98 characters. See\n`Code.quoted_to_algebra/2` as a lower level function\nwith more control around formatting.\n\n## Examples\n\n    iex> Macro.to_string(quote(do: foo.bar(1, 2, 3)))\n    "foo.bar(1, 2, 3)"\n\n',
    },
    {
      name: "struct!/2",
      type: "function",
      specs: [
        "@spec struct!(module, Macro.Env.t()) :: %{\n        :__struct__ => module,\n        optional(atom()) => any()\n      }\n      when module: module()",
      ],
      documentation:
        "Expands the struct given by `module` in the given `env`.\n\nThis is useful when a struct needs to be expanded at\ncompilation time and the struct being expanded may or may\nnot have been compiled. This function is also capable of\nexpanding structs defined under the module being compiled.\n\nIt will raise `CompileError` if the struct is not available.\nFrom Elixir v1.12, calling this function also adds an export\ndependency on the given struct.\n",
    },
    {
      name: "special_form?/2",
      type: "function",
      specs: ["@spec special_form?(name :: atom(), arity()) :: boolean()"],
      documentation:
        "Returns `true` if the given name and arity is a special form.\n",
    },
    {
      name: "quoted_literal?/1",
      type: "function",
      specs: ["@spec quoted_literal?(t()) :: boolean()"],
      documentation:
        'Returns `true` if the given quoted expression represents a quoted literal.\n\nAtoms and numbers are always literals. Binaries, lists, tuples,\nmaps, and structs are only literals if all of their terms are also literals.\n\n## Examples\n\n    iex> Macro.quoted_literal?(quote(do: "foo"))\n    true\n    iex> Macro.quoted_literal?(quote(do: {"foo", 1}))\n    true\n    iex> Macro.quoted_literal?(quote(do: {"foo", 1, :baz}))\n    true\n    iex> Macro.quoted_literal?(quote(do: %{foo: "bar"}))\n    true\n    iex> Macro.quoted_literal?(quote(do: %URI{path: "/"}))\n    true\n    iex> Macro.quoted_literal?(quote(do: URI.parse("/")))\n    false\n    iex> Macro.quoted_literal?(quote(do: {foo, var}))\n    false\n\n',
    },
    {
      name: "prewalker/1",
      type: "function",
      specs: ["@spec prewalker(t()) :: Enumerable.t()"],
      documentation:
        'Returns an enumerable that traverses the  `ast` in depth-first,\npre-order traversal.\n\n## Examples\n\n    iex> ast = quote do: foo(1, "abc")\n    iex> Enum.map(Macro.prewalker(ast), & &1)\n    [{:foo, [], [1, "abc"]}, 1, "abc"]\n\n',
    },
    {
      name: "prewalk/3",
      type: "function",
      specs: [
        "@spec prewalk(t(), any(), (t(), any() -> {t(), any()})) :: {t(), any()}",
      ],
      documentation:
        "Performs a depth-first, pre-order traversal of quoted expressions\nusing an accumulator.\n\nReturns a tuple where the first element is a new AST where each node is the\nresult of invoking `fun` on each corresponding node and the second one is the\nfinal accumulator.\n\n## Examples\n\n    iex> ast = quote do: 5 + 3 * 7\n    iex> {:+, _, [5, {:*, _, [3, 7]}]} = ast\n    iex> {new_ast, acc} = Macro.prewalk(ast, [], fn\n    ...>   {:+, meta, children}, acc -> {{:*, meta, children}, [:+ | acc]}\n    ...>   {:*, meta, children}, acc -> {{:+, meta, children}, [:* | acc]}\n    ...>   other, acc -> {other, acc}\n    ...> end)\n    iex> {{:*, _, [5, {:+, _, [3, 7]}]}, [:*, :+]} = {new_ast, acc}\n    iex> Code.eval_quoted(ast)\n    {26, []}\n    iex> Code.eval_quoted(new_ast)\n    {50, []}\n\n",
    },
    {
      name: "prewalk/2",
      type: "function",
      specs: ["@spec prewalk(t(), (t() -> t())) :: t()"],
      documentation:
        "Performs a depth-first, pre-order traversal of quoted expressions.\n\nReturns a new AST where each node is the result of invoking `fun` on each\ncorresponding node of `ast`.\n\n## Examples\n\n    iex> ast = quote do: 5 + 3 * 7\n    iex> {:+, _, [5, {:*, _, [3, 7]}]} = ast\n    iex> new_ast = Macro.prewalk(ast, fn\n    ...>   {:+, meta, children} -> {:*, meta, children}\n    ...>   {:*, meta, children} -> {:+, meta, children}\n    ...>   other -> other\n    ...> end)\n    iex> {:*, _, [5, {:+, _, [3, 7]}]} = new_ast\n    iex> Code.eval_quoted(ast)\n    {26, []}\n    iex> Code.eval_quoted(new_ast)\n    {50, []}\n\n",
    },
    {
      name: "postwalker/1",
      type: "function",
      specs: ["@spec postwalker(t()) :: Enumerable.t()"],
      documentation:
        'Returns an enumerable that traverses the  `ast` in depth-first,\npost-order traversal.\n\n## Examples\n\n    iex> ast = quote do: foo(1, "abc")\n    iex> Enum.map(Macro.postwalker(ast), & &1)\n    [1, "abc", {:foo, [], [1, "abc"]}]\n\n',
    },
    {
      name: "postwalk/3",
      type: "function",
      specs: [
        "@spec postwalk(t(), any(), (t(), any() -> {t(), any()})) :: {t(), any()}",
      ],
      documentation:
        "This functions behaves like `prewalk/3`, but performs a depth-first,\npost-order traversal of quoted expressions using an accumulator.\n",
    },
    {
      name: "postwalk/2",
      type: "function",
      specs: ["@spec postwalk(t(), (t() -> t())) :: t()"],
      documentation:
        "This function behaves like `prewalk/2`, but performs a depth-first,\npost-order traversal of quoted expressions.\n",
    },
    {
      name: "pipe/3",
      type: "function",
      specs: ["@spec pipe(t(), t(), integer()) :: t()"],
      documentation:
        "Pipes `expr` into the `call_args` at the given `position`.\n\nThis function can be used to implement `|>` like functionality. For example,\n`|>` itself is implemented as:\n\n    defmacro left |> right do\n      Macro.pipe(left, right, 0)\n    end\n\n`expr` is the AST of an expression. `call_args` must be the AST *of a call*,\notherwise this function will raise an error. As an example, consider the pipe\noperator `|>/2`, which uses this function to build pipelines.\n\nEven if the expression is piped into the AST, it doesn't necessarily mean that\nthe AST is valid. For example, you could pipe an argument to `div/2`, effectively\nturning it into a call to `div/3`, which is a function that doesn't exist by\ndefault. The code will raise unless a `div/3` function is locally defined.\n",
    },
    {
      name: "path/2",
      type: "function",
      specs: ["@spec path(t(), (t() -> as_boolean(term()))) :: [t()] | nil"],
      documentation:
        "Returns the path to the node in `ast` for which `fun` returns a truthy value.\n\nThe path is a list, starting with the node in which `fun` returns\na truthy value, followed by all of its parents.\n\nReturns `nil` if `fun` returns only falsy values.\n\nComputing the path can be an efficient operation when you want\nto find a particular node in the AST within its context and then\nassert something about it.\n\n## Examples\n\n    iex> Macro.path(quote(do: [1, 2, 3]), & &1 == 3)\n    [3, [1, 2, 3]]\n\n    iex> Macro.path(quote(do: [1, 2]), & &1 == 5)\n    nil\n\n    iex> Macro.path(quote(do: Foo.bar(3)), & &1 == 3)\n    [3, quote(do: Foo.bar(3))]\n\n    iex> Macro.path(quote(do: %{foo: [bar: :baz]}), & &1 == :baz)\n    [\n      :baz,\n      {:bar, :baz},\n      [bar: :baz],\n      {:foo, [bar: :baz]},\n      {:%{}, [], [foo: [bar: :baz]]}\n    ]\n\n",
    },
    {
      name: "operator?/2",
      type: "function",
      specs: ["@spec operator?(name :: atom(), arity()) :: boolean()"],
      documentation:
        "Returns `true` if the given name and arity is an operator.\n\n## Examples\n\n    iex> Macro.operator?(:not_an_operator, 3)\n    false\n    iex> Macro.operator?(:.., 0)\n    true\n    iex> Macro.operator?(:+, 1)\n    true\n    iex> Macro.operator?(:++, 2)\n    true\n    iex> Macro.operator?(:..//, 3)\n    true\n\n",
    },
    {
      name: "inspect_atom/2",
      type: "function",
      specs: [
        "@spec inspect_atom(:literal | :key | :remote_call, atom()) :: binary()",
      ],
      documentation:
        'Inspects `atom` according to different source formats.\n\nThe atom can be inspected according to the three different\nformats it appears in the AST: as a literal (`:literal`),\nas a key (`:key`), or as the function name of a remote call\n(`:remote_call`).\n\n## Examples\n\n### As a literal\n\nLiterals include regular atoms, quoted atoms, operators,\naliases, and the special `nil`, `true`, and `false` atoms.\n\n    iex> Macro.inspect_atom(:literal, nil)\n    "nil"\n    iex> Macro.inspect_atom(:literal, :foo)\n    ":foo"\n    iex> Macro.inspect_atom(:literal, :<>)\n    ":<>"\n    iex> Macro.inspect_atom(:literal, :Foo)\n    ":Foo"\n    iex> Macro.inspect_atom(:literal, Foo.Bar)\n    "Foo.Bar"\n    iex> Macro.inspect_atom(:literal, :"with spaces")\n    ":\\"with spaces\\""\n\n### As a key\n\nInspect an atom as a key of a keyword list or a map.\n\n    iex> Macro.inspect_atom(:key, :foo)\n    "foo:"\n    iex> Macro.inspect_atom(:key, :<>)\n    "<>:"\n    iex> Macro.inspect_atom(:key, :Foo)\n    "Foo:"\n    iex> Macro.inspect_atom(:key, :"with spaces")\n    "\\"with spaces\\":"\n\n### As a remote call\n\nInspect an atom the function name of a remote call.\n\n    iex> Macro.inspect_atom(:remote_call, :foo)\n    "foo"\n    iex> Macro.inspect_atom(:remote_call, :<>)\n    "<>"\n    iex> Macro.inspect_atom(:remote_call, :Foo)\n    "\\"Foo\\""\n    iex> Macro.inspect_atom(:remote_call, :"with spaces")\n    "\\"with spaces\\""\n\n',
    },
    {
      name: "generate_unique_arguments/2",
      type: "function",
      specs: [
        "@spec generate_unique_arguments(0, context :: atom()) :: []",
        "@spec generate_unique_arguments(pos_integer(), context) :: [\n        {atom(), [{:counter, integer()}], context},\n        ...\n      ]\n      when context: atom()",
      ],
      documentation:
        "Generates AST nodes for a given number of required argument\nvariables using `Macro.unique_var/2`.\n\n## Examples\n\n    iex> [var1, var2] = Macro.generate_unique_arguments(2, __MODULE__)\n    iex> {:arg1, [counter: c1], __MODULE__} = var1\n    iex> {:arg2, [counter: c2], __MODULE__} = var2\n    iex> is_integer(c1) and is_integer(c2)\n    true\n\n",
    },
    {
      name: "generate_arguments/2",
      type: "function",
      specs: [
        "@spec generate_arguments(0, context :: atom()) :: []",
        "@spec generate_arguments(pos_integer(), context) :: [{atom(), [], context}, ...]\n      when context: atom()",
      ],
      documentation:
        "Generates AST nodes for a given number of required argument\nvariables using `Macro.var/2`.\n\nNote the arguments are not unique. If you later on want\nto access the same variables, you can invoke this function\nwith the same inputs. Use `generate_unique_arguments/2` to\ngenerate unique arguments that can't be overridden.\n\n## Examples\n\n    iex> Macro.generate_arguments(2, __MODULE__)\n    [{:arg1, [], __MODULE__}, {:arg2, [], __MODULE__}]\n\n",
    },
    {
      name: "expand_once/2",
      type: "function",
      specs: ["@spec expand_once(input(), Macro.Env.t()) :: output()"],
      documentation:
        "Receives an AST node and expands it once.\n\nThe following contents are expanded:\n\n  * Macros (local or remote)\n  * Aliases are expanded (if possible) and return atoms\n  * Compilation environment macros (`__CALLER__/0`, `__DIR__/0`, `__ENV__/0` and `__MODULE__/0`)\n  * Module attributes reader (`@foo`)\n\nIf the expression cannot be expanded, it returns the expression\nitself. This function does not traverse the AST, only the root\nnode is expanded. The expansion happens as if it was expanded by\nthe Elixir compiler and therefore compilation tracers will be invoked\nand deprecation warnings will be emitted during the expansion.\n\n`expand_once/2` performs the expansion just once. Check `expand/2`\nto perform expansion until the node can no longer be expanded.\n\n## Examples\n\nIn the example below, we have a macro that generates a module\nwith a function named `name_length` that returns the length\nof the module name. The value of this function will be calculated\nat compilation time and not at runtime.\n\nConsider the implementation below:\n\n    defmacro defmodule_with_length(name, do: block) do\n      length = length(Atom.to_charlist(name))\n\n      quote do\n        defmodule unquote(name) do\n          def name_length, do: unquote(length)\n          unquote(block)\n        end\n      end\n    end\n\nWhen invoked like this:\n\n    defmodule_with_length My.Module do\n      def other_function, do: ...\n    end\n\nThe compilation will fail because `My.Module` when quoted\nis not an atom, but a syntax tree as follows:\n\n    {:__aliases__, [], [:My, :Module]}\n\nThat said, we need to expand the aliases node above to an\natom, so we can retrieve its length. Expanding the node is\nnot straightforward because we also need to expand the\ncaller aliases. For example:\n\n    alias MyHelpers, as: My\n\n    defmodule_with_length My.Module do\n      def other_function, do: ...\n    end\n\nThe final module name will be `MyHelpers.Module` and not\n`My.Module`. With `Macro.expand/2`, such aliases are taken\ninto consideration. Local and remote macros are also\nexpanded. We could rewrite our macro above to use this\nfunction as:\n\n    defmacro defmodule_with_length(name, do: block) do\n      expanded = Macro.expand(name, __CALLER__)\n      length = length(Atom.to_charlist(expanded))\n\n      quote do\n        defmodule unquote(name) do\n          def name_length, do: unquote(length)\n          unquote(block)\n        end\n      end\n    end\n\n",
    },
    {
      name: "expand_literals/3",
      type: "function",
      specs: [
        "@spec expand_literals(t(), acc, (t(), acc -> {t(), acc})) :: t()\n      when acc: term()",
      ],
      documentation:
        "Expands all literals in `ast` with the given `acc` and `fun`.\n\n`fun` will be invoked with an expandable AST node and `acc` and\nmust return a new node with `acc`. This is a general version of\n`expand_literals/2` which supports a custom expansion function.\nPlease check `expand_literals/2` for use cases and pitfalls.\n",
    },
    {
      name: "expand_literals/2",
      type: "function",
      specs: ["@spec expand_literals(input(), Macro.Env.t()) :: output()"],
      documentation:
        "Expands all literals in `ast` with the given `env`.\n\nThis function is mostly used to remove compile-time dependencies\nfrom AST nodes. In such cases, the given environment is usually\nmanipulated to represent a function:\n\n    Macro.expand_literals(ast, %{env | function: {:my_code, 1}})\n\nAt the moment, the only expandable literal nodes in an AST are\naliases, so this function only expands aliases (and it does so\nanywhere in a literal).\n\nHowever, be careful when removing compile-time dependencies between\nmodules. If you remove them but you still invoke the module at\ncompile-time, Elixir will be unable to properly recompile modules\nwhen they change.\n",
    },
    {
      name: "expand/2",
      type: "function",
      specs: ["@spec expand(input(), Macro.Env.t()) :: output()"],
      documentation:
        "Receives an AST node and expands it until it can no longer\nbe expanded.\n\nNote this function does not traverse the AST, only the root\nnode is expanded.\n\nThis function uses `expand_once/2` under the hood. Check\nit out for more information and examples.\n",
    },
    {
      name: "escape/2",
      type: "function",
      specs: [
        "@spec escape(\n        term(),\n        keyword()\n      ) :: t()",
      ],
      documentation:
        "Recursively escapes a value so it can be inserted into a syntax tree.\n\n## Examples\n\n    iex> Macro.escape(:foo)\n    :foo\n\n    iex> Macro.escape({:a, :b, :c})\n    {:{}, [], [:a, :b, :c]}\n\n    iex> Macro.escape({:unquote, [], [1]}, unquote: true)\n    1\n\n## Options\n\n  * `:unquote` - when true, this function leaves `unquote/1` and\n    `unquote_splicing/1` statements unescaped, effectively unquoting\n    the contents on escape. This option is useful only when escaping\n    ASTs which may have quoted fragments in them. Defaults to false.\n\n  * `:prune_metadata` - when true, removes metadata from escaped AST\n    nodes. Note this option changes the semantics of escaped code and\n    it should only be used when escaping ASTs. Defaults to false.\n\n    As an example, `ExUnit` stores the AST of every assertion, so when\n    an assertion fails we can show code snippets to users. Without this\n    option, each time the test module is compiled, we get a different\n    MD5 of the module bytecode, because the AST contains metadata,\n    such as counters, specific to the compilation environment. By pruning\n    the metadata, we ensure that the module is deterministic and reduce\n    the amount of data `ExUnit` needs to keep around. Only the minimal\n    amount of metadata is kept, such as `:line` and `:no_parens`.\n\n## Comparison to `quote/2`\n\nThe `escape/2` function is sometimes confused with `quote/2`,\nbecause the above examples behave the same with both. The key difference is\nbest illustrated when the value to escape is stored in a variable.\n\n    iex> Macro.escape({:a, :b, :c})\n    {:{}, [], [:a, :b, :c]}\n    iex> quote do: {:a, :b, :c}\n    {:{}, [], [:a, :b, :c]}\n\n    iex> value = {:a, :b, :c}\n    iex> Macro.escape(value)\n    {:{}, [], [:a, :b, :c]}\n\n    iex> quote do: value\n    {:value, [], __MODULE__}\n\n    iex> value = {:a, :b, :c}\n    iex> quote do: unquote(value)\n    {:a, :b, :c}\n\n`escape/2` is used to escape *values* (either directly passed or variable\nbound), while `quote/2` produces syntax trees for\nexpressions.\n",
    },
    {
      name: "decompose_call/1",
      type: "function",
      specs: [
        "@spec decompose_call(t()) :: {atom(), [t()]} | {t(), atom(), [t()]} | :error",
      ],
      documentation:
        "Decomposes a local or remote call into its remote part (when provided),\nfunction name and argument list.\n\nReturns `:error` when an invalid call syntax is provided.\n\n## Examples\n\n    iex> Macro.decompose_call(quote(do: foo))\n    {:foo, []}\n\n    iex> Macro.decompose_call(quote(do: foo()))\n    {:foo, []}\n\n    iex> Macro.decompose_call(quote(do: foo(1, 2, 3)))\n    {:foo, [1, 2, 3]}\n\n    iex> Macro.decompose_call(quote(do: Elixir.M.foo(1, 2, 3)))\n    {{:__aliases__, [], [:Elixir, :M]}, :foo, [1, 2, 3]}\n\n    iex> Macro.decompose_call(quote(do: 42))\n    :error\n\n    iex> Macro.decompose_call(quote(do: {:foo, [], []}))\n    :error\n\n",
    },
    {
      name: "dbg/3",
      type: "function",
      specs: ["@spec dbg(t(), t(), Macro.Env.t()) :: t()"],
      documentation:
        "Default backend for `Kernel.dbg/2`.\n\nThis function provides a default backend for `Kernel.dbg/2`. See the\n`Kernel.dbg/2` documentation for more information.\n\nThis function:\n\n  * prints information about the given `env`\n  * prints information about `code` and its returned value (using `opts` to inspect terms)\n  * returns the value returned by evaluating `code`\n\nYou can call this function directly to build `Kernel.dbg/2` backends that fall back\nto this function.\n\nThis function raises if the context of the given `env` is `:match` or `:guard`.\n",
    },
    {
      name: "compile_apply/4",
      type: "function",
      specs: [],
      documentation:
        "Applies a `mod`, `function`, and `args` at compile-time in `caller`.\n\nThis is used when you want to programmatically invoke a macro at\ncompile-time.\n",
    },
    {
      name: "classify_atom/1",
      type: "function",
      specs: [
        "@spec classify_atom(atom()) :: :alias | :identifier | :quoted | :unquoted",
      ],
      documentation:
        'Classifies an `atom` based on its possible AST placement.\n\nIt returns one of the following atoms:\n\n  * `:alias` - the atom represents an alias\n\n  * `:identifier` - the atom can be used as a variable or local function\n    call (as well as be an unquoted atom)\n\n  * `:unquoted` - the atom can be used in its unquoted form,\n    includes operators and atoms with `@` in them\n\n  * `:quoted` - all other atoms which can only be used in their quoted form\n\nMost operators are going to be `:unquoted`, such as `:+`, with\nsome exceptions returning `:quoted` due to ambiguity, such as\n`:"::"`. Use `operator?/2` to check if a given atom is an operator.\n\n## Examples\n\n    iex> Macro.classify_atom(:foo)\n    :identifier\n    iex> Macro.classify_atom(Foo)\n    :alias\n    iex> Macro.classify_atom(:foo@bar)\n    :unquoted\n    iex> Macro.classify_atom(:+)\n    :unquoted\n    iex> Macro.classify_atom(:Foo)\n    :unquoted\n    iex> Macro.classify_atom(:"with spaces")\n    :quoted\n\n',
    },
    {
      name: "camelize/1",
      type: "function",
      specs: ["@spec camelize(String.t()) :: String.t()"],
      documentation:
        'Converts the given string to CamelCase format.\n\nThis function was designed to camelize language identifiers/tokens,\nthat\'s why it belongs to the `Macro` module. Do not use it as a general\nmechanism for camelizing strings as it does not support Unicode or\ncharacters that are not valid in Elixir identifiers.\n\n## Examples\n\n    iex> Macro.camelize("foo_bar")\n    "FooBar"\n\n    iex> Macro.camelize("foo/bar")\n    "Foo.Bar"\n\nIf uppercase characters are present, they are not modified in any way\nas a mechanism to preserve acronyms:\n\n    iex> Macro.camelize("API.V1")\n    "API.V1"\n    iex> Macro.camelize("API_SPEC")\n    "API_SPEC"\n\n',
    },
  ],
  name: "Macro",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "captured_remote_function/0",
      type: "type",
      specs: ["@type captured_remote_function() :: (... -> any())"],
      documentation:
        "A captured remote function in the format of &Mod.fun/arity",
    },
    {
      name: "metadata/0",
      type: "type",
      specs: ["@type metadata() :: keyword()"],
      documentation:
        'A keyword list of AST metadata.\n\nThe metadata in Elixir AST is a keyword list of values. Any key can be used\nand different parts of the compiler may use different keys. For example,\nthe AST received by a macro will always include the `:line` annotation,\nwhile the AST emitted by `quote/2` will only have the `:line` annotation if\nthe `:line` option is provided.\n\nThe following metadata keys are public:\n\n  * `:context` - Defines the context in which the AST was generated.\n    For example, `quote/2` will include the module calling `quote/2`\n    as the context. This is often used to distinguish regular code from code\n    generated by a macro or by `quote/2`.\n\n  * `:counter` - The variable counter used for variable hygiene. In terms of\n    the compiler, each variable is identified by the combination of either\n    `name` and `metadata[:counter]`, or `name` and `context`.\n\n  * `:from_brackets` - Used to determine whether a call to `Access.get/3` is from\n    bracket syntax.\n\n  * `:from_interpolation` - Used to determine whether a call to `Kernel.to_string/1` is\n    from interpolation.\n\n  * `:generated` - Whether the code should be considered as generated by\n    the compiler or not. This means the compiler and tools like Dialyzer may not\n    emit certain warnings.\n\n  * `:if_undefined` - How to expand a variable that is undefined. Set it to\n    `:apply` if you want a variable to become a nullary call without warning\n    or `:raise`\n\n  * `:keep` - Used by `quote/2` with the option `location: :keep` to annotate\n    the file and the line number of the quoted source.\n\n  * `:line` - The line number of the AST node. Note line information is discarded\n    from quoted code but can be enabled back via the `:line` option.\n\nThe following metadata keys are enabled by `Code.string_to_quoted/2`:\n\n  * `:closing` - contains metadata about the closing pair, such as a `}`\n    in a tuple or in a map, or such as the closing `)` in a function call\n    with parens (when `:token_metadata` is true). If the function call\n    has a do-end block attached to it, its metadata is found under the\n    `:do` and `:end` metadata\n\n  * `:column` - the column number of the AST node (when `:columns` is true).\n    Note column information is always discarded from quoted code.\n\n  * `:delimiter` - contains the opening delimiter for sigils, strings,\n    and charlists as a string (such as `"{"`, `"/"`, `"\'"`, and the like)\n\n  * `:format` - set to `:keyword` when an atom is defined as a keyword\n\n  * `:do` - contains metadata about the `do` location in a function call with\n    `do`-`end` blocks (when `:token_metadata` is true)\n\n  * `:end` - contains metadata about the `end` location in a function call with\n    `do`-`end` blocks (when `:token_metadata` is true)\n\n  * `:end_of_expression` - denotes when the end of expression effectively\n    happens (when `:token_metadata` is true). This is only available for\n    expressions inside "blocks of code", which are either direct children\n    of a `__block__` or the right side of `->`. The last expression of the\n    block does not have metadata if it is not followed by an end of line\n    character (either a newline or `;`)\n\n  * `:indentation` - indentation of a sigil heredoc\n\nThe following metadata keys are private:\n\n  * `:alias` - Used for alias hygiene.\n  * `:ambiguous_op` - Used for improved error messages in the compiler.\n  * `:imports` - Used for import hygiene.\n  * `:var` - Used for improved error messages on undefined variables.\n\nDo not rely on them as they may change or be fully removed in future versions\nof the language. They are often used by `quote/2` and the compiler to provide\nfeatures like hygiene, better error messages, and so forth.\n\nIf you introduce custom keys into the AST metadata, please make sure to prefix\nthem with the name of your library or application, so that they will not conflict\nwith keys that could potentially be introduced by the compiler in the future.\n',
    },
    {
      name: "output/0",
      type: "type",
      specs: [
        "@type output() ::\n        output_expr()\n        | {output(), output()}\n        | [output()]\n        | atom()\n        | number()\n        | binary()\n        | captured_remote_function()\n        | pid()",
      ],
      documentation: "The output of a macro",
    },
    {
      name: "input/0",
      type: "type",
      specs: [
        "@type input() ::\n        input_expr()\n        | {input(), input()}\n        | [input()]\n        | atom()\n        | number()\n        | binary()",
      ],
      documentation: "The inputs of a macro",
    },
    {
      name: "t/0",
      type: "type",
      specs: ["@type t() :: input()"],
      documentation: "Abstract Syntax Tree (AST)",
    },
  ],
};
