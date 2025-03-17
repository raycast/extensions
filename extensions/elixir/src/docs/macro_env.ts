import type { ModuleDoc } from "../types";

export const Macro_Env: ModuleDoc = {
  functions: [
    {
      name: "vars/1",
      type: "function",
      specs: ["@spec vars(t()) :: [variable()]"],
      documentation:
        "Returns a list of variables in the current environment.\n\nEach variable is identified by a tuple of two elements,\nwhere the first element is the variable name as an atom\nand the second element is its context, which may be an\natom or an integer.\n",
    },
    {
      name: "to_match/1",
      type: "function",
      specs: ["@spec to_match(t()) :: t()"],
      documentation: "Returns an environment in the match context.\n",
    },
    {
      name: "to_guard/1",
      type: "function",
      specs: ["@spec to_guard(t()) :: t()"],
      documentation: "Returns an environment in the guard context.\n",
    },
    {
      name: "stacktrace/1",
      type: "function",
      specs: ["@spec stacktrace(t()) :: list()"],
      documentation: "Returns the environment stacktrace.\n",
    },
    {
      name: "required?/2",
      type: "function",
      specs: ["@spec required?(t(), module()) :: boolean()"],
      documentation:
        "Returns `true` if the given module has been required.\n\n## Examples\n\n    iex> Macro.Env.required?(__ENV__, Integer)\n    false\n    iex> require Integer\n    iex> Macro.Env.required?(__ENV__, Integer)\n    true\n\n    iex> Macro.Env.required?(__ENV__, Kernel)\n    true\n",
    },
    {
      name: "prune_compile_info/1",
      type: "function",
      specs: ["@spec prune_compile_info(t()) :: t()"],
      documentation:
        "Prunes compile information from the environment.\n\nThis happens when the environment is captured at compilation\ntime, for example, in the module body, and then used to\nevaluate code after the module has been defined.\n",
    },
    {
      name: "prepend_tracer/2",
      type: "function",
      specs: ["@spec prepend_tracer(t(), module()) :: t()"],
      documentation:
        "Prepend a tracer to the list of tracers in the environment.\n\n## Examples\n\n    Macro.Env.prepend_tracer(__ENV__, MyCustomTracer)\n\n",
    },
    {
      name: "lookup_import/2",
      type: "function",
      specs: [
        "@spec lookup_import(t(), name_arity()) :: [{:function | :macro, module()}]",
      ],
      documentation:
        "Returns the modules from which the given `{name, arity}` was\nimported.\n\nIt returns a list of two element tuples in the shape of\n`{:function | :macro, module}`. The elements in the list\nare in no particular order and the order is not guaranteed.\n\n> #### Use only for introspection {: .warning}\n>\n> This function does not emit compiler tracing events,\n> which may block the compiler from correctly tracking\n> dependencies. Use this function for reflection purposes\n> but to do not use it to expand imports into qualified\n> calls. Instead, use `expand_import/5`.\n\n## Examples\n\n    iex> Macro.Env.lookup_import(__ENV__, {:duplicate, 2})\n    []\n    iex> import Tuple, only: [duplicate: 2], warn: false\n    iex> Macro.Env.lookup_import(__ENV__, {:duplicate, 2})\n    [{:function, Tuple}]\n    iex> import List, only: [duplicate: 2], warn: false\n    iex> Macro.Env.lookup_import(__ENV__, {:duplicate, 2})\n    [{:function, List}, {:function, Tuple}]\n\n    iex> Macro.Env.lookup_import(__ENV__, {:def, 1})\n    [{:macro, Kernel}]\n\n",
    },
    {
      name: "lookup_alias_as/2",
      type: "function",
      specs: ["@spec lookup_alias_as(t(), atom()) :: [atom()]"],
      documentation:
        "Returns the names of any aliases for the given module or atom.\n\n## Examples\n\n    iex> alias Foo.Bar\n    iex> Bar\n    Foo.Bar\n    iex> Macro.Env.lookup_alias_as(__ENV__, Foo.Bar)\n    [Elixir.Bar]\n    iex> alias Foo.Bar, as: Baz\n    iex> Baz\n    Foo.Bar\n    iex> Macro.Env.lookup_alias_as(__ENV__, Foo.Bar)\n    [Elixir.Bar, Elixir.Baz]\n    iex> Macro.Env.lookup_alias_as(__ENV__, Unknown)\n    []\n\n",
    },
    {
      name: "location/1",
      type: "function",
      specs: ["@spec location(t()) :: keyword()"],
      documentation:
        "Returns a keyword list containing the file and line\ninformation as keys.\n",
    },
    {
      name: "in_match?/1",
      type: "function",
      specs: ["@spec in_match?(t()) :: boolean()"],
      documentation:
        "Returns whether the compilation environment is currently\ninside a match clause.\n",
    },
    {
      name: "in_guard?/1",
      type: "function",
      specs: ["@spec in_guard?(t()) :: boolean()"],
      documentation:
        "Returns whether the compilation environment is currently\ninside a guard.\n",
    },
    {
      name: "has_var?/2",
      type: "function",
      specs: ["@spec has_var?(t(), variable()) :: boolean()"],
      documentation:
        "Checks if a variable belongs to the environment.\n\n## Examples\n\n    iex> x = 13\n    iex> x\n    13\n    iex> Macro.Env.has_var?(__ENV__, {:x, nil})\n    true\n    iex> Macro.Env.has_var?(__ENV__, {:unknown, nil})\n    false\n\n",
    },
    {
      name: "expand_require/6",
      type: "function",
      specs: [
        "@spec expand_require(t(), keyword(), module(), atom(), arity(), keyword()) ::\n        {:macro, module(), (Macro.metadata(), args :: [Macro.t()] -> Macro.t())}\n        | :error",
      ],
      documentation:
        "Expands a require given by `module`, `name`, and `arity`.\n\nIf the require points to a macro and the module has been\nrequired, it returns a tuple with the module and a function\nthat expands the macro. The function expects the metadata\nto be attached to the expansion and the arguments of the macro.\nThe appropriate `:remote_macro` compiler tracing event will\nbe emitted if a macro is found (note a `:remote_function`\nevent is not emitted in `:error` cases).\n\nOtherwise returns `:error`.\n\n## Options\n\n  * `:check_deprecations` - when set to `false`, does not check for deprecations\n    when expanding macros\n\n  * `:trace` - when set to `false`, it disables compilation tracers and\nlexical tracker. This option must only be used by language servers and\nother tools that need to introspect code without affecting how it is compiled.\nDisabling tracer inside macros or regular code expansion is extremely\ndiscouraged as it blocks the compiler from accurately tracking dependencies\n\n",
    },
    {
      name: "expand_import/5",
      type: "function",
      specs: [
        "@spec expand_import(t(), keyword(), atom(), arity(), keyword()) ::\n        {:macro, module(), (Macro.metadata(), args :: [Macro.t()] -> Macro.t())}\n        | {:function, module(), atom()}\n        | {:error,\n           :not_found | {:conflict, module()} | {:ambiguous, [module()]}}",
      ],
      documentation:
        "Expands an import given by `name` and `arity`.\n\nIf the import points to a macro, it returns a tuple\nwith the module and a function that expands the macro.\nThe function expects the metadata to be attached to the\nexpansion and the arguments of the macro.\n\nIf the import points to a function, it returns a tuple\nwith the module and the function name.\n\nIf any import is found, the appropriate compiler tracing\nevent will be emitted.\n\nOtherwise returns `{:error, reason}`.\n\n## Options\n\n  * `:allow_locals` - when set to `false`, it does not attempt to capture\n    local macros defined in the current module in `env`\n\n  * `:check_deprecations` - when set to `false`, does not check for deprecations\n    when expanding macros\n\n  * `:trace` - when set to `false`, it disables compilation tracers and\nlexical tracker. This option must only be used by language servers and\nother tools that need to introspect code without affecting how it is compiled.\nDisabling tracer inside macros or regular code expansion is extremely\ndiscouraged as it blocks the compiler from accurately tracking dependencies\n\n",
    },
    {
      name: "expand_alias/4",
      type: "function",
      specs: [
        "@spec expand_alias(t(), keyword(), [atom()], keyword()) ::\n        {:alias, atom()} | :error",
      ],
      documentation:
        "Expands an alias given by the alias segments.\n\nIt returns `{:alias, alias}` if the segments is a list\nof atoms and an alias was found. Returns `:error` otherwise.\n\nThis expansion may emit the `:alias_expansion` trace event\nbut it does not emit the `:alias_reference` one.\n\n## Options\n\n  * `:trace` - when set to `false`, it disables compilation tracers and\nlexical tracker. This option must only be used by language servers and\nother tools that need to introspect code without affecting how it is compiled.\nDisabling tracer inside macros or regular code expansion is extremely\ndiscouraged as it blocks the compiler from accurately tracking dependencies\n\n## Examples\n\n    iex> alias List, as: MyList\n    iex> Macro.Env.expand_alias(__ENV__, [], [:MyList])\n    {:alias, List}\n    iex> Macro.Env.expand_alias(__ENV__, [], [:MyList, :Nested])\n    {:alias, List.Nested}\n\nIf there is no alias or the alias starts with `Elixir.`\n(which disables aliasing), then `:error` is returned:\n\n    iex> alias List, as: MyList\n    iex> Macro.Env.expand_alias(__ENV__, [], [:Elixir, MyList])\n    :error\n    iex> Macro.Env.expand_alias(__ENV__, [], [:AnotherList])\n    :error\n\n",
    },
    {
      name: "define_require/4",
      type: "function",
      specs: [],
      documentation:
        "Defines the given `module` as required in the environment.\n\nIt does not check or assert the module is available.\nThis is used by tools which need to mimic the Elixir compiler.\nThe appropriate `:require` compiler tracing event will be emitted.\n\n## Additional options\n\nIt accepts the same options as `Kernel.SpecialForm.require/2` plus:\n\n  * `:trace` - when set to `false`, it disables compilation tracers and\nlexical tracker. This option must only be used by language servers and\nother tools that need to introspect code without affecting how it is compiled.\nDisabling tracer inside macros or regular code expansion is extremely\ndiscouraged as it blocks the compiler from accurately tracking dependencies\n\n## Examples\n\n    iex> env = __ENV__\n    iex> Macro.Env.required?(env, Integer)\n    false\n    iex> {:ok, env} = Macro.Env.define_require(env, [line: 10], Integer)\n    iex> Macro.Env.required?(env, Integer)\n    true\n\nIf the `:as` option is given, it will also define an alias:\n\n    iex> env = __ENV__\n    iex> {:ok, env} = Macro.Env.define_require(env, [line: 10], Foo.Bar, as: Baz)\n    iex> Macro.Env.expand_alias(env, [], [:Baz])\n    {:alias, Foo.Bar}\n\n",
    },
    {
      name: "define_import/4",
      type: "function",
      specs: [
        "@spec define_import(t(), Macro.metadata(), module(), keyword()) ::\n        {:ok, t()} | {:error, String.t()}",
      ],
      documentation:
        "Defines the given `module` as imported in the environment.\n\nIt assumes `module` is available. This is used by tools which\nneed to mimic the Elixir compiler. The appropriate `:import`\ncompiler tracing event will be emitted.\n\n## Additional options\n\nIt accepts the same options as `Kernel.SpecialForm.import/2` plus:\n\n  * `:emit_warnings` - emit warnings found when defining imports\n\n  * `:trace` - when set to `false`, it disables compilation tracers and\nlexical tracker. This option must only be used by language servers and\nother tools that need to introspect code without affecting how it is compiled.\nDisabling tracer inside macros or regular code expansion is extremely\ndiscouraged as it blocks the compiler from accurately tracking dependencies\n\n  * `:info_callback` - a function to use instead of `c:Module.__info__/1`.\n    The function will be invoked with `:functions` or `:macros` argument.\n    It has to return a list of `{function, arity}` key value pairs.\n    If it fails, it defaults to using module metadata based on `module_info/1`.\n\n## Examples\n\n    iex> env = __ENV__\n    iex> Macro.Env.lookup_import(env, {:flatten, 1})\n    []\n    iex> {:ok, env} = Macro.Env.define_import(env, [line: 10], List)\n    iex> Macro.Env.lookup_import(env, {:flatten, 1})\n    [{:function, List}]\n\nIt accepts the same options as `Kernel.SpecialForm.import/2`:\n\n    iex> env = __ENV__\n    iex> Macro.Env.lookup_import(env, {:is_odd, 1})\n    []\n    iex> {:ok, env} = Macro.Env.define_import(env, [line: 10], Integer, only: :macros)\n    iex> Macro.Env.lookup_import(env, {:is_odd, 1})\n    [{:macro, Integer}]\n\n## Info callback override\n\n    iex> env = __ENV__\n    iex> Macro.Env.lookup_import(env, {:flatten, 1})\n    []\n    iex> {:ok, env} = Macro.Env.define_import(env, [line: 10], SomeModule, [info_callback: fn :functions -> [{:flatten, 1}]; :macros -> [{:some, 2}]; end])\n    iex> Macro.Env.lookup_import(env, {:flatten, 1})\n    [{:function, SomeModule}]\n    iex> Macro.Env.lookup_import(env, {:some, 2})\n    [{:macro, SomeModule}]\n\n",
    },
    {
      name: "define_alias/4",
      type: "function",
      specs: [
        "@spec define_alias(t(), Macro.metadata(), module(), keyword()) ::\n        {:ok, t()} | {:error, String.t()}",
      ],
      documentation:
        'Defines the given `as` an alias to `module` in the environment.\n\nThis is used by tools which need to mimic the Elixir compiler.\nThe appropriate `:alias` compiler tracing event will be emitted.\n\n## Additional options\n\nIt accepts the same options as `Kernel.SpecialForm.alias/2` plus:\n\n  * `:trace` - when set to `false`, it disables compilation tracers and\nlexical tracker. This option must only be used by language servers and\nother tools that need to introspect code without affecting how it is compiled.\nDisabling tracer inside macros or regular code expansion is extremely\ndiscouraged as it blocks the compiler from accurately tracking dependencies\n\n## Examples\n\n    iex> env = __ENV__\n    iex> Macro.Env.expand_alias(env, [], [:Baz])\n    :error\n    iex> {:ok, env} = Macro.Env.define_alias(env, [line: 10], Foo.Bar, as: Baz)\n    iex> Macro.Env.expand_alias(env, [], [:Baz])\n    {:alias, Foo.Bar}\n    iex> Macro.Env.expand_alias(env, [], [:Baz, :Bat])\n    {:alias, Foo.Bar.Bat}\n\nIf no `:as` option is given, the alias will be inferred from the module:\n\n    iex> env = __ENV__\n    iex> {:ok, env} = Macro.Env.define_alias(env, [line: 10], Foo.Bar)\n    iex> Macro.Env.expand_alias(env, [], [:Bar])\n    {:alias, Foo.Bar}\n\nIf it is not possible to infer one, an error is returned:\n\n    iex> Macro.Env.define_alias(__ENV__, [line: 10], :an_atom)\n    {:error,\n     "alias cannot be inferred automatically for module: :an_atom, " <>\n       "please use the :as option. Implicit aliasing is only supported with Elixir modules"}\n\n',
    },
  ],
  name: "Macro.Env",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "t/0",
      type: "type",
      specs: [
        "@type t() :: %Macro.Env{\n        aliases: aliases(),\n        context: context(),\n        context_modules: context_modules(),\n        file: file(),\n        function: name_arity() | nil,\n        functions: functions(),\n        lexical_tracker: lexical_tracker(),\n        line: line(),\n        macro_aliases: macro_aliases(),\n        macros: macros(),\n        module: module(),\n        requires: requires(),\n        tracers: tracers(),\n        versioned_vars: versioned_vars()\n      }",
      ],
      documentation: null,
    },
    {
      name: "variable/0",
      type: "type",
      specs: ["@type variable() :: {atom(), atom() | term()}"],
      documentation: null,
    },
    {
      name: "name_arity/0",
      type: "type",
      specs: ["@type name_arity() :: {atom(), arity()}"],
      documentation: null,
    },
    {
      name: "line/0",
      type: "type",
      specs: ["@type line() :: non_neg_integer()"],
      documentation: null,
    },
    {
      name: "file/0",
      type: "type",
      specs: ["@type file() :: binary()"],
      documentation: null,
    },
    {
      name: "context_modules/0",
      type: "type",
      specs: ["@type context_modules() :: [module()]"],
      documentation: null,
    },
    {
      name: "context/0",
      type: "type",
      specs: ["@type context() :: :match | :guard | nil"],
      documentation: null,
    },
  ],
};
