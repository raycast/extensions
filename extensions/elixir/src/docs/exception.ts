import type { ModuleDoc } from "../types";

export const Exception: ModuleDoc = {
  functions: [
    {
      name: "normalize/3",
      type: "function",
      specs: [
        "@spec normalize(:error, any(), stacktrace()) :: t()",
        "@spec normalize(non_error_kind(), payload, stacktrace()) :: payload\n      when payload: var",
      ],
      documentation:
        "Normalizes an exception, converting Erlang exceptions\nto Elixir exceptions.\n\nIt takes the `kind` spilled by `catch` as an argument and\nnormalizes only `:error`, returning the untouched payload\nfor others.\n\nThe third argument is the stacktrace which is used to enrich\na normalized error with more information. It is only used when\nthe kind is an error.\n",
    },
    {
      name: "message/1",
      type: "function",
      specs: ["@spec message(t()) :: String.t()"],
      documentation: "Gets the message for an `exception`.\n",
    },
    {
      name: "format_stacktrace_entry/1",
      type: "function",
      specs: [
        "@spec format_stacktrace_entry(stacktrace_entry()) :: String.t()",
      ],
      documentation:
        "Receives a stacktrace entry and formats it into a string.\n",
    },
    {
      name: "format_stacktrace/1",
      type: "function",
      specs: ["@spec format_stacktrace(stacktrace() | nil) :: String.t()"],
      documentation:
        "Formats the stacktrace.\n\nA stacktrace must be given as an argument. If not, the stacktrace\nis retrieved from `Process.info/2`.\n",
    },
    {
      name: "format_mfa/3",
      type: "function",
      specs: [
        "@spec format_mfa(module(), atom(), arity_or_args()) :: String.t()",
      ],
      documentation:
        'Receives a module, fun and arity and formats it\nas shown in stacktraces. The arity may also be a list\nof arguments.\n\n## Examples\n\n    iex> Exception.format_mfa(Foo, :bar, 1)\n    "Foo.bar/1"\n\n    iex> Exception.format_mfa(Foo, :bar, [])\n    "Foo.bar()"\n\n    iex> Exception.format_mfa(nil, :bar, [])\n    "nil.bar()"\n\nAnonymous functions are reported as -func/arity-anonfn-count-,\nwhere func is the name of the enclosing function. Convert to\n"anonymous fn in func/arity"\n',
    },
    {
      name: "format_file_line_column/4",
      type: "function",
      specs: [
        "@spec format_file_line_column(\n        String.t() | nil,\n        non_neg_integer() | nil,\n        non_neg_integer() | nil,\n        String.t()\n      ) :: String.t()",
      ],
      documentation:
        'Formats the given `file`, `line`, and `column` as shown in stacktraces.\n\nIf any of the values are `nil`, they are omitted.\n\n## Examples\n\n    iex> Exception.format_file_line_column("foo", 1, 2)\n    "foo:1:2:"\n\n    iex> Exception.format_file_line_column("foo", 1, nil)\n    "foo:1:"\n\n    iex> Exception.format_file_line_column("foo", nil, nil)\n    "foo:"\n\n    iex> Exception.format_file_line_column("foo", nil, 2)\n    "foo:"\n\n    iex> Exception.format_file_line_column(nil, nil, nil)\n    ""\n\n',
    },
    {
      name: "format_file_line/3",
      type: "function",
      specs: [
        "@spec format_file_line(String.t() | nil, non_neg_integer() | nil, String.t()) ::\n        String.t()",
      ],
      documentation:
        'Formats the given `file` and `line` as shown in stacktraces.\n\nIf any of the values are `nil`, they are omitted.\n\n## Examples\n\n    iex> Exception.format_file_line("foo", 1)\n    "foo:1:"\n\n    iex> Exception.format_file_line("foo", nil)\n    "foo:"\n\n    iex> Exception.format_file_line(nil, nil)\n    ""\n\n',
    },
    {
      name: "format_fa/2",
      type: "function",
      specs: ["@spec format_fa((... -> any()), arity()) :: String.t()"],
      documentation:
        'Receives an anonymous function and arity and formats it as\nshown in stacktraces. The arity may also be a list of arguments.\n\n## Examples\n\n    Exception.format_fa(fn -> nil end, 1)\n    #=> "#Function<...>/1"\n\n',
    },
    {
      name: "format_exit/1",
      type: "function",
      specs: ["@spec format_exit(any()) :: String.t()"],
      documentation:
        "Formats an exit. It returns a string.\n\nOften there are errors/exceptions inside exits. Exits are often\nwrapped by the caller and provide stacktraces too. This function\nformats exits in a way to nicely show the exit reason, caller\nand stacktrace.\n",
    },
    {
      name: "format_banner/3",
      type: "function",
      specs: ["@spec format_banner(kind(), any(), stacktrace()) :: String.t()"],
      documentation:
        "Normalizes and formats any throw/error/exit.\n\nThe message is formatted and displayed in the same\nformat as used by Elixir's CLI.\n\nThe third argument is the stacktrace which is used to enrich\na normalized error with more information. It is only used when\nthe kind is an error.\n",
    },
    {
      name: "format/3",
      type: "function",
      specs: ["@spec format(kind(), any(), stacktrace()) :: String.t()"],
      documentation:
        "Normalizes and formats throw/errors/exits and stacktraces.\n\nIt relies on `format_banner/3` and `format_stacktrace/1`\nto generate the final format.\n\nIf `kind` is `{:EXIT, pid}`, it does not generate a stacktrace,\nas such exits are retrieved as messages without stacktraces.\n",
    },
    {
      name: "blame_mfa/3",
      type: "function",
      specs: [
        "@spec blame_mfa(module(), function :: atom(), args :: [term()]) ::\n        {:ok, :def | :defp | :defmacro | :defmacrop,\n         [{args :: [term()], guards :: [term()]}]}\n        | :error",
      ],
      documentation:
        "Blames the invocation of the given module, function and arguments.\n\nThis function will retrieve the available clauses from bytecode\nand evaluate them against the given arguments. The clauses are\nreturned as a list of `{args, guards}` pairs where each argument\nand each top-level condition in a guard separated by `and`/`or`\nis wrapped in a tuple with blame metadata.\n\nThis function returns either `{:ok, definition, clauses}` or `:error`.\nWhere `definition` is `:def`, `:defp`, `:defmacro` or `:defmacrop`.\n",
    },
    {
      name: "blame/3",
      type: "function",
      specs: [
        "@spec blame(:error, any(), stacktrace()) :: {t(), stacktrace()}",
        "@spec blame(non_error_kind(), payload, stacktrace()) :: {payload, stacktrace()}\n      when payload: var",
      ],
      documentation:
        "Attaches information to exceptions for extra debugging.\n\nThis operation is potentially expensive, as it reads data\nfrom the file system, parses beam files, evaluates code and\nso on.\n\nIf the exception module implements the optional `c:blame/2`\ncallback, it will be invoked to perform the computation.\n",
    },
  ],
  name: "Exception",
  callbacks: [
    {
      name: "message/1",
      type: "callback",
      specs: ["@callback message(t()) :: String.t()"],
      documentation:
        "Receives the exception struct and must return its message.\n\nMost commonly exceptions have a message field which by default is accessed\nby this function. However, if an exception does not have a message field,\nthis function must be explicitly implemented.\n",
    },
    {
      name: "exception/1",
      type: "callback",
      specs: [],
      documentation:
        "Receives the arguments given to `raise/2` and returns the exception struct.\n\nThe default implementation accepts either a set of keyword arguments\nthat is merged into the struct or a string to be used as the exception's message.\n",
    },
    {
      name: "blame/2",
      type: "callback",
      specs: [],
      documentation:
        "Called from `Exception.blame/3` to augment the exception struct.\n\nCan be used to collect additional information about the exception\nor do some additional expensive computation.\n",
    },
  ],
  macros: [],
  types: [
    {
      name: "location/0",
      type: "type",
      specs: ["@type location() :: keyword()"],
      documentation: null,
    },
    {
      name: "arity_or_args/0",
      type: "type",
      specs: ["@type arity_or_args() :: non_neg_integer() | list()"],
      documentation: null,
    },
    {
      name: "stacktrace_entry/0",
      type: "type",
      specs: [
        "@type stacktrace_entry() ::\n        {module(), atom(), arity_or_args(), location()}\n        | {(... -> any()), arity_or_args(), location()}",
      ],
      documentation: null,
    },
    {
      name: "stacktrace/0",
      type: "type",
      specs: ["@type stacktrace() :: [stacktrace_entry()]"],
      documentation: null,
    },
    {
      name: "non_error_kind/0",
      type: "type",
      specs: ["@type non_error_kind() :: :exit | :throw | {:EXIT, pid()}"],
      documentation: null,
    },
    {
      name: "kind/0",
      type: "type",
      specs: ["@type kind() :: :error | non_error_kind()"],
      documentation: "The kind handled by formatting functions",
    },
    {
      name: "t/0",
      type: "type",
      specs: [
        "@type t() :: %{\n        :__struct__ => module(),\n        :__exception__ => true,\n        optional(atom()) => any()\n      }",
      ],
      documentation: "The exception type",
    },
  ],
};
