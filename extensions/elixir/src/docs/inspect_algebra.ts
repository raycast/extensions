import type { ModuleDoc } from "../types";

export const Inspect_Algebra: ModuleDoc = {
  functions: [
    {
      name: "to_doc/2",
      type: "function",
      specs: ["@spec to_doc(any(), Inspect.Opts.t()) :: t()"],
      documentation:
        "Converts an Elixir term to an algebra document\naccording to the `Inspect` protocol.\n",
    },
    {
      name: "string/1",
      type: "function",
      specs: ["@spec string(String.t()) :: doc_string()"],
      documentation:
        'Creates a document represented by string.\n\nWhile `Inspect.Algebra` accepts binaries as documents,\nthose are counted by binary size. On the other hand,\n`string` documents are measured in terms of graphemes\ntowards the document size.\n\n## Examples\n\nThe following document has 10 bytes and therefore it\ndoes not format to width 9 without breaks:\n\n    iex> doc = Inspect.Algebra.glue("olá", " ", "mundo")\n    iex> doc = Inspect.Algebra.group(doc)\n    iex> Inspect.Algebra.format(doc, 9)\n    ["olá", "\\n", "mundo"]\n\nHowever, if we use `string`, then the string length is\nused, instead of byte size, correctly fitting:\n\n    iex> string = Inspect.Algebra.string("olá")\n    iex> doc = Inspect.Algebra.glue(string, " ", "mundo")\n    iex> doc = Inspect.Algebra.group(doc)\n    iex> Inspect.Algebra.format(doc, 9)\n    ["olá", " ", "mundo"]\n\n',
    },
    {
      name: "space/2",
      type: "function",
      specs: ["@spec space(t(), t()) :: t()"],
      documentation:
        'Inserts a mandatory single space between two documents.\n\n## Examples\n\n    iex> doc = Inspect.Algebra.space("Hughes", "Wadler")\n    iex> Inspect.Algebra.format(doc, 5)\n    ["Hughes", " ", "Wadler"]\n\n',
    },
    { name: "no_limit/1", type: "function", specs: [], documentation: null },
    {
      name: "next_break_fits/2",
      type: "function",
      specs: ["@spec next_break_fits(t(), :enabled | :disabled) :: doc_fits()"],
      documentation:
        "Considers the next break as fit.\n\n`mode` can be `:enabled` or `:disabled`. When `:enabled`,\nit will consider the document as fit as soon as it finds\nthe next break, effectively cancelling the break. It will\nalso ignore any `force_unfit/1` in search of the next break.\n\nWhen disabled, it behaves as usual and it will ignore\nany further `next_break_fits/2` instruction.\n\n## Examples\n\nThis is used by Elixir's code formatter to avoid breaking\ncode at some specific locations. For example, consider this\ncode:\n\n    some_function_call(%{..., key: value, ...})\n\nNow imagine that this code does not fit its line. The code\nformatter introduces breaks inside `(` and `)` and inside\n`%{` and `}`. Therefore the document would break as:\n\n    some_function_call(\n      %{\n        ...,\n        key: value,\n        ...\n      }\n    )\n\nThe formatter wraps the algebra document representing the\nmap in `next_break_fits/1` so the code is formatted as:\n\n    some_function_call(%{\n      ...,\n      key: value,\n      ...\n    })\n\n",
    },
    {
      name: "nest/3",
      type: "function",
      specs: [
        "@spec nest(t(), non_neg_integer() | :cursor | :reset, :always | :break) ::\n        doc_nest() | t()",
      ],
      documentation:
        'Nests the given document at the given `level`.\n\nIf `level` is an integer, that\'s the indentation appended\nto line breaks whenever they occur. If the level is `:cursor`,\nthe current position of the "cursor" in the document becomes\nthe nesting. If the level is `:reset`, it is set back to 0.\n\n`mode` can be `:always`, which means nesting always happen,\nor `:break`, which means nesting only happens inside a group\nthat has been broken.\n\n## Examples\n\n    iex> doc = Inspect.Algebra.nest(Inspect.Algebra.glue("hello", "world"), 5)\n    iex> doc = Inspect.Algebra.group(doc)\n    iex> Inspect.Algebra.format(doc, 5)\n    ["hello", "\\n     ", "world"]\n\n',
    },
    {
      name: "line/2",
      type: "function",
      specs: ["@spec line(t(), t()) :: t()"],
      documentation:
        'Inserts a mandatory linebreak between two documents.\n\nSee `line/0`.\n\n## Examples\n\n    iex> doc = Inspect.Algebra.line("Hughes", "Wadler")\n    iex> Inspect.Algebra.format(doc, 80)\n    ["Hughes", "\\n", "Wadler"]\n\n',
    },
    {
      name: "line/0",
      type: "function",
      specs: ["@spec line() :: t()"],
      documentation:
        'A mandatory linebreak.\n\nA group with linebreaks will fit if all lines in the group fit.\n\n## Examples\n\n    iex> doc =\n    ...>   Inspect.Algebra.concat(\n    ...>     Inspect.Algebra.concat(\n    ...>       "Hughes",\n    ...>       Inspect.Algebra.line()\n    ...>     ),\n    ...>     "Wadler"\n    ...>   )\n    iex> Inspect.Algebra.format(doc, 80)\n    ["Hughes", "\\n", "Wadler"]\n\n',
    },
    {
      name: "group/2",
      type: "function",
      specs: ["@spec group(t(), :self | :inherit) :: doc_group()"],
      documentation:
        'Returns a group containing the specified document `doc`.\n\nDocuments in a group are attempted to be rendered together\nto the best of the renderer ability.\n\nThe group mode can also be set to `:inherit`, which means it\nautomatically breaks if the parent group has broken too.\n\n## Examples\n\n    iex> doc =\n    ...>   Inspect.Algebra.group(\n    ...>     Inspect.Algebra.concat(\n    ...>       Inspect.Algebra.group(\n    ...>         Inspect.Algebra.concat(\n    ...>           "Hello,",\n    ...>           Inspect.Algebra.concat(\n    ...>             Inspect.Algebra.break(),\n    ...>             "A"\n    ...>           )\n    ...>         )\n    ...>       ),\n    ...>       Inspect.Algebra.concat(\n    ...>         Inspect.Algebra.break(),\n    ...>         "B"\n    ...>       )\n    ...>     )\n    ...>   )\n    iex> Inspect.Algebra.format(doc, 80)\n    ["Hello,", " ", "A", " ", "B"]\n    iex> Inspect.Algebra.format(doc, 6)\n    ["Hello,", "\\n", "A", "\\n", "B"]\n\n',
    },
    {
      name: "glue/3",
      type: "function",
      specs: ["@spec glue(t(), binary(), t()) :: t()"],
      documentation:
        'Glues two documents (`doc1` and `doc2`) inserting the given\nbreak `break_string` between them.\n\nFor more information on how the break is inserted, see `break/1`.\n\n## Examples\n\n    iex> doc = Inspect.Algebra.glue("hello", "world")\n    iex> Inspect.Algebra.format(doc, 80)\n    ["hello", " ", "world"]\n\n    iex> doc = Inspect.Algebra.glue("hello", "\\t", "world")\n    iex> Inspect.Algebra.format(doc, 80)\n    ["hello", "\\t", "world"]\n\n',
    },
    {
      name: "format/2",
      type: "function",
      specs: ["@spec format(t(), non_neg_integer() | :infinity) :: iodata()"],
      documentation:
        'Formats a given document for a given width.\n\nTakes the maximum width and a document to print as its arguments\nand returns an IO data representation of the best layout for the\ndocument to fit in the given width.\n\nThe document starts flat (without breaks) until a group is found.\n\n## Examples\n\n    iex> doc = Inspect.Algebra.glue("hello", " ", "world")\n    iex> doc = Inspect.Algebra.group(doc)\n    iex> doc |> Inspect.Algebra.format(30) |> IO.iodata_to_binary()\n    "hello world"\n    iex> doc |> Inspect.Algebra.format(10) |> IO.iodata_to_binary()\n    "hello\\nworld"\n\n',
    },
    {
      name: "force_unfit/1",
      type: "function",
      specs: ["@spec force_unfit(t()) :: doc_force()"],
      documentation: "Forces the current group to be unfit.\n",
    },
    {
      name: "fold_doc/2",
      type: "function",
      specs: ["@spec fold_doc([t()], (t(), t() -> t())) :: t()"],
      documentation:
        'Folds a list of documents into a document using the given folder function.\n\nThe list of documents is folded "from the right"; in that, this function is\nsimilar to `List.foldr/3`, except that it doesn\'t expect an initial\naccumulator and uses the last element of `docs` as the initial accumulator.\n\n## Examples\n\n    iex> docs = ["A", "B", "C"]\n    iex> docs =\n    ...>   Inspect.Algebra.fold_doc(docs, fn doc, acc ->\n    ...>     Inspect.Algebra.concat([doc, "!", acc])\n    ...>   end)\n    iex> Inspect.Algebra.format(docs, 80)\n    ["A", "!", "B", "!", "C"]\n\n',
    },
    {
      name: "flex_glue/3",
      type: "function",
      specs: ["@spec flex_glue(t(), binary(), t()) :: t()"],
      documentation:
        "Glues two documents (`doc1` and `doc2`) inserting a\n`flex_break/1` given by `break_string` between them.\n\nThis function is used by `container_doc/6` and friends\nto the maximum number of entries on the same line.\n",
    },
    {
      name: "flex_break/1",
      type: "function",
      specs: ["@spec flex_break(binary()) :: doc_break()"],
      documentation:
        'Returns a flex break document based on the given `string`.\n\nA flex break still causes a group to break, like `break/1`,\nbut it is re-evaluated when the documented is rendered.\n\nFor example, take a group document represented as `[1, 2, 3]`\nwhere the space after every comma is a break. When the document\nabove does not fit a single line, all breaks are enabled,\ncausing the document to be rendered as:\n\n    [1,\n     2,\n     3]\n\nHowever, if flex breaks are used, then each break is re-evaluated\nwhen rendered, so the document could be possible rendered as:\n\n    [1, 2,\n     3]\n\nHence the name "flex". they are more flexible when it comes\nto the document fitting. On the other hand, they are more expensive\nsince each break needs to be re-evaluated.\n\nThis function is used by `container_doc/6` and friends to the\nmaximum number of entries on the same line.\n',
    },
    {
      name: "empty/0",
      type: "function",
      specs: ["@spec empty() :: :doc_nil"],
      documentation:
        "Returns a document entity used to represent nothingness.\n\n## Examples\n\n    iex> Inspect.Algebra.empty()\n    :doc_nil\n\n",
    },
    {
      name: "container_doc/6",
      type: "function",
      specs: [
        "@spec container_doc(\n        t(),\n        [any()],\n        t(),\n        Inspect.Opts.t(),\n        (term(), Inspect.Opts.t() -> t()),\n        keyword()\n      ) :: t()",
      ],
      documentation:
        'Wraps `collection` in `left` and `right` according to limit and contents.\n\nIt uses the given `left` and `right` documents as surrounding and the\nseparator document `separator` to separate items in `docs`. If all entries\nin the collection are simple documents (texts or strings), then this function\nattempts to put as much as possible on the same line. If they are not simple,\nonly one entry is shown per line if they do not fit.\n\nThe limit in the given `inspect_opts` is respected and when reached this\nfunction stops processing and outputs `"..."` instead.\n\n## Options\n\n  * `:separator` - the separator used between each doc\n  * `:break` - If `:strict`, always break between each element. If `:flex`,\n    breaks only when necessary. If `:maybe`, chooses `:flex` only if all\n    elements are text-based, otherwise is `:strict`\n\n## Examples\n\n    iex> inspect_opts = %Inspect.Opts{limit: :infinity}\n    iex> fun = fn i, _opts -> to_string(i) end\n    iex> doc = Inspect.Algebra.container_doc("[", Enum.to_list(1..5), "]", inspect_opts, fun)\n    iex> Inspect.Algebra.format(doc, 5) |> IO.iodata_to_binary()\n    "[1,\\n 2,\\n 3,\\n 4,\\n 5]"\n\n    iex> inspect_opts = %Inspect.Opts{limit: 3}\n    iex> fun = fn i, _opts -> to_string(i) end\n    iex> doc = Inspect.Algebra.container_doc("[", Enum.to_list(1..5), "]", inspect_opts, fun)\n    iex> Inspect.Algebra.format(doc, 20) |> IO.iodata_to_binary()\n    "[1, 2, 3, ...]"\n\n    iex> inspect_opts = %Inspect.Opts{limit: 3}\n    iex> fun = fn i, _opts -> to_string(i) end\n    iex> opts = [separator: "!"]\n    iex> doc = Inspect.Algebra.container_doc("[", Enum.to_list(1..5), "]", inspect_opts, fun, opts)\n    iex> Inspect.Algebra.format(doc, 20) |> IO.iodata_to_binary()\n    "[1! 2! 3! ...]"\n\n',
    },
    {
      name: "concat/2",
      type: "function",
      specs: ["@spec concat(t(), t()) :: t()"],
      documentation:
        'Concatenates two document entities returning a new document.\n\n## Examples\n\n    iex> doc = Inspect.Algebra.concat("hello", "world")\n    iex> Inspect.Algebra.format(doc, 80)\n    ["hello", "world"]\n\n',
    },
    {
      name: "concat/1",
      type: "function",
      specs: ["@spec concat([t()]) :: t()"],
      documentation:
        'Concatenates a list of documents returning a new document.\n\n## Examples\n\n    iex> doc = Inspect.Algebra.concat(["a", "b", "c"])\n    iex> Inspect.Algebra.format(doc, 80)\n    ["a", "b", "c"]\n\n',
    },
    {
      name: "color/3",
      type: "function",
      specs: [
        "@spec color(t(), Inspect.Opts.color_key(), Inspect.Opts.t()) :: t()",
      ],
      documentation:
        "Colors a document if the `color_key` has a color in the options.\n",
    },
    {
      name: "collapse_lines/1",
      type: "function",
      specs: ["@spec collapse_lines(pos_integer()) :: doc_collapse()"],
      documentation:
        "Collapse any new lines and whitespace following this\nnode, emitting up to `max` new lines.\n",
    },
    {
      name: "break/1",
      type: "function",
      specs: ["@spec break(binary()) :: doc_break()"],
      documentation:
        'Returns a break document based on the given `string`.\n\nThis break can be rendered as a linebreak or as the given `string`,\ndepending on the `mode` of the chosen layout.\n\n## Examples\n\nLet\'s create a document by concatenating two strings with a break between\nthem:\n\n    iex> doc = Inspect.Algebra.concat(["a", Inspect.Algebra.break("\\t"), "b"])\n    iex> Inspect.Algebra.format(doc, 80)\n    ["a", "\\t", "b"]\n\nNote that the break was represented with the given string, because we didn\'t\nreach a line limit. Once we do, it is replaced by a newline:\n\n    iex> break = Inspect.Algebra.break("\\t")\n    iex> doc = Inspect.Algebra.concat([String.duplicate("a", 20), break, "b"])\n    iex> doc = Inspect.Algebra.group(doc)\n    iex> Inspect.Algebra.format(doc, 10)\n    ["aaaaaaaaaaaaaaaaaaaa", "\\n", "b"]\n\n',
    },
  ],
  name: "Inspect.Algebra",
  callbacks: [],
  macros: [{ name: "is_doc/1", type: "macro", specs: [], documentation: null }],
  types: [
    {
      name: "t/0",
      type: "type",
      specs: [
        "@type t() ::\n        binary()\n        | :doc_line\n        | :doc_nil\n        | doc_break()\n        | doc_collapse()\n        | doc_color()\n        | doc_cons()\n        | doc_fits()\n        | doc_force()\n        | doc_group()\n        | doc_nest()\n        | doc_string()\n        | doc_limit()",
      ],
      documentation: null,
    },
  ],
};
