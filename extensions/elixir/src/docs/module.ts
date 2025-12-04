import type { ModuleDoc } from "../types";

export const Module: ModuleDoc = {
  functions: [
    {
      name: "split/1",
      type: "function",
      specs: ["@spec split(module() | String.t()) :: [String.t(), ...]"],
      documentation:
        'Splits the given module name into binary parts.\n\n`module` has to be an Elixir module, as `split/1` won\'t work with Erlang-style\nmodules (for example, `split(:lists)` raises an error).\n\n`split/1` also supports splitting the string representation of Elixir modules\n(that is, the result of calling `Atom.to_string/1` with the module name).\n\n## Examples\n\n    iex> Module.split(Very.Long.Module.Name.And.Even.Longer)\n    ["Very", "Long", "Module", "Name", "And", "Even", "Longer"]\n    iex> Module.split("Elixir.String.Chars")\n    ["String", "Chars"]\n\n',
    },
    {
      name: "spec_to_callback/2",
      type: "function",
      specs: ["@spec spec_to_callback(module(), definition()) :: boolean()"],
      documentation:
        "Copies the given spec as a callback.\n\nReturns `true` if there is such a spec and it was copied as a callback.\nIf the function associated to the spec has documentation defined prior to\ninvoking this function, the docs are copied too.\n",
    },
    {
      name: "safe_concat/2",
      type: "function",
      specs: [
        "@spec safe_concat(binary() | atom(), binary() | atom()) :: atom()",
      ],
      documentation:
        "Concatenates two aliases and returns a new alias only if the alias was\nalready referenced.\n\nIf the alias was not referenced yet, fails with `ArgumentError`.\nIt handles binaries and atoms.\n\n## Examples\n\n    iex> Module.safe_concat(List, Chars)\n    List.Chars\n\n",
    },
    {
      name: "safe_concat/1",
      type: "function",
      specs: ["@spec safe_concat([binary() | atom()]) :: atom()"],
      documentation:
        "Concatenates a list of aliases and returns a new alias only if the alias\nwas already referenced.\n\nIf the alias was not referenced yet, fails with `ArgumentError`.\nIt handles binaries and atoms.\n\n## Examples\n\n    iex> Module.safe_concat([List, Chars])\n    List.Chars\n\n",
    },
    {
      name: "reserved_attributes/0",
      type: "function",
      specs: ["@spec reserved_attributes() :: map()"],
      documentation:
        'Returns information about module attributes used by Elixir.\n\nSee the "Module attributes" section in the module documentation for more\ninformation on each attribute.\n\n## Examples\n\n    iex> map = Module.reserved_attributes()\n    iex> Map.has_key?(map, :moduledoc)\n    true\n    iex> Map.has_key?(map, :doc)\n    true\n\n',
    },
    {
      name: "register_attribute/3",
      type: "function",
      specs: [
        "@spec register_attribute(module(), atom(),\n        accumulate: boolean(),\n        persist: boolean()\n      ) :: :ok",
      ],
      documentation:
        "Registers an attribute.\n\nBy registering an attribute, a developer is able to customize\nhow Elixir will store and accumulate the attribute values.\n\n## Options\n\nWhen registering an attribute, two options can be given:\n\n  * `:accumulate` - several calls to the same attribute will\n    accumulate instead of overriding the previous one. New attributes\n    are always added to the top of the accumulated list.\n\n  * `:persist` - the attribute will be persisted in the Erlang\n    Abstract Format. Useful when interfacing with Erlang libraries.\n\nBy default, both options are `false`. Once an attribute has been\nset to accumulate or persist, the behaviour cannot be reverted.\n\n## Examples\n\n    defmodule MyModule do\n      Module.register_attribute(__MODULE__, :custom_threshold_for_lib, accumulate: true)\n\n      @custom_threshold_for_lib 10\n      @custom_threshold_for_lib 20\n      @custom_threshold_for_lib #=> [20, 10]\n    end\n\n",
    },
    {
      name: "put_attribute/3",
      type: "function",
      specs: ["@spec put_attribute(module(), atom(), term()) :: :ok"],
      documentation:
        "Puts a module attribute with `key` and `value` in the given `module`.\n\n## Examples\n\n    defmodule MyModule do\n      Module.put_attribute(__MODULE__, :custom_threshold_for_lib, 10)\n    end\n\n",
    },
    {
      name: "overridables_in/1",
      type: "function",
      specs: ["@spec overridables_in(module()) :: [atom()]"],
      documentation:
        "Returns all overridable definitions in `module`.\n\nNote a definition is included even if it was was already overridden.\nYou can use `defines?/2` to see if a definition exists or one is pending.\n\nThis function can only be used on modules that have not yet been compiled.\n\n## Examples\n\n    defmodule Example do\n      def foo, do: 1\n      def bar, do: 2\n\n      defoverridable foo: 0, bar: 0\n      def foo, do: 3\n\n      [bar: 0, foo: 0] = Module.overridables_in(__MODULE__) |> Enum.sort()\n    end\n\n",
    },
    {
      name: "overridable?/2",
      type: "function",
      specs: ["@spec overridable?(module(), definition()) :: boolean()"],
      documentation:
        "Returns `true` if `tuple` in `module` was marked as overridable\nat some point.\n\nNote `overridable?/2` returns `true` even if the definition was\nalready overridden. You can use `defines?/2` to see if a definition\nexists or one is pending.\n",
    },
    {
      name: "open?/1",
      type: "function",
      specs: ["@spec open?(module()) :: boolean()"],
      documentation:
        'Checks if a module is open.\n\nA module is "open" if it is currently being defined and its attributes and\nfunctions can be modified.\n',
    },
    {
      name: "make_overridable/2",
      type: "function",
      specs: [
        "@spec make_overridable(module(), [definition()]) :: :ok",
        "@spec make_overridable(module(), module()) :: :ok",
      ],
      documentation:
        "Makes the given functions in `module` overridable.\n\nAn overridable function is lazily defined, allowing a\ndeveloper to customize it. See `Kernel.defoverridable/1` for\nmore information and documentation.\n\nOnce a function or a macro is marked as overridable, it will\nno longer be listed under `definitions_in/1` or return true\nwhen given to `defines?/2` until another implementation is\ngiven.\n",
    },
    {
      name: "has_attribute?/2",
      type: "function",
      specs: ["@spec has_attribute?(module(), atom()) :: boolean()"],
      documentation:
        "Checks if the given attribute has been defined.\n\nAn attribute is defined if it has been registered with `register_attribute/3`\nor assigned a value. If an attribute has been deleted with `delete_attribute/2`\nit is no longer considered defined.\n\nThis function can only be used on modules that have not yet been compiled.\n\n## Examples\n\n    defmodule MyModule do\n      @value 1\n      Module.register_attribute(__MODULE__, :other_value)\n      Module.put_attribute(__MODULE__, :another_value, 1)\n\n      Module.has_attribute?(__MODULE__, :value) #=> true\n      Module.has_attribute?(__MODULE__, :other_value) #=> true\n      Module.has_attribute?(__MODULE__, :another_value) #=> true\n\n      Module.has_attribute?(__MODULE__, :undefined) #=> false\n\n      Module.delete_attribute(__MODULE__, :value)\n      Module.has_attribute?(__MODULE__, :value) #=> false\n    end\n\n",
    },
    {
      name: "get_last_attribute/3",
      type: "function",
      specs: ["@spec get_last_attribute(module(), atom(), term()) :: term()"],
      documentation:
        "Gets the last set value of a given attribute from a module.\n\nIf the attribute was marked with `accumulate` with\n`Module.register_attribute/3`, the previous value to have been set will be\nreturned. If the attribute does not accumulate, this call is the same as\ncalling `Module.get_attribute/3`.\n\nThis function can only be used on modules that have not yet been compiled.\nUse the `c:Module.__info__/1` callback to get all persisted attributes, or\n`Code.fetch_docs/1` to retrieve all documentation related attributes in\ncompiled modules.\n\n## Examples\n\n    defmodule Foo do\n      Module.put_attribute(__MODULE__, :value, 1)\n      Module.get_last_attribute(__MODULE__, :value) #=> 1\n\n      Module.get_last_attribute(__MODULE__, :not_found, :default) #=> :default\n\n      Module.register_attribute(__MODULE__, :acc, accumulate: true)\n      Module.put_attribute(__MODULE__, :acc, 1)\n      Module.get_last_attribute(__MODULE__, :acc) #=> 1\n      Module.put_attribute(__MODULE__, :acc, 2)\n      Module.get_last_attribute(__MODULE__, :acc) #=> 2\n    end\n\n",
    },
    {
      name: "get_definition/3",
      type: "function",
      specs: [
        "@spec get_definition(module(), definition(), keyword()) ::\n        {:v1, def_kind(), meta :: keyword(),\n         [\n           {meta :: keyword(), arguments :: [Macro.t()], guards :: [Macro.t()],\n            Macro.t()}\n         ]}\n        | nil",
      ],
      documentation:
        "Returns the definition for the given name-arity pair.\n\nIt returns a tuple with the `version`, the `kind`,\nthe definition `metadata`, and a list with each clause.\nEach clause is a four-element tuple with metadata,\nthe arguments, the guards, and the clause AST.\n\nThe clauses are returned in the Elixir AST but a subset\nthat has already been expanded and normalized. This makes\nit useful for analyzing code but it cannot be reinjected\ninto the module as it will have lost some of its original\ncontext. Given this AST representation is mostly internal,\nit is versioned and it may change at any time. Therefore,\n**use this API with caution**.\n\n## Options\n\n  * `:skip_clauses` (since v1.14.0) - returns `[]` instead\n    of returning the clauses. This is useful when there is\n    only an interest in fetching the kind and the metadata\n\n",
    },
    {
      name: "get_attribute/3",
      type: "function",
      specs: ["@spec get_attribute(module(), atom(), term()) :: term()"],
      documentation:
        "Gets the given attribute from a module.\n\nIf the attribute was marked with `accumulate` with\n`Module.register_attribute/3`, a list is always returned.\n`nil` is returned if the attribute has not been marked with\n`accumulate` and has not been set to any value.\n\nThe `@` macro compiles to a call to this function. For example,\nthe following code:\n\n    @foo\n\nExpands to something akin to:\n\n    Module.get_attribute(__MODULE__, :foo)\n\nThis function can only be used on modules that have not yet been compiled.\nUse the `c:Module.__info__/1` callback to get all persisted attributes, or\n`Code.fetch_docs/1` to retrieve all documentation related attributes in\ncompiled modules.\n\n## Examples\n\n    defmodule Foo do\n      Module.put_attribute(__MODULE__, :value, 1)\n      Module.get_attribute(__MODULE__, :value) #=> 1\n\n      Module.get_attribute(__MODULE__, :value, :default) #=> 1\n      Module.get_attribute(__MODULE__, :not_found, :default) #=> :default\n\n      Module.register_attribute(__MODULE__, :value, accumulate: true)\n      Module.put_attribute(__MODULE__, :value, 1)\n      Module.get_attribute(__MODULE__, :value) #=> [1]\n    end\n\n",
    },
    {
      name: "eval_quoted/4",
      type: "function",
      specs: [
        "@spec eval_quoted(\n        module() | Macro.Env.t(),\n        Macro.t(),\n        list(),\n        keyword() | Macro.Env.t()\n      ) :: term()",
      ],
      documentation:
        "Evaluates the quoted contents in the given module's context.\n\nA list of environment options can also be given as argument.\nSee `Code.eval_string/3` for more information.\n\nRaises an error if the module was already compiled.\n\n## Examples\n\n    defmodule Foo do\n      contents =\n        quote do\n          def sum(a, b), do: a + b\n        end\n\n      Module.eval_quoted(__MODULE__, contents)\n    end\n\n    Foo.sum(1, 2)\n    #=> 3\n\nFor convenience, you can pass any `Macro.Env` struct, such\nas  `__ENV__/0`, as the first argument or as options. Both\nthe module and all options will be automatically extracted\nfrom the environment:\n\n    defmodule Foo do\n      contents =\n        quote do\n          def sum(a, b), do: a + b\n        end\n\n      Module.eval_quoted(__ENV__, contents)\n    end\n\n    Foo.sum(1, 2)\n    #=> 3\n\nNote that if you pass a `Macro.Env` struct as first argument\nwhile also passing `opts`, they will be merged with `opts`\nhaving precedence.\n",
    },
    {
      name: "delete_definition/2",
      type: "function",
      specs: ["@spec delete_definition(module(), definition()) :: boolean()"],
      documentation:
        "Deletes a definition from a module.\n\nIt returns `true` if the definition exists and it was removed,\notherwise it returns `false`.\n",
    },
    {
      name: "delete_attribute/2",
      type: "function",
      specs: ["@spec delete_attribute(module(), atom()) :: term()"],
      documentation:
        "Deletes the entry (or entries) for the given module attribute.\n\nIt returns the deleted attribute value. If the attribute has not\nbeen set nor configured to accumulate, it returns `nil`.\n\nIf the attribute is set to accumulate, then this function always\nreturns a list. Deleting the attribute removes existing entries\nbut the attribute will still accumulate.\n\n## Examples\n\n    defmodule MyModule do\n      Module.put_attribute(__MODULE__, :custom_threshold_for_lib, 10)\n      Module.delete_attribute(__MODULE__, :custom_threshold_for_lib)\n    end\n\n",
    },
    {
      name: "definitions_in/2",
      type: "function",
      specs: ["@spec definitions_in(module(), def_kind()) :: [definition()]"],
      documentation:
        "Returns all functions defined in `module`, according\nto its kind.\n\nThis function can only be used on modules that have not yet been compiled.\nUse the `c:Module.__info__/1` callback to get the public functions and macros in\ncompiled modules.\n\n## Examples\n\n    defmodule Example do\n      def version, do: 1\n      Module.definitions_in(__MODULE__, :def)  #=> [{:version, 0}]\n      Module.definitions_in(__MODULE__, :defp) #=> []\n    end\n\n",
    },
    {
      name: "definitions_in/1",
      type: "function",
      specs: ["@spec definitions_in(module()) :: [definition()]"],
      documentation:
        "Returns all functions and macros defined in `module`.\n\nIt returns a list with all defined functions and macros, public and private,\nin the shape of `[{name, arity}, ...]`.\n\nThis function can only be used on modules that have not yet been compiled.\nUse the `c:Module.__info__/1` callback to get the public functions and macros in\ncompiled modules.\n\n## Examples\n\n    defmodule Example do\n      def version, do: 1\n      defmacrop test(arg), do: arg\n      Module.definitions_in(__MODULE__) #=> [{:version, 0}, {:test, 1}]\n    end\n\n",
    },
    {
      name: "defines_type?/2",
      type: "function",
      specs: ["@spec defines_type?(module(), definition()) :: boolean()"],
      documentation:
        "Checks if the current module defines the given type (private, opaque or not).\n\nThis function is only available for modules being compiled.\n",
    },
    {
      name: "defines?/3",
      type: "function",
      specs: [
        "@spec defines?(module(), definition(), def_kind()) :: boolean()",
      ],
      documentation:
        "Checks if the module defines a function or macro of the\ngiven `kind`.\n\n`kind` can be any of `:def`, `:defp`, `:defmacro`, or `:defmacrop`.\n\nThis function can only be used on modules that have not yet been compiled.\nUse `Kernel.function_exported?/3` and `Kernel.macro_exported?/3` to check for\npublic functions and macros respectively in compiled modules.\n\n## Examples\n\n    defmodule Example do\n      Module.defines?(__MODULE__, {:version, 0}, :def) #=> false\n      def version, do: 1\n      Module.defines?(__MODULE__, {:version, 0}, :def) #=> true\n    end\n\n",
    },
    {
      name: "defines?/2",
      type: "function",
      specs: ["@spec defines?(module(), definition()) :: boolean()"],
      documentation:
        "Checks if the module defines the given function or macro.\n\nUse `defines?/3` to assert for a specific type.\n\nThis function can only be used on modules that have not yet been compiled.\nUse `Kernel.function_exported?/3` and `Kernel.macro_exported?/3` to check for\npublic functions and macros respectively in compiled modules.\n\nNote that `defines?` returns `false` for functions and macros that have\nbeen defined but then marked as overridable and no other implementation\nhas been provided. You can check the overridable status by calling\n`overridable?/2`.\n\n## Examples\n\n    defmodule Example do\n      Module.defines?(__MODULE__, {:version, 0}) #=> false\n      def version, do: 1\n      Module.defines?(__MODULE__, {:version, 0}) #=> true\n    end\n\n",
    },
    {
      name: "create/3",
      type: "function",
      specs: [
        "@spec create(module(), Macro.t(), Macro.Env.t() | keyword()) ::\n        {:module, module(), binary(), term()}",
      ],
      documentation:
        "Creates a module with the given name and defined by\nthe given quoted expressions.\n\nThe line where the module is defined and its file **must**\nbe passed as options.\n\nIt returns a tuple of shape `{:module, module, binary, term}`\nwhere `module` is the module name, `binary` is the module\nbytecode and `term` is the result of the last expression in\n`quoted`.\n\nSimilar to `Kernel.defmodule/2`, the binary will only be\nwritten to disk as a `.beam` file if `Module.create/3` is\ninvoked in a file that is currently being compiled.\n\n## Examples\n\n    contents =\n      quote do\n        def world, do: true\n      end\n\n    Module.create(Hello, contents, Macro.Env.location(__ENV__))\n\n    Hello.world()\n    #=> true\n\n## Differences from `defmodule`\n\n`Module.create/3` works similarly to `Kernel.defmodule/2`\nand return the same results. While one could also use\n`Kernel.defmodule/2` to define modules dynamically, this function\nis preferred when the module body is given by a quoted\nexpression.\n\nAnother important distinction is that `Module.create/3`\nallows you to control the environment variables used\nwhen defining the module, while `Kernel.defmodule/2`\nautomatically uses the environment it is invoked at.\n",
    },
    {
      name: "concat/2",
      type: "function",
      specs: ["@spec concat(binary() | atom(), binary() | atom()) :: atom()"],
      documentation:
        'Concatenates two aliases and returns a new alias.\n\nIt handles binaries and atoms.\n\n## Examples\n\n    iex> Module.concat(Foo, Bar)\n    Foo.Bar\n\n    iex> Module.concat(Foo, "Bar")\n    Foo.Bar\n\n',
    },
    {
      name: "concat/1",
      type: "function",
      specs: ["@spec concat([binary() | atom()]) :: atom()"],
      documentation:
        'Concatenates a list of aliases and returns a new alias.\n\nIt handles binaries and atoms.\n\n## Examples\n\n    iex> Module.concat([Foo, Bar])\n    Foo.Bar\n\n    iex> Module.concat([Foo, "Bar"])\n    Foo.Bar\n\n',
    },
    {
      name: "attributes_in/1",
      type: "function",
      specs: ["@spec attributes_in(module()) :: [atom()]"],
      documentation:
        "Returns all module attributes names defined in `module`.\n\nThis function can only be used on modules that have not yet been compiled.\n\n## Examples\n\n    defmodule Example do\n      @foo 1\n      Module.register_attribute(__MODULE__, :bar, accumulate: true)\n\n      :foo in Module.attributes_in(__MODULE__)\n      #=> true\n\n      :bar in Module.attributes_in(__MODULE__)\n      #=> true\n    end\n\n",
    },
  ],
  name: "Module",
  callbacks: [
    {
      name: "__info__/1",
      type: "callback",
      specs: [],
      documentation:
        "Provides runtime information about functions, macros, and other information\ndefined by the module.\n\nEach module gets an `__info__/1` function when it's compiled. The function\ntakes one of the following items:\n\n  * `:attributes` - a keyword list with all persisted attributes\n\n  * `:compile` - a list with compiler metadata\n\n  * `:functions` - a keyword list of public functions and their arities\n\n  * `:macros` - a keyword list of public macros and their arities\n\n  * `:md5` - the MD5 of the module\n\n  * `:module` - the module atom name\n\n  * `:struct` - (since v1.14.0) if the module defines a struct and if so each field in order\n\n",
    },
  ],
  macros: [],
  types: [
    {
      name: "def_kind/0",
      type: "type",
      specs: ["@type def_kind() :: :def | :defp | :defmacro | :defmacrop"],
      documentation: null,
    },
    {
      name: "definition/0",
      type: "type",
      specs: ["@type definition() :: {atom(), arity()}"],
      documentation: null,
    },
  ],
};
