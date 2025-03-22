import type { ModuleDoc } from "../types";

export const Float: ModuleDoc = {
  functions: [
    {
      name: "to_string/1",
      type: "function",
      specs: ["@spec to_string(float()) :: String.t()"],
      documentation:
        'Returns a binary which corresponds to the shortest text representation\nof the given float.\n\nThe underlying algorithm changes depending on the Erlang/OTP version:\n\n  * For OTP >= 24, it uses the algorithm presented in "Ryū: fast\n    float-to-string conversion" in Proceedings of the SIGPLAN \'2018\n    Conference on Programming Language Design and Implementation.\n\n  * For OTP < 24, it uses the algorithm presented in "Printing Floating-Point\n    Numbers Quickly and Accurately" in Proceedings of the SIGPLAN \'1996\n    Conference on Programming Language Design and Implementation.\n\nFor a configurable representation, use `:erlang.float_to_binary/2`.\n\n## Examples\n\n    iex> Float.to_string(7.0)\n    "7.0"\n\n',
    },
    {
      name: "to_charlist/1",
      type: "function",
      specs: ["@spec to_charlist(float()) :: charlist()"],
      documentation:
        'Returns a charlist which corresponds to the shortest text representation\nof the given float.\n\nThe underlying algorithm changes depending on the Erlang/OTP version:\n\n  * For OTP >= 24, it uses the algorithm presented in "Ryū: fast\n    float-to-string conversion" in Proceedings of the SIGPLAN \'2018\n    Conference on Programming Language Design and Implementation.\n\n  * For OTP < 24, it uses the algorithm presented in "Printing Floating-Point\n    Numbers Quickly and Accurately" in Proceedings of the SIGPLAN \'1996\n    Conference on Programming Language Design and Implementation.\n\nFor a configurable representation, use `:erlang.float_to_list/2`.\n\n## Examples\n\n    iex> Float.to_charlist(7.0)\n    ~c"7.0"\n\n',
    },
    {
      name: "round/2",
      type: "function",
      specs: ["@spec round(float(), precision_range()) :: float()"],
      documentation:
        'Rounds a floating-point value to an arbitrary number of fractional\ndigits (between 0 and 15).\n\nThe rounding direction always ties to half up. The operation is\nperformed on the binary floating point, without a conversion to decimal.\n\nThis function only accepts floats and always returns a float. Use\n`Kernel.round/1` if you want a function that accepts both floats\nand integers and always returns an integer.\n\n## Known issues\n\nThe behavior of `round/2` for floats can be surprising. For example:\n\n    iex> Float.round(5.5675, 3)\n    5.567\n\nOne may have expected it to round to the half up 5.568. This is not a bug.\nMost decimal fractions cannot be represented as a binary floating point\nand therefore the number above is internally represented as 5.567499999,\nwhich explains the behavior above. If you want exact rounding for decimals,\nyou must use a decimal library. The behavior above is also in accordance\nto reference implementations, such as "Correctly Rounded Binary-Decimal and\nDecimal-Binary Conversions" by David M. Gay.\n\n## Examples\n\n    iex> Float.round(12.5)\n    13.0\n    iex> Float.round(5.5674, 3)\n    5.567\n    iex> Float.round(5.5675, 3)\n    5.567\n    iex> Float.round(-5.5674, 3)\n    -5.567\n    iex> Float.round(-5.5675)\n    -6.0\n    iex> Float.round(12.341444444444441, 15)\n    12.341444444444441\n    iex> Float.round(-0.01)\n    -0.0\n\n',
    },
    {
      name: "ratio/1",
      type: "function",
      specs: ["@spec ratio(float()) :: {integer(), pos_integer()}"],
      documentation:
        "Returns a pair of integers whose ratio is exactly equal\nto the original float and with a positive denominator.\n\n## Examples\n\n    iex> Float.ratio(0.0)\n    {0, 1}\n    iex> Float.ratio(3.14)\n    {7070651414971679, 2251799813685248}\n    iex> Float.ratio(-3.14)\n    {-7070651414971679, 2251799813685248}\n    iex> Float.ratio(1.5)\n    {3, 2}\n    iex> Float.ratio(-1.5)\n    {-3, 2}\n    iex> Float.ratio(16.0)\n    {16, 1}\n    iex> Float.ratio(-16.0)\n    {-16, 1}\n\n",
    },
    {
      name: "pow/2",
      type: "function",
      specs: ["@spec pow(float(), number()) :: float()"],
      documentation:
        "Computes `base` raised to power of `exponent`.\n\n`base` must be a float and `exponent` can be any number.\nHowever, if a negative base and a fractional exponent\nare given, it raises `ArithmeticError`.\n\nIt always returns a float. See `Integer.pow/2` for\nexponentiation that returns integers.\n\n## Examples\n\n    iex> Float.pow(2.0, 0)\n    1.0\n    iex> Float.pow(2.0, 1)\n    2.0\n    iex> Float.pow(2.0, 10)\n    1024.0\n    iex> Float.pow(2.0, -1)\n    0.5\n    iex> Float.pow(2.0, -3)\n    0.125\n\n    iex> Float.pow(3.0, 1.5)\n    5.196152422706632\n\n    iex> Float.pow(-2.0, 3)\n    -8.0\n    iex> Float.pow(-2.0, 4)\n    16.0\n\n    iex> Float.pow(-1.0, 0.5)\n    ** (ArithmeticError) bad argument in arithmetic expression\n\n",
    },
    {
      name: "parse/1",
      type: "function",
      specs: ["@spec parse(binary()) :: {float(), binary()} | :error"],
      documentation:
        'Parses a binary into a float.\n\nIf successful, returns a tuple in the form of `{float, remainder_of_binary}`;\nwhen the binary cannot be coerced into a valid float, the atom `:error` is\nreturned.\n\nIf the size of float exceeds the maximum size of `1.7976931348623157e+308`,\n`:error` is returned even though the textual representation itself might be\nwell formed.\n\nIf you want to convert a string-formatted float directly to a float,\n`String.to_float/1` can be used instead.\n\n## Examples\n\n    iex> Float.parse("34")\n    {34.0, ""}\n    iex> Float.parse("34.25")\n    {34.25, ""}\n    iex> Float.parse("56.5xyz")\n    {56.5, "xyz"}\n\n    iex> Float.parse("pi")\n    :error\n    iex> Float.parse("1.7976931348623159e+308")\n    :error\n\n',
    },
    {
      name: "min_finite/0",
      type: "function",
      specs: ["@spec min_finite() :: float()"],
      documentation:
        "Returns the minimum finite value for a float.\n\n## Examples\n\n    iex> Float.min_finite()\n    -1.7976931348623157e308\n\n",
    },
    {
      name: "max_finite/0",
      type: "function",
      specs: ["@spec max_finite() :: float()"],
      documentation:
        "Returns the maximum finite value for a float.\n\n## Examples\n\n    iex> Float.max_finite()\n    1.7976931348623157e308\n\n",
    },
    {
      name: "floor/2",
      type: "function",
      specs: ["@spec floor(float(), precision_range()) :: float()"],
      documentation:
        "Rounds a float to the largest float less than or equal to `number`.\n\n`floor/2` also accepts a precision to round a floating-point value down\nto an arbitrary number of fractional digits (between 0 and 15).\nThe operation is performed on the binary floating point, without a\nconversion to decimal.\n\nThis function always returns a float. `Kernel.trunc/1` may be used instead to\ntruncate the result to an integer afterwards.\n\n## Known issues\n\nThe behavior of `floor/2` for floats can be surprising. For example:\n\n    iex> Float.floor(12.52, 2)\n    12.51\n\nOne may have expected it to floor to 12.52. This is not a bug.\nMost decimal fractions cannot be represented as a binary floating point\nand therefore the number above is internally represented as 12.51999999,\nwhich explains the behavior above.\n\n## Examples\n\n    iex> Float.floor(34.25)\n    34.0\n    iex> Float.floor(-56.5)\n    -57.0\n    iex> Float.floor(34.259, 2)\n    34.25\n\n",
    },
    {
      name: "ceil/2",
      type: "function",
      specs: ["@spec ceil(float(), precision_range()) :: float()"],
      documentation:
        "Rounds a float to the smallest float greater than or equal to `number`.\n\n`ceil/2` also accepts a precision to round a floating-point value down\nto an arbitrary number of fractional digits (between 0 and 15).\n\nThe operation is performed on the binary floating point, without a\nconversion to decimal.\n\nThe behavior of `ceil/2` for floats can be surprising. For example:\n\n    iex> Float.ceil(-12.52, 2)\n    -12.51\n\nOne may have expected it to ceil to -12.52. This is not a bug.\nMost decimal fractions cannot be represented as a binary floating point\nand therefore the number above is internally represented as -12.51999999,\nwhich explains the behavior above.\n\nThis function always returns floats. `Kernel.trunc/1` may be used instead to\ntruncate the result to an integer afterwards.\n\n## Examples\n\n    iex> Float.ceil(34.25)\n    35.0\n    iex> Float.ceil(-56.5)\n    -56.0\n    iex> Float.ceil(34.251, 2)\n    34.26\n    iex> Float.ceil(-0.01)\n    -0.0\n\n",
    },
  ],
  name: "Float",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "precision_range/0",
      type: "type",
      specs: ["@type precision_range() :: 0..15"],
      documentation: null,
    },
  ],
};
