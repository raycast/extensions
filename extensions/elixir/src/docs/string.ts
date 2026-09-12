import type { ModuleDoc } from "../types";

export const String: ModuleDoc = {
  functions: [
    {
      name: "valid?/2",
      type: "function",
      specs: ["@spec valid?(t(), :default | :fast_ascii) :: boolean()"],
      documentation:
        'Checks whether `string` contains only valid characters.\n\n`algorithm` may be `:default` or `:fast_ascii`. Both algorithms are equivalent\nfrom a validation perspective (they will always produce the same output), but\n`:fast_ascii` can yield significant performance benefits in specific scenarios.\n\nIf all of the following conditions are true, you may want to experiment with\nthe `:fast_ascii` algorithm to see if it yields performance benefits in your\nspecific scenario:\n\n* You are running Erlang/OTP 26 or newer on a 64 bit platform\n* You expect most of your strings to be longer than ~64 bytes\n* You expect most of your strings to contain mostly ASCII codepoints\n\nNote that the `:fast_ascii` algorithm does not affect correctness, you can\nexpect the output of `String.valid?/2` to be the same regardless of algorithm.\nThe only difference to be expected is one of performance, which can be\nexpected to improve roughly linearly in string length compared to the\n`:default` algorithm.\n\n## Examples\n\n    iex> String.valid?("a")\n    true\n\n    iex> String.valid?("ø")\n    true\n\n    iex> String.valid?(<<0xFFFF::16>>)\n    false\n\n    iex> String.valid?(<<0xEF, 0xB7, 0x90>>)\n    true\n\n    iex> String.valid?("asd" <> <<0xFFFF::16>>)\n    false\n\n    iex> String.valid?("a", :fast_ascii)\n    true\n\n    iex> String.valid?(4)\n    ** (FunctionClauseError) no function clause matching in String.valid?/2\n\n',
    },
    {
      name: "upcase/2",
      type: "function",
      specs: ["@spec upcase(t(), :default | :ascii | :greek | :turkic) :: t()"],
      documentation:
        'Converts all characters in the given string to uppercase according to `mode`.\n\n`mode` may be `:default`, `:ascii`, `:greek` or `:turkic`. The `:default` mode considers\nall non-conditional transformations outlined in the Unicode standard. `:ascii`\nuppercases only the letters a to z. `:greek` includes the context sensitive\nmappings found in Greek. `:turkic` properly handles the letter i with the dotless variant.\n\n## Examples\n\n    iex> String.upcase("abcd")\n    "ABCD"\n\n    iex> String.upcase("ab 123 xpto")\n    "AB 123 XPTO"\n\n    iex> String.upcase("olá")\n    "OLÁ"\n\nThe `:ascii` mode ignores Unicode characters and provides a more\nperformant implementation when you know the string contains only\nASCII characters:\n\n    iex> String.upcase("olá", :ascii)\n    "OLá"\n\nAnd `:turkic` properly handles the letter i with the dotless variant:\n\n    iex> String.upcase("ıi")\n    "II"\n\n    iex> String.upcase("ıi", :turkic)\n    "Iİ"\n\nAlso see `downcase/2` and `capitalize/2` for other conversions.\n',
    },
    {
      name: "trim_trailing/2",
      type: "function",
      specs: ["@spec trim_trailing(t(), t()) :: t()"],
      documentation:
        'Returns a string where all trailing `to_trim` characters have been removed.\n\n## Examples\n\n    iex> String.trim_trailing("_ abc __", "_")\n    "_ abc "\n\n    iex> String.trim_trailing("abc 1", "11")\n    "abc 1"\n\n',
    },
    {
      name: "trim_trailing/1",
      type: "function",
      specs: ["@spec trim_trailing(t()) :: t()"],
      documentation:
        'Returns a string where all trailing Unicode whitespaces\nhas been removed.\n\n## Examples\n\n    iex> String.trim_trailing("   abc\\n  ")\n    "   abc"\n\n',
    },
    {
      name: "trim_leading/2",
      type: "function",
      specs: ["@spec trim_leading(t(), t()) :: t()"],
      documentation:
        'Returns a string where all leading `to_trim` characters have been removed.\n\n## Examples\n\n    iex> String.trim_leading("__ abc _", "_")\n    " abc _"\n\n    iex> String.trim_leading("1 abc", "11")\n    "1 abc"\n\n',
    },
    {
      name: "trim_leading/1",
      type: "function",
      specs: ["@spec trim_leading(t()) :: t()"],
      documentation:
        'Returns a string where all leading Unicode whitespaces\nhave been removed.\n\n## Examples\n\n    iex> String.trim_leading("\\n  abc   ")\n    "abc   "\n\n',
    },
    {
      name: "trim/2",
      type: "function",
      specs: ["@spec trim(t(), t()) :: t()"],
      documentation:
        'Returns a string where all leading and trailing `to_trim` characters have been\nremoved.\n\n## Examples\n\n    iex> String.trim("a  abc  a", "a")\n    "  abc  "\n\n',
    },
    {
      name: "trim/1",
      type: "function",
      specs: ["@spec trim(t()) :: t()"],
      documentation:
        'Returns a string where all leading and trailing Unicode whitespaces\nhave been removed.\n\n## Examples\n\n    iex> String.trim("\\n  abc\\n  ")\n    "abc"\n\n',
    },
    {
      name: "to_integer/2",
      type: "function",
      specs: ["@spec to_integer(t(), 2..36) :: integer()"],
      documentation:
        'Returns an integer whose text representation is `string` in base `base`.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> String.to_integer("3FF", 16)\n    1023\n\n',
    },
    {
      name: "to_integer/1",
      type: "function",
      specs: ["@spec to_integer(t()) :: integer()"],
      documentation:
        'Returns an integer whose text representation is `string`.\n\n`string` must be the string representation of an integer.\nOtherwise, an `ArgumentError` will be raised. If you want\nto parse a string that may contain an ill-formatted integer,\nuse `Integer.parse/1`.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> String.to_integer("123")\n    123\n\nPassing a string that does not represent an integer leads to an error:\n\n    String.to_integer("invalid data")\n    ** (ArgumentError) argument error\n\n',
    },
    {
      name: "to_float/1",
      type: "function",
      specs: ["@spec to_float(t()) :: float()"],
      documentation:
        'Returns a float whose text representation is `string`.\n\n`string` must be the string representation of a float including a decimal point.\nIn order to parse a string without decimal point as a float then `Float.parse/1`\nshould be used. Otherwise, an `ArgumentError` will be raised.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> String.to_float("2.2017764e+0")\n    2.2017764\n\n    iex> String.to_float("3.0")\n    3.0\n\n    String.to_float("3")\n    ** (ArgumentError) argument error\n\n',
    },
    {
      name: "to_existing_atom/1",
      type: "function",
      specs: ["@spec to_existing_atom(t()) :: atom()"],
      documentation:
        'Converts a string to an existing atom or raises if\nthe atom does not exist.\n\nThe maximum atom size is of 255 Unicode code points.\nRaises an `ArgumentError` if the atom does not exist.\n\nInlined by the compiler.\n\n> #### Atoms and modules {: .info}\n>\n> Since Elixir is a compiled language, the atoms defined in a module\n> will only exist after said module is loaded, which typically happens\n> whenever a function in the module is executed. Therefore, it is\n> generally recommended to call `String.to_existing_atom/1` only to\n> convert atoms defined within the module making the function call\n> to `to_existing_atom/1`.\n>\n> To create a module name itself from a string safely,\n> it is recommended to use `Module.safe_concat/1`.\n\n## Examples\n\n    iex> _ = :my_atom\n    iex> String.to_existing_atom("my_atom")\n    :my_atom\n\n',
    },
    {
      name: "to_charlist/1",
      type: "function",
      specs: ["@spec to_charlist(t()) :: charlist()"],
      documentation:
        'Converts a string into a charlist.\n\nSpecifically, this function takes a UTF-8 encoded binary and returns a list of its integer\ncode points. It is similar to `codepoints/1` except that the latter returns a list of code points as\nstrings.\n\nIn case you need to work with bytes, take a look at the\n[`:binary` module](`:binary`).\n\n## Examples\n\n    iex> String.to_charlist("foo")\n    ~c"foo"\n\n',
    },
    {
      name: "to_atom/1",
      type: "function",
      specs: ["@spec to_atom(t()) :: atom()"],
      documentation:
        'Converts a string to an existing atom or creates a new one.\n\nWarning: this function creates atoms dynamically and atoms are\nnot garbage-collected. Therefore, `string` should not be an\nuntrusted value, such as input received from a socket or during\na web request. Consider using `to_existing_atom/1` instead.\n\nBy default, the maximum number of atoms is `1_048_576`. This limit\ncan be raised or lowered using the VM option `+t`.\n\nThe maximum atom size is of 255 Unicode code points.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> String.to_atom("my_atom")\n    :my_atom\n\n',
    },
    {
      name: "starts_with?/2",
      type: "function",
      specs: ["@spec starts_with?(t(), t() | [t()]) :: boolean()"],
      documentation:
        'Returns `true` if `string` starts with any of the prefixes given.\n\n`prefix` can be either a string, a list of strings, or a compiled\npattern.\n\n## Examples\n\n    iex> String.starts_with?("elixir", "eli")\n    true\n    iex> String.starts_with?("elixir", ["erlang", "elixir"])\n    true\n    iex> String.starts_with?("elixir", ["erlang", "ruby"])\n    false\n\nAn empty string will always match:\n\n    iex> String.starts_with?("elixir", "")\n    true\n    iex> String.starts_with?("elixir", ["", "other"])\n    true\n\nAn empty list will never match:\n\n    iex> String.starts_with?("elixir", [])\n    false\n\n    iex> String.starts_with?("", [])\n    false\n\n',
    },
    {
      name: "splitter/3",
      type: "function",
      specs: ["@spec splitter(t(), pattern(), keyword()) :: Enumerable.t()"],
      documentation:
        'Returns an enumerable that splits a string on demand.\n\nThis is in contrast to `split/3` which splits the\nentire string upfront.\n\nThis function does not support regular expressions\nby design. When using regular expressions, it is often\nmore efficient to have the regular expressions traverse\nthe string at once than in parts, like this function does.\n\n## Options\n\n  * :trim - when `true`, does not emit empty patterns\n\n## Examples\n\n    iex> String.splitter("1,2 3,4 5,6 7,8,...,99999", [" ", ","]) |> Enum.take(4)\n    ["1", "2", "3", "4"]\n\n    iex> String.splitter("abcd", "") |> Enum.take(10)\n    ["", "a", "b", "c", "d", ""]\n\n    iex> String.splitter("abcd", "", trim: true) |> Enum.take(10)\n    ["a", "b", "c", "d"]\n\nA compiled pattern can also be given:\n\n    iex> pattern = :binary.compile_pattern([" ", ","])\n    iex> String.splitter("1,2 3,4 5,6 7,8,...,99999", pattern) |> Enum.take(4)\n    ["1", "2", "3", "4"]\n\n',
    },
    {
      name: "split_at/2",
      type: "function",
      specs: ["@spec split_at(t(), integer()) :: {t(), t()}"],
      documentation:
        'Splits a string into two at the specified offset. When the offset given is\nnegative, location is counted from the end of the string.\n\nThe offset is capped to the length of the string. Returns a tuple with\ntwo elements.\n\nNote: keep in mind this function splits on graphemes and for such it\nhas to linearly traverse the string. If you want to split a string or\na binary based on the number of bytes, use `Kernel.binary_part/3`\ninstead.\n\n## Examples\n\n    iex> String.split_at("sweetelixir", 5)\n    {"sweet", "elixir"}\n\n    iex> String.split_at("sweetelixir", -6)\n    {"sweet", "elixir"}\n\n    iex> String.split_at("abc", 0)\n    {"", "abc"}\n\n    iex> String.split_at("abc", 1000)\n    {"abc", ""}\n\n    iex> String.split_at("abc", -1000)\n    {"", "abc"}\n\n',
    },
    {
      name: "split/3",
      type: "function",
      specs: ["@spec split(t(), pattern() | Regex.t(), keyword()) :: [t()]"],
      documentation:
        'Divides a string into parts based on a pattern.\n\nReturns a list of these parts.\n\nThe `pattern` may be a string, a list of strings, a regular expression, or a\ncompiled pattern.\n\nThe string is split into as many parts as possible by\ndefault, but can be controlled via the `:parts` option.\n\nEmpty strings are only removed from the result if the\n`:trim` option is set to `true`.\n\nWhen the pattern used is a regular expression, the string is\nsplit using `Regex.split/3`.\n\nIf the pattern cannot be found, a list containing the original\nstring will be returned.\n\n## Options\n\n  * `:parts` (positive integer or `:infinity`) - the string\n    is split into at most as many parts as this option specifies.\n    If `:infinity`, the string will be split into all possible\n    parts. Defaults to `:infinity`.\n\n  * `:trim` (boolean) - if `true`, empty strings are removed from\n    the resulting list.\n\nThis function also accepts all options accepted by `Regex.split/3`\nif `pattern` is a regular expression.\n\n## Examples\n\nSplitting with a string pattern:\n\n    iex> String.split("a,b,c", ",")\n    ["a", "b", "c"]\n\n    iex> String.split("a,b,c", ",", parts: 2)\n    ["a", "b,c"]\n\n    iex> String.split(" a b c ", " ", trim: true)\n    ["a", "b", "c"]\n\nA list of patterns:\n\n    iex> String.split("1,2 3,4", [" ", ","])\n    ["1", "2", "3", "4"]\n\nA regular expression:\n\n    iex> String.split("a,b,c", ~r{,})\n    ["a", "b", "c"]\n\n    iex> String.split("a,b,c", ~r{,}, parts: 2)\n    ["a", "b,c"]\n\n    iex> String.split(" a b c ", ~r{\\s}, trim: true)\n    ["a", "b", "c"]\n\n    iex> String.split("abc", ~r{b}, include_captures: true)\n    ["a", "b", "c"]\n\nA compiled pattern:\n\n    iex> pattern = :binary.compile_pattern([" ", ","])\n    iex> String.split("1,2 3,4", pattern)\n    ["1", "2", "3", "4"]\n\nSplitting on empty string returns graphemes:\n\n    iex> String.split("abc", "")\n    ["", "a", "b", "c", ""]\n\n    iex> String.split("abc", "", trim: true)\n    ["a", "b", "c"]\n\n    iex> String.split("abc", "", parts: 1)\n    ["abc"]\n\n    iex> String.split("abc", "", parts: 3)\n    ["", "a", "bc"]\n\nSplitting on an non-existing pattern returns the original string:\n\n    iex> String.split("abc", ",")\n    ["abc"]\n\nBe aware that this function can split within or across grapheme boundaries.\nFor example, take the grapheme "é" which is made of the characters\n"e" and the acute accent. The following will split the string into two parts:\n\n    iex> String.split(String.normalize("é", :nfd), "e")\n    ["", "́"]\n\nHowever, if "é" is represented by the single character "e with acute"\naccent, then it will split the string into just one part:\n\n    iex> String.split(String.normalize("é", :nfc), "e")\n    ["é"]\n\n',
    },
    {
      name: "split/1",
      type: "function",
      specs: ["@spec split(t()) :: [t()]"],
      documentation:
        'Divides a string into substrings at each Unicode whitespace\noccurrence with leading and trailing whitespace ignored. Groups\nof whitespace are treated as a single occurrence. Divisions do\nnot occur on non-breaking whitespace.\n\n## Examples\n\n    iex> String.split("foo bar")\n    ["foo", "bar"]\n\n    iex> String.split("foo" <> <<194, 133>> <> "bar")\n    ["foo", "bar"]\n\n    iex> String.split(" foo   bar ")\n    ["foo", "bar"]\n\n    iex> String.split("no\\u00a0break")\n    ["no\\u00a0break"]\n\n',
    },
    {
      name: "slice/3",
      type: "function",
      specs: ["@spec slice(t(), integer(), non_neg_integer()) :: grapheme()"],
      documentation:
        'Returns a substring starting at the offset `start`, and of the given `length`.\n\nThis function works on Unicode graphemes. For example, slicing the first\nthree characters of the string "héllo" will return "hél", which internally\nis represented by more than three bytes. Use `String.byte_slice/3` if you\nwant to slice by a given number of bytes, while respecting the codepoint\nboundaries. If you want to work on raw bytes, check `Kernel.binary_part/3`\nor `Kernel.binary_slice/3` instead.\n\nIf the offset is greater than string length, then it returns `""`.\n\n## Examples\n\n    iex> String.slice("elixir", 1, 3)\n    "lix"\n\n    iex> String.slice("elixir", 1, 10)\n    "lixir"\n\n    iex> String.slice("elixir", 10, 3)\n    ""\n\nIf the start position is negative, it is normalized\nagainst the string length and clamped to 0:\n\n    iex> String.slice("elixir", -4, 4)\n    "ixir"\n\n    iex> String.slice("elixir", -10, 3)\n    "eli"\n\nIf start is more than the string length, an empty\nstring is returned:\n\n    iex> String.slice("elixir", 10, 1500)\n    ""\n\n',
    },
    {
      name: "slice/2",
      type: "function",
      specs: ["@spec slice(t(), Range.t()) :: t()"],
      documentation:
        'Returns a substring from the offset given by the start of the\nrange to the offset given by the end of the range.\n\nThis function works on Unicode graphemes. For example, slicing the first\nthree characters of the string "héllo" will return "hél", which internally\nis represented by more than three bytes. Use `String.byte_slice/3` if you\nwant to slice by a given number of bytes, while respecting the codepoint\nboundaries. If you want to work on raw bytes, check `Kernel.binary_part/3`\nor `Kernel.binary_slice/3` instead.\n\nIf the start of the range is not a valid offset for the given\nstring or if the range is in reverse order, returns `""`.\n\nIf the start or end of the range is negative, the whole string\nis traversed first in order to convert the negative indices into\npositive ones.\n\n## Examples\n\n    iex> String.slice("elixir", 1..3)\n    "lix"\n    iex> String.slice("elixir", 1..10)\n    "lixir"\n\n    iex> String.slice("elixir", -4..-1)\n    "ixir"\n    iex> String.slice("elixir", -4..6)\n    "ixir"\n    iex> String.slice("elixir", -100..100)\n    "elixir"\n\nFor ranges where `start > stop`, you need to explicitly\nmark them as increasing:\n\n    iex> String.slice("elixir", 2..-1//1)\n    "ixir"\n    iex> String.slice("elixir", 1..-2//1)\n    "lixi"\n\nYou can use `../0` as a shortcut for `0..-1//1`, which returns\nthe whole string as is:\n\n    iex> String.slice("elixir", ..)\n    "elixir"\n\nThe step can be any positive number. For example, to\nget every 2 characters of the string:\n\n    iex> String.slice("elixir", 0..-1//2)\n    "eii"\n\nIf the first position is after the string ends or after\nthe last position of the range, it returns an empty string:\n\n    iex> String.slice("elixir", 10..3//1)\n    ""\n    iex> String.slice("a", 1..1500)\n    ""\n\n',
    },
    {
      name: "reverse/1",
      type: "function",
      specs: ["@spec reverse(t()) :: t()"],
      documentation:
        'Reverses the graphemes in given string.\n\n## Examples\n\n    iex> String.reverse("abcd")\n    "dcba"\n\n    iex> String.reverse("hello world")\n    "dlrow olleh"\n\n    iex> String.reverse("hello ∂og")\n    "go∂ olleh"\n\nKeep in mind reversing the same string twice does\nnot necessarily yield the original string:\n\n    iex> "̀e"\n    "̀e"\n    iex> String.reverse("̀e")\n    "è"\n    iex> String.reverse(String.reverse("̀e"))\n    "è"\n\nIn the first example the accent is before the vowel, so\nit is considered two graphemes. However, when you reverse\nit once, you have the vowel followed by the accent, which\nbecomes one grapheme. Reversing it again will keep it as\none single grapheme.\n',
    },
    {
      name: "replace_trailing/3",
      type: "function",
      specs: ["@spec replace_trailing(t(), t(), t()) :: t()"],
      documentation:
        'Replaces all trailing occurrences of `match` by `replacement` in `string`.\n\nReturns the string untouched if there are no occurrences.\n\nIf `match` is `""`, this function raises an `ArgumentError` exception: this\nhappens because this function replaces **all** the occurrences of `match` at\nthe end of `string`, and it\'s impossible to replace "multiple" occurrences of\n`""`.\n\n## Examples\n\n    iex> String.replace_trailing("hello world", " world", "")\n    "hello"\n    iex> String.replace_trailing("hello world world", " world", "")\n    "hello"\n\n    iex> String.replace_trailing("hello world", " world", " mundo")\n    "hello mundo"\n    iex> String.replace_trailing("hello world world", " world", " mundo")\n    "hello mundo mundo"\n\nThis function can replace across grapheme boundaries. See `replace/3`\nfor more information and examples.\n',
    },
    {
      name: "replace_suffix/3",
      type: "function",
      specs: ["@spec replace_suffix(t(), t(), t()) :: t()"],
      documentation:
        'Replaces suffix in `string` by `replacement` if it matches `match`.\n\nReturns the string untouched if there is no match. If `match` is an empty\nstring (`""`), `replacement` is just appended to `string`.\n\n## Examples\n\n    iex> String.replace_suffix("hello", " world", "")\n    "hello"\n    iex> String.replace_suffix("hello world", " world", "")\n    "hello"\n    iex> String.replace_suffix("hello world world", " world", "")\n    "hello world"\n\n    iex> String.replace_suffix("hello", " world", " mundo")\n    "hello"\n    iex> String.replace_suffix("hello world", " world", " mundo")\n    "hello mundo"\n    iex> String.replace_suffix("hello world world", " world", " mundo")\n    "hello world mundo"\n\n    iex> String.replace_suffix("hello", "", " world")\n    "hello world"\n\nThis function can replace across grapheme boundaries. See `replace/3`\nfor more information and examples.\n',
    },
    {
      name: "replace_prefix/3",
      type: "function",
      specs: ["@spec replace_prefix(t(), t(), t()) :: t()"],
      documentation:
        'Replaces prefix in `string` by `replacement` if it matches `match`.\n\nReturns the string untouched if there is no match. If `match` is an empty\nstring (`""`), `replacement` is just prepended to `string`.\n\n## Examples\n\n    iex> String.replace_prefix("world", "hello ", "")\n    "world"\n    iex> String.replace_prefix("hello world", "hello ", "")\n    "world"\n    iex> String.replace_prefix("hello hello world", "hello ", "")\n    "hello world"\n\n    iex> String.replace_prefix("world", "hello ", "ola ")\n    "world"\n    iex> String.replace_prefix("hello world", "hello ", "ola ")\n    "ola world"\n    iex> String.replace_prefix("hello hello world", "hello ", "ola ")\n    "ola hello world"\n\n    iex> String.replace_prefix("world", "", "hello ")\n    "hello world"\n\nThis function can replace across grapheme boundaries. See `replace/3`\nfor more information and examples.\n',
    },
    {
      name: "replace_leading/3",
      type: "function",
      specs: ["@spec replace_leading(t(), t(), t()) :: t()"],
      documentation:
        'Replaces all leading occurrences of `match` by `replacement` of `match` in `string`.\n\nReturns the string untouched if there are no occurrences.\n\nIf `match` is `""`, this function raises an `ArgumentError` exception: this\nhappens because this function replaces **all** the occurrences of `match` at\nthe beginning of `string`, and it\'s impossible to replace "multiple"\noccurrences of `""`.\n\n## Examples\n\n    iex> String.replace_leading("hello world", "hello ", "")\n    "world"\n    iex> String.replace_leading("hello hello world", "hello ", "")\n    "world"\n\n    iex> String.replace_leading("hello world", "hello ", "ola ")\n    "ola world"\n    iex> String.replace_leading("hello hello world", "hello ", "ola ")\n    "ola ola world"\n\nThis function can replace across grapheme boundaries. See `replace/3`\nfor more information and examples.\n',
    },
    {
      name: "replace_invalid/2",
      type: "function",
      specs: ["@spec replace_invalid(binary(), t()) :: t()"],
      documentation:
        'Returns a new string created by replacing all invalid bytes with `replacement` (`"�"` by default).\n\n## Examples\n\n    iex> String.replace_invalid("asd" <> <<0xFF::8>>)\n    "asd�"\n\n    iex> String.replace_invalid("nem rán bề bề")\n    "nem rán bề bề"\n\n    iex> String.replace_invalid("nem rán b" <> <<225, 187>> <> " bề")\n    "nem rán b� bề"\n\n    iex> String.replace_invalid("nem rán b" <> <<225, 187>> <> " bề", "ERROR!")\n    "nem rán bERROR! bề"\n',
    },
    {
      name: "replace/4",
      type: "function",
      specs: [
        "@spec replace(\n        t(),\n        pattern() | Regex.t(),\n        t() | (t() -> t() | iodata()),\n        keyword()\n      ) :: t()",
      ],
      documentation:
        'Returns a new string created by replacing occurrences of `pattern` in\n`subject` with `replacement`.\n\nThe `subject` is always a string.\n\nThe `pattern` may be a string, a list of strings, a regular expression, or a\ncompiled pattern.\n\nThe `replacement` may be a string or a function that receives the matched\npattern and must return the replacement as a string or iodata.\n\nBy default it replaces all occurrences but this behavior can be controlled\nthrough the `:global` option; see the "Options" section below.\n\n## Options\n\n  * `:global` - (boolean) if `true`, all occurrences of `pattern` are replaced\n    with `replacement`, otherwise only the first occurrence is\n    replaced. Defaults to `true`\n\n## Examples\n\n    iex> String.replace("a,b,c", ",", "-")\n    "a-b-c"\n\n    iex> String.replace("a,b,c", ",", "-", global: false)\n    "a-b,c"\n\nThe pattern may also be a list of strings and the replacement may also\nbe a function that receives the matches:\n\n    iex> String.replace("a,b,c", ["a", "c"], fn <<char>> -> <<char + 1>> end)\n    "b,b,d"\n\nWhen the pattern is a regular expression, one can give `\\N` or\n`\\g{N}` in the `replacement` string to access a specific capture in the\nregular expression:\n\n    iex> String.replace("a,b,c", ~r/,(.)/, ",\\\\1\\\\g{1}")\n    "a,bb,cc"\n\nNote that we had to escape the backslash escape character (i.e., we used `\\\\N`\ninstead of just `\\N` to escape the backslash; same thing for `\\\\g{N}`). By\ngiving `\\0`, one can inject the whole match in the replacement string.\n\nA compiled pattern can also be given:\n\n    iex> pattern = :binary.compile_pattern(",")\n    iex> String.replace("a,b,c", pattern, "[]")\n    "a[]b[]c"\n\nWhen an empty string is provided as a `pattern`, the function will treat it as\nan implicit empty string between each grapheme and the string will be\ninterspersed. If an empty string is provided as `replacement` the `subject`\nwill be returned:\n\n    iex> String.replace("ELIXIR", "", ".")\n    ".E.L.I.X.I.R."\n\n    iex> String.replace("ELIXIR", "", "")\n    "ELIXIR"\n\nBe aware that this function can replace within or across grapheme boundaries.\nFor example, take the grapheme "é" which is made of the characters\n"e" and the acute accent. The following will replace only the letter "e",\nmoving the accent to the letter "o":\n\n    iex> String.replace(String.normalize("é", :nfd), "e", "o")\n    "ó"\n\nHowever, if "é" is represented by the single character "e with acute"\naccent, then it won\'t be replaced at all:\n\n    iex> String.replace(String.normalize("é", :nfc), "e", "o")\n    "é"\n\n',
    },
    {
      name: "printable?/2",
      type: "function",
      specs: [
        "@spec printable?(t(), 0) :: true",
        "@spec printable?(t(), pos_integer() | :infinity) :: boolean()",
      ],
      documentation:
        'Checks if a string contains only printable characters up to `character_limit`.\n\nTakes an optional `character_limit` as a second argument. If `character_limit` is `0`, this\nfunction will return `true`.\n\n## Examples\n\n    iex> String.printable?("abc")\n    true\n\n    iex> String.printable?("abc" <> <<0>>)\n    false\n\n    iex> String.printable?("abc" <> <<0>>, 2)\n    true\n\n    iex> String.printable?("abc" <> <<0>>, 0)\n    true\n\n',
    },
    {
      name: "pad_trailing/3",
      type: "function",
      specs: ["@spec pad_trailing(t(), non_neg_integer(), t() | [t()]) :: t()"],
      documentation:
        'Returns a new string padded with a trailing filler\nwhich is made of elements from the `padding`.\n\nPassing a list of strings as `padding` will take one element of the list\nfor every missing entry. If the list is shorter than the number of inserts,\nthe filling will start again from the beginning of the list.\nPassing a string `padding` is equivalent to passing the list of graphemes in it.\nIf no `padding` is given, it defaults to whitespace.\n\nWhen `count` is less than or equal to the length of `string`,\ngiven `string` is returned.\n\nRaises `ArgumentError` if the given `padding` contains a non-string element.\n\n## Examples\n\n    iex> String.pad_trailing("abc", 5)\n    "abc  "\n\n    iex> String.pad_trailing("abc", 4, "12")\n    "abc1"\n\n    iex> String.pad_trailing("abc", 6, "12")\n    "abc121"\n\n    iex> String.pad_trailing("abc", 5, ["1", "23"])\n    "abc123"\n\n',
    },
    {
      name: "pad_leading/3",
      type: "function",
      specs: ["@spec pad_leading(t(), non_neg_integer(), t() | [t()]) :: t()"],
      documentation:
        'Returns a new string padded with a leading filler\nwhich is made of elements from the `padding`.\n\nPassing a list of strings as `padding` will take one element of the list\nfor every missing entry. If the list is shorter than the number of inserts,\nthe filling will start again from the beginning of the list.\nPassing a string `padding` is equivalent to passing the list of graphemes in it.\nIf no `padding` is given, it defaults to whitespace.\n\nWhen `count` is less than or equal to the length of `string`,\ngiven `string` is returned.\n\nRaises `ArgumentError` if the given `padding` contains a non-string element.\n\n## Examples\n\n    iex> String.pad_leading("abc", 5)\n    "  abc"\n\n    iex> String.pad_leading("abc", 4, "12")\n    "1abc"\n\n    iex> String.pad_leading("abc", 6, "12")\n    "121abc"\n\n    iex> String.pad_leading("abc", 5, ["1", "23"])\n    "123abc"\n\n',
    },
    {
      name: "normalize/2",
      type: "function",
      specs: ["@spec normalize(t(), :nfd | :nfc | :nfkd | :nfkc) :: t()"],
      documentation:
        'Converts all characters in `string` to Unicode normalization\nform identified by `form`.\n\nInvalid Unicode codepoints are skipped and the remaining of\nthe string is converted. If you want the algorithm to stop\nand return on invalid codepoint, use `:unicode.characters_to_nfd_binary/1`,\n`:unicode.characters_to_nfc_binary/1`, `:unicode.characters_to_nfkd_binary/1`,\nand `:unicode.characters_to_nfkc_binary/1` instead.\n\nNormalization forms `:nfkc` and `:nfkd` should not be blindly applied\nto arbitrary text. Because they erase many formatting distinctions,\nthey will prevent round-trip conversion to and from many legacy\ncharacter sets.\n\n## Forms\n\nThe supported forms are:\n\n  * `:nfd` - Normalization Form Canonical Decomposition.\n    Characters are decomposed by canonical equivalence, and\n    multiple combining characters are arranged in a specific\n    order.\n\n  * `:nfc` - Normalization Form Canonical Composition.\n    Characters are decomposed and then recomposed by canonical equivalence.\n\n  * `:nfkd` - Normalization Form Compatibility Decomposition.\n    Characters are decomposed by compatibility equivalence, and\n    multiple combining characters are arranged in a specific\n    order.\n\n  * `:nfkc` - Normalization Form Compatibility Composition.\n    Characters are decomposed and then recomposed by compatibility equivalence.\n\n## Examples\n\n    iex> String.normalize("yêṩ", :nfd)\n    "yêṩ"\n\n    iex> String.normalize("leña", :nfc)\n    "leña"\n\n    iex> String.normalize("ﬁ", :nfkd)\n    "fi"\n\n    iex> String.normalize("fi", :nfkc)\n    "fi"\n\n',
    },
    {
      name: "next_grapheme_size/1",
      type: "function",
      specs: ["@spec next_grapheme_size(t()) :: {pos_integer(), t()} | nil"],
      documentation:
        'Returns the size (in bytes) of the next grapheme.\n\nThe result is a tuple with the next grapheme size in bytes and\nthe remainder of the string or `nil` in case the string\nreached its end.\n\n## Examples\n\n    iex> String.next_grapheme_size("olá")\n    {1, "lá"}\n\n    iex> String.next_grapheme_size("")\n    nil\n\n',
    },
    {
      name: "next_grapheme/1",
      type: "function",
      specs: ["@spec next_grapheme(t()) :: {grapheme(), t()} | nil"],
      documentation:
        'Returns the next grapheme in a string.\n\nThe result is a tuple with the grapheme and the\nremainder of the string or `nil` in case\nthe String reached its end.\n\n## Examples\n\n    iex> String.next_grapheme("olá")\n    {"o", "lá"}\n\n    iex> String.next_grapheme("")\n    nil\n\n',
    },
    {
      name: "next_codepoint/1",
      type: "function",
      specs: ["@spec next_codepoint(t()) :: {codepoint(), t()} | nil"],
      documentation:
        'Returns the next code point in a string.\n\nThe result is a tuple with the code point and the\nremainder of the string or `nil` in case\nthe string reached its end.\n\nAs with other functions in the `String` module, `next_codepoint/1`\nworks with binaries that are invalid UTF-8. If the string starts\nwith a sequence of bytes that is not valid in UTF-8 encoding, the\nfirst element of the returned tuple is a binary with the first byte.\n\n## Examples\n\n    iex> String.next_codepoint("olá")\n    {"o", "lá"}\n\n    iex> invalid = "\\x80\\x80OK" # first two bytes are invalid in UTF-8\n    iex> {_, rest} = String.next_codepoint(invalid)\n    {<<128>>, <<128, 79, 75>>}\n    iex> String.next_codepoint(rest)\n    {<<128>>, "OK"}\n\n## Comparison with binary pattern matching\n\nBinary pattern matching provides a similar way to decompose\na string:\n\n    iex> <<codepoint::utf8, rest::binary>> = "Elixir"\n    "Elixir"\n    iex> codepoint\n    69\n    iex> rest\n    "lixir"\n\nthough not entirely equivalent because `codepoint` comes as\nan integer, and the pattern won\'t match invalid UTF-8.\n\nBinary pattern matching, however, is simpler and more efficient,\nso pick the option that better suits your use case.\n',
    },
    {
      name: "myers_difference/2",
      type: "function",
      specs: ["@spec myers_difference(t(), t()) :: [{:eq | :ins | :del, t()}]"],
      documentation:
        'Returns a keyword list that represents an edit script.\n\nCheck `List.myers_difference/2` for more information.\n\n## Examples\n\n    iex> string1 = "fox hops over the dog"\n    iex> string2 = "fox jumps over the lazy cat"\n    iex> String.myers_difference(string1, string2)\n    [eq: "fox ", del: "ho", ins: "jum", eq: "ps over the ", del: "dog", ins: "lazy cat"]\n\n',
    },
    {
      name: "match?/2",
      type: "function",
      specs: ["@spec match?(t(), Regex.t()) :: boolean()"],
      documentation:
        'Checks if `string` matches the given regular expression.\n\n## Examples\n\n    iex> String.match?("foo", ~r/foo/)\n    true\n\n    iex> String.match?("bar", ~r/foo/)\n    false\n\nElixir also provides text-based match operator `=~/2` and function `Regex.match?/2` as\nalternatives to test strings against regular expressions.\n',
    },
    {
      name: "length/1",
      type: "function",
      specs: ["@spec length(t()) :: non_neg_integer()"],
      documentation:
        'Returns the number of Unicode graphemes in a UTF-8 string.\n\n## Examples\n\n    iex> String.length("elixir")\n    6\n\n    iex> String.length("եոգլի")\n    5\n\n',
    },
    {
      name: "last/1",
      type: "function",
      specs: ["@spec last(t()) :: grapheme() | nil"],
      documentation:
        'Returns the last grapheme from a UTF-8 string,\n`nil` if the string is empty.\n\nIt traverses the whole string to find its last grapheme.\n\n## Examples\n\n    iex> String.last("")\n    nil\n\n    iex> String.last("elixir")\n    "r"\n\n    iex> String.last("եոգլի")\n    "ի"\n\n',
    },
    {
      name: "jaro_distance/2",
      type: "function",
      specs: ["@spec jaro_distance(t(), t()) :: float()"],
      documentation:
        'Computes the Jaro distance (similarity) between two strings.\n\nReturns a float value between `0.0` (equates to no similarity) and `1.0`\n(is an exact match) representing [Jaro](https://en.wikipedia.org/wiki/Jaro-Winkler_distance)\ndistance between `string1` and `string2`.\n\nThe Jaro distance metric is designed and best suited for short\nstrings such as person names. Elixir itself uses this function\nto provide the "did you mean?" functionality. For instance, when you\nare calling a function in a module and you have a typo in the\nfunction name, we attempt to suggest the most similar function\nname available, if any, based on the `jaro_distance/2` score.\n\n## Examples\n\n    iex> String.jaro_distance("Dwayne", "Duane")\n    0.8222222222222223\n    iex> String.jaro_distance("even", "odd")\n    0.0\n    iex> String.jaro_distance("same", "same")\n    1.0\n\n',
    },
    {
      name: "graphemes/1",
      type: "function",
      specs: ["@spec graphemes(t()) :: [grapheme()]"],
      documentation:
        'Returns Unicode graphemes in the string as per Extended Grapheme\nCluster algorithm.\n\nThe algorithm is outlined in the [Unicode Standard Annex #29,\nUnicode Text Segmentation](https://www.unicode.org/reports/tr29/).\n\nFor details about code points and graphemes, see the `String` module documentation.\n\n## Examples\n\n    iex> String.graphemes("Ńaïve")\n    ["Ń", "a", "ï", "v", "e"]\n\n    iex> String.graphemes("\\u00e9")\n    ["é"]\n\n    iex> String.graphemes("\\u0065\\u0301")\n    ["é"]\n\n',
    },
    {
      name: "first/1",
      type: "function",
      specs: ["@spec first(t()) :: grapheme() | nil"],
      documentation:
        'Returns the first grapheme from a UTF-8 string,\n`nil` if the string is empty.\n\n## Examples\n\n    iex> String.first("elixir")\n    "e"\n\n    iex> String.first("եոգլի")\n    "ե"\n\n    iex> String.first("")\n    nil\n\n',
    },
    {
      name: "equivalent?/2",
      type: "function",
      specs: ["@spec equivalent?(t(), t()) :: boolean()"],
      documentation:
        'Returns `true` if `string1` is canonically equivalent to `string2`.\n\nIt performs Normalization Form Canonical Decomposition (NFD) on the\nstrings before comparing them. This function is equivalent to:\n\n    String.normalize(string1, :nfd) == String.normalize(string2, :nfd)\n\nIf you plan to compare multiple strings, multiple times in a row, you\nmay normalize them upfront and compare them directly to avoid multiple\nnormalization passes.\n\n## Examples\n\n    iex> String.equivalent?("abc", "abc")\n    true\n\n    iex> String.equivalent?("man\\u0303ana", "mañana")\n    true\n\n    iex> String.equivalent?("abc", "ABC")\n    false\n\n    iex> String.equivalent?("nø", "nó")\n    false\n\n',
    },
    {
      name: "ends_with?/2",
      type: "function",
      specs: ["@spec ends_with?(t(), t() | [t()]) :: boolean()"],
      documentation:
        'Returns `true` if `string` ends with any of the suffixes given.\n\n`suffixes` can be either a single suffix or a list of suffixes.\n\n## Examples\n\n    iex> String.ends_with?("language", "age")\n    true\n    iex> String.ends_with?("language", ["youth", "age"])\n    true\n    iex> String.ends_with?("language", ["youth", "elixir"])\n    false\n\nAn empty suffix will always match:\n\n    iex> String.ends_with?("language", "")\n    true\n    iex> String.ends_with?("language", ["", "other"])\n    true\n\n',
    },
    {
      name: "duplicate/2",
      type: "function",
      specs: ["@spec duplicate(t(), non_neg_integer()) :: t()"],
      documentation:
        'Returns a string `subject` repeated `n` times.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> String.duplicate("abc", 0)\n    ""\n\n    iex> String.duplicate("abc", 1)\n    "abc"\n\n    iex> String.duplicate("abc", 2)\n    "abcabc"\n\n',
    },
    {
      name: "downcase/2",
      type: "function",
      specs: [
        "@spec downcase(t(), :default | :ascii | :greek | :turkic) :: t()",
      ],
      documentation:
        'Converts all characters in the given string to lowercase according to `mode`.\n\n`mode` may be `:default`, `:ascii`, `:greek` or `:turkic`. The `:default` mode considers\nall non-conditional transformations outlined in the Unicode standard. `:ascii`\nlowercases only the letters A to Z. `:greek` includes the context sensitive\nmappings found in Greek. `:turkic` properly handles the letter i with the dotless variant.\n\nAlso see `upcase/2` and `capitalize/2` for other conversions.\n\n## Examples\n\n    iex> String.downcase("ABCD")\n    "abcd"\n\n    iex> String.downcase("AB 123 XPTO")\n    "ab 123 xpto"\n\n    iex> String.downcase("OLÁ")\n    "olá"\n\nThe `:ascii` mode ignores Unicode characters and provides a more\nperformant implementation when you know the string contains only\nASCII characters:\n\n    iex> String.downcase("OLÁ", :ascii)\n    "olÁ"\n\nThe `:greek` mode properly handles the context sensitive sigma in Greek:\n\n    iex> String.downcase("ΣΣ")\n    "σσ"\n\n    iex> String.downcase("ΣΣ", :greek)\n    "σς"\n\nAnd `:turkic` properly handles the letter i with the dotless variant:\n\n    iex> String.downcase("Iİ")\n    "ii̇"\n\n    iex> String.downcase("Iİ", :turkic)\n    "ıi"\n\n',
    },
    {
      name: "contains?/2",
      type: "function",
      specs: ["@spec contains?(t(), [t()] | pattern()) :: boolean()"],
      documentation:
        'Searches if `string` contains any of the given `contents`.\n\n`contents` can be either a string, a list of strings,\nor a compiled pattern. If `contents` is a list, this\nfunction will search if any of the strings in `contents`\nare part of `string`.\n\n> #### Searching for a string in a list {: .tip}\n>\n> If you want to check if `string` is listed in `contents`,\n> where `contents` is a list, use `Enum.member?(contents, string)`\n> instead.\n\n## Examples\n\n    iex> String.contains?("elixir of life", "of")\n    true\n    iex> String.contains?("elixir of life", ["life", "death"])\n    true\n    iex> String.contains?("elixir of life", ["death", "mercury"])\n    false\n\nThe argument can also be a compiled pattern:\n\n    iex> pattern = :binary.compile_pattern(["life", "death"])\n    iex> String.contains?("elixir of life", pattern)\n    true\n\nAn empty string will always match:\n\n    iex> String.contains?("elixir of life", "")\n    true\n    iex> String.contains?("elixir of life", ["", "other"])\n    true\n\nAn empty list will never match:\n\n    iex> String.contains?("elixir of life", [])\n    false\n\n    iex> String.contains?("", [])\n    false\n\nBe aware that this function can match within or across grapheme boundaries.\nFor example, take the grapheme "é" which is made of the characters\n"e" and the acute accent. The following returns `true`:\n\n    iex> String.contains?(String.normalize("é", :nfd), "e")\n    true\n\nHowever, if "é" is represented by the single character "e with acute"\naccent, then it will return `false`:\n\n    iex> String.contains?(String.normalize("é", :nfc), "e")\n    false\n\n',
    },
    {
      name: "codepoints/1",
      type: "function",
      specs: ["@spec codepoints(t()) :: [codepoint()]"],
      documentation:
        'Returns a list of code points encoded as strings.\n\nTo retrieve code points in their natural integer\nrepresentation, see `to_charlist/1`. For details about\ncode points and graphemes, see the `String` module\ndocumentation.\n\n## Examples\n\n    iex> String.codepoints("olá")\n    ["o", "l", "á"]\n\n    iex> String.codepoints("оптими зации")\n    ["о", "п", "т", "и", "м", "и", " ", "з", "а", "ц", "и", "и"]\n\n    iex> String.codepoints("ἅἪῼ")\n    ["ἅ", "Ἢ", "ῼ"]\n\n    iex> String.codepoints("\\u00e9")\n    ["é"]\n\n    iex> String.codepoints("\\u0065\\u0301")\n    ["e", "́"]\n\n',
    },
    {
      name: "chunk/2",
      type: "function",
      specs: ["@spec chunk(t(), :valid | :printable) :: [t()]"],
      documentation:
        'Splits the string into chunks of characters that share a common trait.\n\nThe trait can be one of two options:\n\n  * `:valid` - the string is split into chunks of valid and invalid\n    character sequences\n\n  * `:printable` - the string is split into chunks of printable and\n    non-printable character sequences\n\nReturns a list of binaries each of which contains only one kind of\ncharacters.\n\nIf the given string is empty, an empty list is returned.\n\n## Examples\n\n    iex> String.chunk(<<?a, ?b, ?c, 0>>, :valid)\n    ["abc\\0"]\n\n    iex> String.chunk(<<?a, ?b, ?c, 0, 0xFFFF::utf16>>, :valid)\n    ["abc\\0", <<0xFFFF::utf16>>]\n\n    iex> String.chunk(<<?a, ?b, ?c, 0, 0x0FFFF::utf8>>, :printable)\n    ["abc", <<0, 0x0FFFF::utf8>>]\n\n',
    },
    {
      name: "capitalize/2",
      type: "function",
      specs: [
        "@spec capitalize(t(), :default | :ascii | :greek | :turkic) :: t()",
      ],
      documentation:
        'Converts the first character in the given string to\nuppercase and the remainder to lowercase according to `mode`.\n\n`mode` may be `:default`, `:ascii`, `:greek` or `:turkic`. The `:default` mode\nconsiders all non-conditional transformations outlined in the Unicode standard.\n`:ascii` capitalizes only the letters A to Z. `:greek` includes the context\nsensitive mappings found in Greek. `:turkic` properly handles the letter `i`\nwith the dotless variant.\n\nAlso see `upcase/2` and `capitalize/2` for other conversions. If you want\na variation of this function that does not lowercase the rest of string,\nsee Erlang\'s `:string.titlecase/1`.\n\n## Examples\n\n    iex> String.capitalize("abcd")\n    "Abcd"\n    iex> String.capitalize("ABCD")\n    "Abcd"\n\n    iex> String.capitalize("ﬁn")\n    "Fin"\n    iex> String.capitalize("olá")\n    "Olá"\n\n',
    },
    {
      name: "byte_slice/3",
      type: "function",
      specs: ["@spec byte_slice(t(), integer(), non_neg_integer()) :: t()"],
      documentation:
        'Returns a substring starting at (or after) `start_bytes` and of at most\nthe given `size_bytes`.\n\nThis function works on bytes and then adjusts the string to eliminate\ntruncated codepoints. This is useful when you have a string and you need\nto guarantee it does not exceed a certain amount of bytes.\n\nIf the offset is greater than the number of bytes in the string, then it\nreturns `""`. Similar to `String.slice/2`, a negative `start_bytes`\nwill be adjusted to the end of the string (but in bytes).\n\nThis function does not guarantee the string won\'t have invalid codepoints,\nit only guarantees to remove truncated codepoints immediately at the beginning\nor the end of the slice.\n\n## Examples\n\nConsider the string "héllo". Let\'s see its representation:\n\n    iex> inspect("héllo", binaries: :as_binaries)\n    "<<104, 195, 169, 108, 108, 111>>"\n\nAlthough the string has 5 characters, it is made of 6 bytes. Now imagine\nwe want to get only the first two bytes. To do so, let\'s use `binary_slice/3`,\nwhich is unaware of codepoints:\n\n    iex> binary_slice("héllo", 0, 2)\n    <<104, 195>>\n\nAs you can see, this operation is unsafe and returns an invalid string.\nThat\'s because we cut the string in the middle of the bytes representing\n"é". On the other hand, we could use `String.slice/3`:\n\n    iex> String.slice("héllo", 0, 2)\n    "hé"\n\nWhile the above is correct, it has 3 bytes. If you have a requirement where\nyou need *at most* 2 bytes, the result would also be invalid. In such scenarios,\nyou can use this function, which will slice the given bytes, but clean up\nthe truncated codepoints:\n\n    iex> String.byte_slice("héllo", 0, 2)\n    "h"\n\nTruncated codepoints at the beginning are also cleaned up:\n\n    iex> String.byte_slice("héllo", 2, 3)\n    "llo"\n\nNote that, if you want to work on raw bytes, then you must use `binary_slice/3`\ninstead.\n',
    },
    {
      name: "bag_distance/2",
      type: "function",
      specs: ["@spec bag_distance(t(), t()) :: float()"],
      documentation:
        'Computes the bag distance between two strings.\n\nReturns a float value between 0 and 1 representing the bag\ndistance between `string1` and `string2`.\n\nThe bag distance is meant to be an efficient approximation\nof the distance between two strings to quickly rule out strings\nthat are largely different.\n\nThe algorithm is outlined in the "String Matching with Metric\nTrees Using an Approximate Distance" paper by Ilaria Bartolini,\nPaolo Ciaccia, and Marco Patella.\n\n## Examples\n\n    iex> String.bag_distance("abc", "")\n    0.0\n    iex> String.bag_distance("abcd", "a")\n    0.25\n    iex> String.bag_distance("abcd", "ab")\n    0.5\n    iex> String.bag_distance("abcd", "abc")\n    0.75\n    iex> String.bag_distance("abcd", "abcd")\n    1.0\n\n',
    },
    {
      name: "at/2",
      type: "function",
      specs: ["@spec at(t(), integer()) :: grapheme() | nil"],
      documentation:
        'Returns the grapheme at the `position` of the given UTF-8 `string`.\nIf `position` is greater than `string` length, then it returns `nil`.\n\n## Examples\n\n    iex> String.at("elixir", 0)\n    "e"\n\n    iex> String.at("elixir", 1)\n    "l"\n\n    iex> String.at("elixir", 10)\n    nil\n\n    iex> String.at("elixir", -1)\n    "r"\n\n    iex> String.at("elixir", -10)\n    nil\n\n',
    },
  ],
  name: "String",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "pattern/0",
      type: "type",
      specs: [
        "@type pattern() ::\n        t() | [nonempty_binary()] | (compiled_search_pattern :: :binary.cp())",
      ],
      documentation:
        "Pattern used in functions like `replace/4` and `split/3`.\n\nIt must be one of:\n\n  * a string\n  * an empty list\n  * a list containing non-empty strings\n  * a compiled search pattern created by `:binary.compile_pattern/1`\n\n",
    },
    {
      name: "grapheme/0",
      type: "type",
      specs: ["@type grapheme() :: t()"],
      documentation:
        "Multiple code points that may be perceived as a single character by readers",
    },
    {
      name: "codepoint/0",
      type: "type",
      specs: ["@type codepoint() :: t()"],
      documentation:
        "A single Unicode code point encoded in UTF-8. It may be one or more bytes.",
    },
    {
      name: "t/0",
      type: "type",
      specs: ["@type t() :: binary()"],
      documentation:
        "A UTF-8 encoded binary.\n\nThe types `String.t()` and `binary()` are equivalent to analysis tools.\nAlthough, for those reading the documentation, `String.t()` implies\nit is a UTF-8 encoded binary.\n",
    },
  ],
};
