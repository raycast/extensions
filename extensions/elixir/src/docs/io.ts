import type { ModuleDoc } from "../types";

export const IO: ModuleDoc = {
  functions: [
    {
      name: "write/2",
      type: "function",
      specs: ["@spec write(device(), chardata() | String.Chars.t()) :: :ok"],
      documentation:
        'Writes `chardata` to the given `device`.\n\nBy default, the `device` is the standard output.\n\n## Examples\n\n    IO.write("sample")\n    #=> sample\n\n    IO.write(:stderr, "error")\n    #=> error\n\n',
    },
    {
      name: "warn/2",
      type: "function",
      specs: [
        "@spec warn(\n        chardata() | String.Chars.t(),\n        Exception.stacktrace() | keyword() | Macro.Env.t()\n      ) :: :ok",
      ],
      documentation:
        'Writes a `message` to stderr, along with the given `stacktrace_info`.\n\nThe `stacktrace_info` must be one of:\n\n  * a `__STACKTRACE__`, where all entries in the stacktrace will be\n    included in the error message\n\n  * a `Macro.Env` structure (since v1.14.0), where a single stacktrace\n    entry from the compilation environment will be used\n\n  * a keyword list with at least the `:file` option representing\n    a single stacktrace entry (since v1.14.0). The `:line`, `:column`,\n    `:module`, and `:function` options are also supported\n\nThis function notifies the compiler a warning was printed\nand emits a compiler diagnostic (`t:Code.diagnostic/1`).\nThe diagnostic will include precise file and location information\nif a `Macro.Env` is given or those values have been passed as\nkeyword list, but not for stacktraces, as they are often imprecise.\n\nIt returns `:ok` if it succeeds.\n\n## Examples\n\n    IO.warn("variable bar is unused", module: MyApp, function: {:main, 1}, line: 4, file: "my_app.ex")\n    #=> warning: variable bar is unused\n    #=>   my_app.ex:4: MyApp.main/1\n\n',
    },
    {
      name: "warn/1",
      type: "function",
      specs: ["@spec warn(chardata() | String.Chars.t()) :: :ok"],
      documentation:
        'Writes a `message` to stderr, along with the current stacktrace.\n\nIt returns `:ok` if it succeeds.\n\nDo not call this function at the tail of another function. Due to tail\ncall optimization, a stacktrace entry would not be added and the\nstacktrace would be incorrectly trimmed. Therefore make sure at least\none expression (or an atom such as `:ok`) follows the `IO.warn/1` call.\n\n## Examples\n\n    IO.warn("variable bar is unused")\n    #=> warning: variable bar is unused\n    #=>   (iex) evaluator.ex:108: IEx.Evaluator.eval/4\n\n',
    },
    {
      name: "stream/2",
      type: "function",
      specs: [
        "@spec stream(device(), :line | pos_integer()) :: Enumerable.t()",
      ],
      documentation:
        'Converts the IO `device` into an `IO.Stream`.\n\nAn `IO.Stream` implements both `Enumerable` and\n`Collectable`, allowing it to be used for both read\nand write.\n\nThe `device` is iterated by the given number of characters or line by line if\n`:line` is given.\n\nThis reads from the IO as UTF-8. Check out\n`IO.binstream/2` to handle the IO as a raw binary.\n\nNote that an IO stream has side effects and every time\nyou go over the stream you may get different results.\n\n`stream/0` has been introduced in Elixir v1.12.0,\nwhile `stream/2` has been available since v1.0.0.\n\n## Examples\n\nHere is an example on how we mimic an echo server\nfrom the command line:\n\n    Enum.each(IO.stream(:stdio, :line), &IO.write(&1))\n\nAnother example where you might want to collect a user input\nevery new line and break on an empty line, followed by removing\nredundant new line characters (`"\\n"`):\n\n    IO.stream(:stdio, :line)\n    |> Enum.take_while(&(&1 != "\\n"))\n    |> Enum.map(&String.replace(&1, "\\n", ""))\n\n',
    },
    {
      name: "stream/0",
      type: "function",
      specs: ["@spec stream() :: Enumerable.t(String.t())"],
      documentation:
        "Returns a line-based `IO.Stream` on `:stdio`.\n\nThis is equivalent to:\n\n    IO.stream(:stdio, :line)\n\n",
    },
    {
      name: "read/2",
      type: "function",
      specs: [
        "@spec read(device(), :eof | :line | non_neg_integer()) :: chardata() | nodata()",
      ],
      documentation:
        "Reads from the IO `device`.\n\nThe `device` is iterated as specified by the `line_or_chars` argument:\n\n  * if `line_or_chars` is an integer, it represents a number of bytes. The device is\n    iterated by that number of bytes.\n\n  * if `line_or_chars` is `:line`, the device is iterated line by line.\n\n  * if `line_or_chars` is `:eof` (since v1.13), the device is iterated until `:eof`.\n    If the device is already at the end, it returns `:eof` itself.\n\nIt returns:\n\n  * `data` - the output characters\n\n  * `:eof` - end of file was encountered\n\n  * `{:error, reason}` - other (rare) error condition;\n    for instance, `{:error, :estale}` if reading from an\n    NFS volume\n\n",
    },
    {
      name: "puts/2",
      type: "function",
      specs: ["@spec puts(device(), chardata() | String.Chars.t()) :: :ok"],
      documentation:
        'Writes `item` to the given `device`, similar to `write/2`,\nbut adds a newline at the end.\n\nBy default, the `device` is the standard output. It returns `:ok`\nif it succeeds.\n\n## Examples\n\n    IO.puts("Hello World!")\n    #=> Hello World!\n\n    IO.puts(:stderr, "error")\n    #=> error\n\n',
    },
    {
      name: "iodata_to_binary/1",
      type: "function",
      specs: ["@spec iodata_to_binary(iodata()) :: binary()"],
      documentation:
        'Converts IO data into a binary\n\nThe operation is Unicode unsafe.\n\nNote that this function treats integers in the given IO data as\nraw bytes and does not perform any kind of encoding conversion.\nIf you want to convert from a charlist to a UTF-8-encoded string,\nuse `chardata_to_string/1` instead. For more information about\nIO data and chardata, see the ["IO data"](#module-io-data) section in the\nmodule documentation.\n\nIf this function receives a binary, the same binary is returned.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> bin1 = <<1, 2, 3>>\n    iex> bin2 = <<4, 5>>\n    iex> bin3 = <<6>>\n    iex> IO.iodata_to_binary([bin1, 1, [2, 3, bin2], 4 | bin3])\n    <<1, 2, 3, 1, 2, 3, 4, 5, 4, 6>>\n\n    iex> bin = <<1, 2, 3>>\n    iex> IO.iodata_to_binary(bin)\n    <<1, 2, 3>>\n\n',
    },
    {
      name: "iodata_length/1",
      type: "function",
      specs: ["@spec iodata_length(iodata()) :: non_neg_integer()"],
      documentation:
        'Returns the size of an IO data.\n\nFor more information about IO data, see the ["IO data"](#module-io-data)\nsection in the module documentation.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> IO.iodata_length([1, 2 | <<3, 4>>])\n    4\n\n',
    },
    {
      name: "inspect/3",
      type: "function",
      specs: [
        "@spec inspect(device(), item, keyword()) :: item when item: var",
      ],
      documentation:
        "Inspects `item` according to the given options using the IO `device`.\n\nSee `inspect/2` for a full list of options.\n",
    },
    {
      name: "inspect/2",
      type: "function",
      specs: [
        "@spec inspect(\n        item,\n        keyword()\n      ) :: item\n      when item: var",
      ],
      documentation:
        'Inspects and writes the given `item` to the standard output.\n\nIt\'s important to note that it returns the given `item` unchanged.\nThis makes it possible to "spy" on values by inserting an\n`IO.inspect/2` call almost anywhere in your code, for example,\nin the middle of a pipeline.\n\nIt enables pretty printing by default with width of\n80 characters. The width can be changed by explicitly\npassing the `:width` option.\n\nThe output can be decorated with a label, by providing the `:label`\noption to easily distinguish it from other `IO.inspect/2` calls.\nThe label will be printed before the inspected `item`.\n\nSee `Inspect.Opts` for a full list of remaining formatting options.\nTo print to other IO devices, see `IO.inspect/3`\n\n## Examples\n\n    IO.inspect(<<0, 1, 2>>, width: 40)\n\nPrints:\n\n    <<0, 1, 2>>\n\nWe can use the `:label` option to decorate the output:\n\n    IO.inspect(1..100, label: "a wonderful range")\n\nPrints:\n\n    a wonderful range: 1..100\n\nThe `:label` option is especially useful with pipelines:\n\n    [1, 2, 3]\n    |> IO.inspect(label: "before")\n    |> Enum.map(&(&1 * 2))\n    |> IO.inspect(label: "after")\n    |> Enum.sum()\n\nPrints:\n\n    before: [1, 2, 3]\n    after: [2, 4, 6]\n\n',
    },
    {
      name: "gets/2",
      type: "function",
      specs: [
        "@spec gets(device(), chardata() | String.Chars.t()) :: chardata() | nodata()",
      ],
      documentation:
        'Reads a line from the IO `device`.\n\nIt returns:\n\n  * `data` - the characters in the line terminated\n    by a line-feed (LF) or end of file (EOF)\n\n  * `:eof` - end of file was encountered\n\n  * `{:error, reason}` - other (rare) error condition;\n    for instance, `{:error, :estale}` if reading from an\n    NFS volume\n\n## Examples\n\nTo display "What is your name?" as a prompt and await user input:\n\n    IO.gets("What is your name?\\n")\n\n',
    },
    {
      name: "getn/3",
      type: "function",
      specs: [
        "@spec getn(device(), chardata() | String.Chars.t(), pos_integer() | :eof) ::\n        chardata() | nodata()",
      ],
      documentation:
        "Gets a number of bytes from the IO `device`.\n\nIf the IO `device` is a Unicode device, `count` implies\nthe number of Unicode code points to be retrieved.\nOtherwise, `count` is the number of raw bytes to be retrieved.\n\nIt returns:\n\n  * `data` - the input characters\n\n  * `:eof` - end of file was encountered\n\n  * `{:error, reason}` - other (rare) error condition;\n    for instance, `{:error, :estale}` if reading from an\n    NFS volume\n\n",
    },
    {
      name: "getn/2",
      type: "function",
      specs: [
        "@spec getn(\n        device() | chardata() | String.Chars.t(),\n        pos_integer() | :eof | chardata() | String.Chars.t()\n      ) :: chardata() | nodata()",
      ],
      documentation:
        "Gets a number of bytes from IO device `:stdio`.\n\nIf `:stdio` is a Unicode device, `count` implies\nthe number of Unicode code points to be retrieved.\nOtherwise, `count` is the number of raw bytes to be retrieved.\n\nSee `IO.getn/3` for a description of return values.\n",
    },
    {
      name: "chardata_to_string/1",
      type: "function",
      specs: ["@spec chardata_to_string(chardata()) :: String.t()"],
      documentation:
        'Converts chardata into a string.\n\nFor more information about chardata, see the ["Chardata"](#module-chardata)\nsection in the module documentation.\n\nIn case the conversion fails, it raises an `UnicodeConversionError`.\nIf a string is given, it returns the string itself.\n\n## Examples\n\n    iex> IO.chardata_to_string([0x00E6, 0x00DF])\n    "æß"\n\n    iex> IO.chardata_to_string([0x0061, "bc"])\n    "abc"\n\n    iex> IO.chardata_to_string("string")\n    "string"\n\n',
    },
    {
      name: "binwrite/2",
      type: "function",
      specs: ["@spec binwrite(device(), iodata()) :: :ok"],
      documentation:
        'Writes `iodata` to the given `device`.\n\nThis operation is meant to be used with "raw" devices\nthat are started without an encoding. The given `iodata`\nis written as is to the device, without conversion. For\nmore information on IO data, see the "IO data" section in\nthe module documentation.\n\nUse `write/2` for devices with encoding.\n\nImportant: do **not** use this function on IO devices in\nUnicode mode as it will write the wrong data. In particular,\nthe standard IO device is set to Unicode by default, so writing\nto stdio with this function will likely result in the wrong data\nbeing sent down the wire.\n',
    },
    {
      name: "binstream/2",
      type: "function",
      specs: [
        "@spec binstream(device(), :line | pos_integer()) :: Enumerable.t()",
      ],
      documentation:
        "Converts the IO `device` into an `IO.Stream`. The operation is Unicode unsafe.\n\nAn `IO.Stream` implements both `Enumerable` and\n`Collectable`, allowing it to be used for both read\nand write.\n\nThe `device` is iterated by the given number of bytes or line by line if\n`:line` is given. This reads from the IO device as a raw binary.\n\nNote that an IO stream has side effects and every time\nyou go over the stream you may get different results.\n\nFinally, do not use this function on IO devices in Unicode\nmode as it will return the wrong result.\n\n`binstream/0` has been introduced in Elixir v1.12.0,\nwhile `binstream/2` has been available since v1.0.0.\n",
    },
    {
      name: "binstream/0",
      type: "function",
      specs: ["@spec binstream() :: Enumerable.t(binary())"],
      documentation:
        "Returns a raw, line-based `IO.Stream` on `:stdio`. The operation is Unicode unsafe.\n\nThis is equivalent to:\n\n    IO.binstream(:stdio, :line)\n\n",
    },
    {
      name: "binread/2",
      type: "function",
      specs: [
        "@spec binread(device(), :eof | :line | non_neg_integer()) :: iodata() | nodata()",
      ],
      documentation:
        "Reads from the IO `device`. The operation is Unicode unsafe.\n\nThe `device` is iterated as specified by the `line_or_chars` argument:\n\n  * if `line_or_chars` is an integer, it represents a number of bytes. The device is\n    iterated by that number of bytes.\n\n  * if `line_or_chars` is `:line`, the device is iterated line by line.\n\n  * if `line_or_chars` is `:eof` (since v1.13), the device is iterated until `:eof`.\n    If the device is already at the end, it returns `:eof` itself.\n\nIt returns:\n\n  * `data` - the output bytes\n\n  * `:eof` - end of file was encountered\n\n  * `{:error, reason}` - other (rare) error condition;\n    for instance, `{:error, :estale}` if reading from an\n    NFS volume\n\nNote: do not use this function on IO devices in Unicode mode\nas it will return the wrong result.\n",
    },
  ],
  name: "IO",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "chardata/0",
      type: "type",
      specs: [
        "@type chardata() ::\n        String.t() | maybe_improper_list(char() | chardata(), String.t() | [])",
      ],
      documentation: null,
    },
    {
      name: "nodata/0",
      type: "type",
      specs: ["@type nodata() :: {:error, term()} | :eof"],
      documentation: null,
    },
    {
      name: "device/0",
      type: "type",
      specs: ["@type device() :: atom() | pid()"],
      documentation: null,
    },
  ],
};
