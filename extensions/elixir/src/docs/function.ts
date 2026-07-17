import type { ModuleDoc } from "../types";

export const Function: ModuleDoc = {
  functions: [
    {
      name: "info/2",
      type: "function",
      specs: [
        "@spec info((... -> any()), item) :: {item, term()} when item: information()",
      ],
      documentation:
        "Returns a specific information about the function.\n\nThe returned information is a two-element tuple in the shape of\n`{info, value}`.\n\nFor any function, the information asked for can be any of the atoms\n`:module`, `:name`, `:arity`, `:env`, or `:type`.\n\nFor anonymous functions, there is also information about any of the\natoms `:index`, `:new_index`, `:new_uniq`, `:uniq`, and `:pid`.\nFor a named function, the value of any of these items is always the\natom `:undefined`.\n\nFor more information on each of the possible returned values, see\n`info/1`.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> f = fn x -> x end\n    iex> Function.info(f, :arity)\n    {:arity, 1}\n    iex> Function.info(f, :type)\n    {:type, :local}\n\n    iex> fun = &String.length/1\n    iex> Function.info(fun, :name)\n    {:name, :length}\n    iex> Function.info(fun, :pid)\n    {:pid, :undefined}\n\n",
    },
    {
      name: "info/1",
      type: "function",
      specs: ["@spec info((... -> any())) :: [{information(), term()}]"],
      documentation:
        "Returns a keyword list with information about a function.\n\nThe returned keys (with the corresponding possible values) for\nall types of functions (local and external) are the following:\n\n  * `:type` - `:local` (for anonymous functions) or `:external` (for\n    named functions).\n\n  * `:module` - an atom which is the module where the function is defined when\n  anonymous or the module which the function refers to when it's a named function.\n\n  * `:arity` - (integer) the number of arguments the function is to be called with.\n\n  * `:name` - (atom) the name of the function.\n\n  * `:env` - a list of the environment or free variables. For named\n    functions, the returned list is always empty.\n\nWhen `fun` is an anonymous function (that is, the type is `:local`), the following\nadditional keys are returned:\n\n  * `:pid` - PID of the process that originally created the function.\n\n  * `:index` - (integer) an index into the module function table.\n\n  * `:new_index` - (integer) an index into the module function table.\n\n  * `:new_uniq` - (binary) a unique value for this function. It's\n    calculated from the compiled code for the entire module.\n\n  * `:uniq` - (integer) a unique value for this function. This integer is\n    calculated from the compiled code for the entire module.\n\n**Note**: this function must be used only for debugging purposes.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> fun = fn x -> x end\n    iex> info = Function.info(fun)\n    iex> Keyword.get(info, :arity)\n    1\n    iex> Keyword.get(info, :type)\n    :local\n\n    iex> fun = &String.length/1\n    iex> info = Function.info(fun)\n    iex> Keyword.get(info, :type)\n    :external\n    iex> Keyword.get(info, :name)\n    :length\n\n",
    },
    {
      name: "identity/1",
      type: "function",
      specs: ["@spec identity(value) :: value when value: var"],
      documentation:
        'Returns its input `value`. This function can be passed as an anonymous function\nto transformation functions.\n\n## Examples\n\n    iex> Function.identity("Hello world!")\n    "Hello world!"\n\n    iex> ~c"abcdaabccc" |> Enum.sort() |> Enum.chunk_by(&Function.identity/1)\n    [~c"aaa", ~c"bb", ~c"cccc", ~c"d"]\n\n    iex> Enum.group_by(~c"abracadabra", &Function.identity/1)\n    %{97 => ~c"aaaaa", 98 => ~c"bb", 99 => ~c"c", 100 => ~c"d", 114 => ~c"rr"}\n\n    iex> Enum.map([1, 2, 3, 4], &Function.identity/1)\n    [1, 2, 3, 4]\n\n',
    },
    {
      name: "capture/3",
      type: "function",
      specs: ["@spec capture(module(), atom(), arity()) :: (... -> any())"],
      documentation:
        "Captures the given function.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> Function.capture(String, :length, 1)\n    &String.length/1\n\n",
    },
  ],
  name: "Function",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "information/0",
      type: "type",
      specs: [
        "@type information() ::\n        :arity\n        | :env\n        | :index\n        | :module\n        | :name\n        | :new_index\n        | :new_uniq\n        | :pid\n        | :type\n        | :uniq",
      ],
      documentation: null,
    },
  ],
};
