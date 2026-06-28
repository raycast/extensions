import type { ModuleDoc } from "../types";

export const Base: ModuleDoc = {
  functions: [
    {
      name: "url_encode64/2",
      type: "function",
      specs: [
        "@spec url_encode64(binary(), [{:padding, boolean()}]) :: binary()",
      ],
      documentation:
        'Encodes a binary string into a base 64 encoded string with URL and filename\nsafe alphabet.\n\nAccepts `padding: false` option which will omit padding from\nthe output string.\n\n## Examples\n\n    iex> Base.url_encode64(<<255, 127, 254, 252>>)\n    "_3_-_A=="\n\n    iex> Base.url_encode64(<<255, 127, 254, 252>>, padding: false)\n    "_3_-_A"\n\n',
    },
    {
      name: "url_decode64!/2",
      type: "function",
      specs: [
        "@spec url_decode64!(binary(), ignore: :whitespace, padding: boolean()) ::\n        binary()",
      ],
      documentation:
        'Decodes a base 64 encoded string with URL and filename safe alphabet\ninto a binary string.\n\nAccepts `ignore: :whitespace` option which will ignore all the\nwhitespace characters in the input string.\n\nAccepts `padding: false` option which will ignore padding from\nthe input string.\n\nAn `ArgumentError` exception is raised if the padding is incorrect or\na non-alphabet character is present in the string.\n\n## Examples\n\n    iex> Base.url_decode64!("_3_-_A==")\n    <<255, 127, 254, 252>>\n\n    iex> Base.url_decode64!("_3_-_A==\\n", ignore: :whitespace)\n    <<255, 127, 254, 252>>\n\n    iex> Base.url_decode64!("_3_-_A", padding: false)\n    <<255, 127, 254, 252>>\n\n',
    },
    {
      name: "url_decode64/2",
      type: "function",
      specs: [
        "@spec url_decode64(binary(), ignore: :whitespace, padding: boolean()) ::\n        {:ok, binary()} | :error",
      ],
      documentation:
        'Decodes a base 64 encoded string with URL and filename safe alphabet\ninto a binary string.\n\nAccepts `ignore: :whitespace` option which will ignore all the\nwhitespace characters in the input string.\n\nAccepts `padding: false` option which will ignore padding from\nthe input string.\n\n## Examples\n\n    iex> Base.url_decode64("_3_-_A==")\n    {:ok, <<255, 127, 254, 252>>}\n\n    iex> Base.url_decode64("_3_-_A==\\n", ignore: :whitespace)\n    {:ok, <<255, 127, 254, 252>>}\n\n    iex> Base.url_decode64("_3_-_A", padding: false)\n    {:ok, <<255, 127, 254, 252>>}\n\n',
    },
    {
      name: "hex_encode32/2",
      type: "function",
      specs: [
        "@spec hex_encode32(binary(), case: encode_case(), padding: boolean()) ::\n        binary()",
      ],
      documentation:
        'Encodes a binary string into a base 32 encoded string with an\nextended hexadecimal alphabet.\n\n## Options\n\nThe accepted options are:\n\n  * `:case` - specifies the character case to use when encoding\n  * `:padding` - specifies whether to apply padding\n\nThe values for `:case` can be:\n\n  * `:upper` - uses upper case characters (default)\n  * `:lower` - uses lower case characters\n\nThe values for `:padding` can be:\n\n  * `true` - pad the output string to the nearest multiple of 8 (default)\n  * `false` - omit padding from the output string\n\n## Examples\n\n    iex> Base.hex_encode32("foobar")\n    "CPNMUOJ1E8======"\n\n    iex> Base.hex_encode32("foobar", case: :lower)\n    "cpnmuoj1e8======"\n\n    iex> Base.hex_encode32("foobar", padding: false)\n    "CPNMUOJ1E8"\n\n',
    },
    {
      name: "hex_decode32!/2",
      type: "function",
      specs: [
        "@spec hex_decode32!(binary(), case: decode_case(), padding: boolean()) ::\n        binary()",
      ],
      documentation:
        'Decodes a base 32 encoded string with extended hexadecimal alphabet\ninto a binary string.\n\nAn `ArgumentError` exception is raised if the padding is incorrect or\na non-alphabet character is present in the string.\n\n## Options\n\nThe accepted options are:\n\n  * `:case` - specifies the character case to accept when decoding\n  * `:padding` - specifies whether to require padding\n\nThe values for `:case` can be:\n\n  * `:upper` - only allows upper case characters (default)\n  * `:lower` - only allows lower case characters\n  * `:mixed` - allows mixed case characters\n\nThe values for `:padding` can be:\n\n  * `true` - requires the input string to be padded to the nearest multiple of 8 (default)\n  * `false` - ignores padding from the input string\n\n## Examples\n\n    iex> Base.hex_decode32!("CPNMUOJ1E8======")\n    "foobar"\n\n    iex> Base.hex_decode32!("cpnmuoj1e8======", case: :lower)\n    "foobar"\n\n    iex> Base.hex_decode32!("cpnMuOJ1E8======", case: :mixed)\n    "foobar"\n\n    iex> Base.hex_decode32!("CPNMUOJ1E8", padding: false)\n    "foobar"\n\n',
    },
    {
      name: "hex_decode32/2",
      type: "function",
      specs: [
        "@spec hex_decode32(binary(), case: decode_case(), padding: boolean()) ::\n        {:ok, binary()} | :error",
      ],
      documentation:
        'Decodes a base 32 encoded string with extended hexadecimal alphabet\ninto a binary string.\n\n## Options\n\nThe accepted options are:\n\n  * `:case` - specifies the character case to accept when decoding\n  * `:padding` - specifies whether to require padding\n\nThe values for `:case` can be:\n\n  * `:upper` - only allows upper case characters (default)\n  * `:lower` - only allows lower case characters\n  * `:mixed` - allows mixed case characters\n\nThe values for `:padding` can be:\n\n  * `true` - requires the input string to be padded to the nearest multiple of 8 (default)\n  * `false` - ignores padding from the input string\n\n## Examples\n\n    iex> Base.hex_decode32("CPNMUOJ1E8======")\n    {:ok, "foobar"}\n\n    iex> Base.hex_decode32("cpnmuoj1e8======", case: :lower)\n    {:ok, "foobar"}\n\n    iex> Base.hex_decode32("cpnMuOJ1E8======", case: :mixed)\n    {:ok, "foobar"}\n\n    iex> Base.hex_decode32("CPNMUOJ1E8", padding: false)\n    {:ok, "foobar"}\n\n',
    },
    {
      name: "encode64/2",
      type: "function",
      specs: ["@spec encode64(binary(), [{:padding, boolean()}]) :: binary()"],
      documentation:
        'Encodes a binary string into a base 64 encoded string.\n\nAccepts `padding: false` option which will omit padding from\nthe output string.\n\n## Examples\n\n    iex> Base.encode64("foobar")\n    "Zm9vYmFy"\n\n    iex> Base.encode64("foob")\n    "Zm9vYg=="\n\n    iex> Base.encode64("foob", padding: false)\n    "Zm9vYg"\n\n',
    },
    {
      name: "encode32/2",
      type: "function",
      specs: [
        "@spec encode32(binary(), case: encode_case(), padding: boolean()) :: binary()",
      ],
      documentation:
        'Encodes a binary string into a base 32 encoded string.\n\n## Options\n\nThe accepted options are:\n\n  * `:case` - specifies the character case to use when encoding\n  * `:padding` - specifies whether to apply padding\n\nThe values for `:case` can be:\n\n  * `:upper` - uses upper case characters (default)\n  * `:lower` - uses lower case characters\n\nThe values for `:padding` can be:\n\n  * `true` - pad the output string to the nearest multiple of 8 (default)\n  * `false` - omit padding from the output string\n\n## Examples\n\n    iex> Base.encode32("foobar")\n    "MZXW6YTBOI======"\n\n    iex> Base.encode32("foobar", case: :lower)\n    "mzxw6ytboi======"\n\n    iex> Base.encode32("foobar", padding: false)\n    "MZXW6YTBOI"\n\n',
    },
    {
      name: "encode16/2",
      type: "function",
      specs: ["@spec encode16(binary(), [{:case, encode_case()}]) :: binary()"],
      documentation:
        'Encodes a binary string into a base 16 encoded string.\n\n## Options\n\nThe accepted options are:\n\n  * `:case` - specifies the character case to use when encoding\n\nThe values for `:case` can be:\n\n  * `:upper` - uses upper case characters (default)\n  * `:lower` - uses lower case characters\n\n## Examples\n\n    iex> Base.encode16("foobar")\n    "666F6F626172"\n\n    iex> Base.encode16("foobar", case: :lower)\n    "666f6f626172"\n\n',
    },
    {
      name: "decode64!/2",
      type: "function",
      specs: [
        "@spec decode64!(binary(), ignore: :whitespace, padding: boolean()) :: binary()",
      ],
      documentation:
        'Decodes a base 64 encoded string into a binary string.\n\nAccepts `ignore: :whitespace` option which will ignore all the\nwhitespace characters in the input string.\n\nAccepts `padding: false` option which will ignore padding from\nthe input string.\n\nAn `ArgumentError` exception is raised if the padding is incorrect or\na non-alphabet character is present in the string.\n\n## Examples\n\n    iex> Base.decode64!("Zm9vYmFy")\n    "foobar"\n\n    iex> Base.decode64!("Zm9vYmFy\\n", ignore: :whitespace)\n    "foobar"\n\n    iex> Base.decode64!("Zm9vYg==")\n    "foob"\n\n    iex> Base.decode64!("Zm9vYg", padding: false)\n    "foob"\n\n',
    },
    {
      name: "decode64/2",
      type: "function",
      specs: [
        "@spec decode64(binary(), ignore: :whitespace, padding: boolean()) ::\n        {:ok, binary()} | :error",
      ],
      documentation:
        'Decodes a base 64 encoded string into a binary string.\n\nAccepts `ignore: :whitespace` option which will ignore all the\nwhitespace characters in the input string.\n\nAccepts `padding: false` option which will ignore padding from\nthe input string.\n\n## Examples\n\n    iex> Base.decode64("Zm9vYmFy")\n    {:ok, "foobar"}\n\n    iex> Base.decode64("Zm9vYmFy\\n", ignore: :whitespace)\n    {:ok, "foobar"}\n\n    iex> Base.decode64("Zm9vYg==")\n    {:ok, "foob"}\n\n    iex> Base.decode64("Zm9vYg", padding: false)\n    {:ok, "foob"}\n\n',
    },
    {
      name: "decode32!/2",
      type: "function",
      specs: [
        "@spec decode32!(binary(), case: decode_case(), padding: boolean()) :: binary()",
      ],
      documentation:
        'Decodes a base 32 encoded string into a binary string.\n\nAn `ArgumentError` exception is raised if the padding is incorrect or\na non-alphabet character is present in the string.\n\n## Options\n\nThe accepted options are:\n\n  * `:case` - specifies the character case to accept when decoding\n  * `:padding` - specifies whether to require padding\n\nThe values for `:case` can be:\n\n  * `:upper` - only allows upper case characters (default)\n  * `:lower` - only allows lower case characters\n  * `:mixed` - allows mixed case characters\n\nThe values for `:padding` can be:\n\n  * `true` - requires the input string to be padded to the nearest multiple of 8 (default)\n  * `false` - ignores padding from the input string\n\n## Examples\n\n    iex> Base.decode32!("MZXW6YTBOI======")\n    "foobar"\n\n    iex> Base.decode32!("mzxw6ytboi======", case: :lower)\n    "foobar"\n\n    iex> Base.decode32!("mzXW6ytBOi======", case: :mixed)\n    "foobar"\n\n    iex> Base.decode32!("MZXW6YTBOI", padding: false)\n    "foobar"\n\n',
    },
    {
      name: "decode32/2",
      type: "function",
      specs: [
        "@spec decode32(binary(), case: decode_case(), padding: boolean()) ::\n        {:ok, binary()} | :error",
      ],
      documentation:
        'Decodes a base 32 encoded string into a binary string.\n\n## Options\n\nThe accepted options are:\n\n  * `:case` - specifies the character case to accept when decoding\n  * `:padding` - specifies whether to require padding\n\nThe values for `:case` can be:\n\n  * `:upper` - only allows  upper case characters (default)\n  * `:lower` - only allows lower case characters\n  * `:mixed` - allows mixed case characters\n\nThe values for `:padding` can be:\n\n  * `true` - requires the input string to be padded to the nearest multiple of 8 (default)\n  * `false` - ignores padding from the input string\n\n## Examples\n\n    iex> Base.decode32("MZXW6YTBOI======")\n    {:ok, "foobar"}\n\n    iex> Base.decode32("mzxw6ytboi======", case: :lower)\n    {:ok, "foobar"}\n\n    iex> Base.decode32("mzXW6ytBOi======", case: :mixed)\n    {:ok, "foobar"}\n\n    iex> Base.decode32("MZXW6YTBOI", padding: false)\n    {:ok, "foobar"}\n\n',
    },
    {
      name: "decode16!/2",
      type: "function",
      specs: [
        "@spec decode16!(binary(), [{:case, decode_case()}]) :: binary()",
      ],
      documentation:
        'Decodes a base 16 encoded string into a binary string.\n\n## Options\n\nThe accepted options are:\n\n  * `:case` - specifies the character case to accept when decoding\n\nThe values for `:case` can be:\n\n  * `:upper` - only allows upper case characters (default)\n  * `:lower` - only allows lower case characters\n  * `:mixed` - allows mixed case characters\n\nAn `ArgumentError` exception is raised if the padding is incorrect or\na non-alphabet character is present in the string.\n\n## Examples\n\n    iex> Base.decode16!("666F6F626172")\n    "foobar"\n\n    iex> Base.decode16!("666f6f626172", case: :lower)\n    "foobar"\n\n    iex> Base.decode16!("666f6F626172", case: :mixed)\n    "foobar"\n\n',
    },
    {
      name: "decode16/2",
      type: "function",
      specs: [
        "@spec decode16(binary(), [{:case, decode_case()}]) :: {:ok, binary()} | :error",
      ],
      documentation:
        'Decodes a base 16 encoded string into a binary string.\n\n## Options\n\nThe accepted options are:\n\n  * `:case` - specifies the character case to accept when decoding\n\nThe values for `:case` can be:\n\n  * `:upper` - only allows upper case characters (default)\n  * `:lower` - only allows lower case characters\n  * `:mixed` - allows mixed case characters\n\n## Examples\n\n    iex> Base.decode16("666F6F626172")\n    {:ok, "foobar"}\n\n    iex> Base.decode16("666f6f626172", case: :lower)\n    {:ok, "foobar"}\n\n    iex> Base.decode16("666f6F626172", case: :mixed)\n    {:ok, "foobar"}\n\n',
    },
  ],
  name: "Base",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "decode_case/0",
      type: "type",
      specs: ["@type decode_case() :: :upper | :lower | :mixed"],
      documentation: null,
    },
    {
      name: "encode_case/0",
      type: "type",
      specs: ["@type encode_case() :: :upper | :lower"],
      documentation: null,
    },
  ],
};
