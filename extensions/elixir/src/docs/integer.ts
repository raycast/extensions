import type { ModuleDoc } from "../types";

export const Integer: ModuleDoc = {
  functions: [
    {
      name: "undigits/2",
      type: "function",
      specs: ["@spec undigits([integer()], pos_integer()) :: integer()"],
      documentation:
        "Returns the integer represented by the ordered `digits`.\n\nAn optional `base` value may be provided representing the radix for the `digits`.\nBase has to be an integer greater than or equal to `2`.\n\n## Examples\n\n    iex> Integer.undigits([1, 2, 3])\n    123\n\n    iex> Integer.undigits([1, 4], 16)\n    20\n\n    iex> Integer.undigits([])\n    0\n\n",
    },
    {
      name: "to_string/2",
      type: "function",
      specs: ["@spec to_string(integer(), 2..36) :: String.t()"],
      documentation:
        'Returns a binary which corresponds to the text representation\nof `integer` in the given `base`.\n\n`base` can be an integer between 2 and 36. If no `base` is given,\nit defaults to `10`.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> Integer.to_string(123)\n    "123"\n\n    iex> Integer.to_string(+456)\n    "456"\n\n    iex> Integer.to_string(-789)\n    "-789"\n\n    iex> Integer.to_string(0123)\n    "123"\n\n    iex> Integer.to_string(100, 16)\n    "64"\n\n    iex> Integer.to_string(-100, 16)\n    "-64"\n\n    iex> Integer.to_string(882_681_651, 36)\n    "ELIXIR"\n\n',
    },
    {
      name: "to_charlist/2",
      type: "function",
      specs: ["@spec to_charlist(integer(), 2..36) :: charlist()"],
      documentation:
        'Returns a charlist which corresponds to the text representation\nof `integer` in the given `base`.\n\n`base` can be an integer between 2 and 36. If no `base` is given,\nit defaults to `10`.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> Integer.to_charlist(123)\n    ~c"123"\n\n    iex> Integer.to_charlist(+456)\n    ~c"456"\n\n    iex> Integer.to_charlist(-789)\n    ~c"-789"\n\n    iex> Integer.to_charlist(0123)\n    ~c"123"\n\n    iex> Integer.to_charlist(100, 16)\n    ~c"64"\n\n    iex> Integer.to_charlist(-100, 16)\n    ~c"-64"\n\n    iex> Integer.to_charlist(882_681_651, 36)\n    ~c"ELIXIR"\n\n',
    },
    {
      name: "pow/2",
      type: "function",
      specs: ["@spec pow(integer(), non_neg_integer()) :: integer()"],
      documentation:
        "Computes `base` raised to power of `exponent`.\n\nBoth `base` and `exponent` must be integers.\nThe exponent must be zero or positive.\n\nSee `Float.pow/2` for exponentiation of negative\nexponents as well as floats.\n\n## Examples\n\n    iex> Integer.pow(2, 0)\n    1\n    iex> Integer.pow(2, 1)\n    2\n    iex> Integer.pow(2, 10)\n    1024\n    iex> Integer.pow(2, 11)\n    2048\n    iex> Integer.pow(2, 64)\n    0x10000000000000000\n\n    iex> Integer.pow(3, 4)\n    81\n    iex> Integer.pow(4, 3)\n    64\n\n    iex> Integer.pow(-2, 3)\n    -8\n    iex> Integer.pow(-2, 4)\n    16\n\n    iex> Integer.pow(2, -2)\n    ** (ArithmeticError) bad argument in arithmetic expression\n\n",
    },
    {
      name: "parse/2",
      type: "function",
      specs: [
        "@spec parse(binary(), 2..36) ::\n        {integer(), remainder_of_binary :: binary()} | :error",
      ],
      documentation:
        'Parses a text representation of an integer.\n\nAn optional `base` to the corresponding integer can be provided.\nIf `base` is not given, 10 will be used.\n\nIf successful, returns a tuple in the form of `{integer, remainder_of_binary}`.\nOtherwise `:error`.\n\nRaises an error if `base` is less than 2 or more than 36.\n\nIf you want to convert a string-formatted integer directly to an integer,\n`String.to_integer/1` or `String.to_integer/2` can be used instead.\n\n## Examples\n\n    iex> Integer.parse("34")\n    {34, ""}\n\n    iex> Integer.parse("34.5")\n    {34, ".5"}\n\n    iex> Integer.parse("three")\n    :error\n\n    iex> Integer.parse("34", 10)\n    {34, ""}\n\n    iex> Integer.parse("f4", 16)\n    {244, ""}\n\n    iex> Integer.parse("Awww++", 36)\n    {509216, "++"}\n\n    iex> Integer.parse("fab", 10)\n    :error\n\n    iex> Integer.parse("a2", 38)\n    ** (ArgumentError) invalid base 38\n\n',
    },
    {
      name: "mod/2",
      type: "function",
      specs: [
        "@spec mod(integer(), neg_integer() | pos_integer()) :: integer()",
      ],
      documentation:
        "Computes the modulo remainder of an integer division.\n\nThis function performs a [floored division](`floor_div/2`), which means that\nthe result will always have the sign of the `divisor`.\n\nRaises an `ArithmeticError` exception if one of the arguments is not an\ninteger, or when the `divisor` is `0`.\n\n## Examples\n\n    iex> Integer.mod(5, 2)\n    1\n    iex> Integer.mod(6, -4)\n    -2\n\n",
    },
    {
      name: "gcd/2",
      type: "function",
      specs: ["@spec gcd(integer(), integer()) :: non_neg_integer()"],
      documentation:
        "Returns the greatest common divisor of the two given integers.\n\nThe greatest common divisor (GCD) of `integer1` and `integer2` is the largest positive\ninteger that divides both `integer1` and `integer2` without leaving a remainder.\n\nBy convention, `gcd(0, 0)` returns `0`.\n\n## Examples\n\n    iex> Integer.gcd(2, 3)\n    1\n\n    iex> Integer.gcd(8, 12)\n    4\n\n    iex> Integer.gcd(8, -12)\n    4\n\n    iex> Integer.gcd(10, 0)\n    10\n\n    iex> Integer.gcd(7, 7)\n    7\n\n    iex> Integer.gcd(0, 0)\n    0\n\n",
    },
    {
      name: "floor_div/2",
      type: "function",
      specs: [
        "@spec floor_div(integer(), neg_integer() | pos_integer()) :: integer()",
      ],
      documentation:
        "Performs a floored integer division.\n\nRaises an `ArithmeticError` exception if one of the arguments is not an\ninteger, or when the `divisor` is `0`.\n\nThis function performs a *floored* integer division, which means that\nthe result will always be rounded towards negative infinity.\n\nIf you want to perform truncated integer division (rounding towards zero),\nuse `Kernel.div/2` instead.\n\n## Examples\n\n    iex> Integer.floor_div(5, 2)\n    2\n    iex> Integer.floor_div(6, -4)\n    -2\n    iex> Integer.floor_div(-99, 2)\n    -50\n\n",
    },
    {
      name: "extended_gcd/2",
      type: "function",
      specs: [
        "@spec extended_gcd(integer(), integer()) ::\n        {non_neg_integer(), integer(), integer()}",
      ],
      documentation:
        "Returns the extended greatest common divisor of the two given integers.\n\nThis function uses the extended Euclidean algorithm to return a three-element tuple with the `gcd`\nand the coefficients `m` and `n` of Bézout's identity such that:\n\n    gcd(a, b) = m*a + n*b\n\nBy convention, `extended_gcd(0, 0)` returns `{0, 0, 0}`.\n\n## Examples\n\n    iex> Integer.extended_gcd(240, 46)\n    {2, -9, 47}\n    iex> Integer.extended_gcd(46, 240)\n    {2, 47, -9}\n    iex> Integer.extended_gcd(-46, 240)\n    {2, -47, -9}\n    iex> Integer.extended_gcd(-46, -240)\n    {2, -47, 9}\n\n    iex> Integer.extended_gcd(14, 21)\n    {7, -1, 1}\n\n    iex> Integer.extended_gcd(10, 0)\n    {10, 1, 0}\n    iex> Integer.extended_gcd(0, 10)\n    {10, 0, 1}\n    iex> Integer.extended_gcd(0, 0)\n    {0, 0, 0}\n\n",
    },
    {
      name: "digits/2",
      type: "function",
      specs: ["@spec digits(integer(), pos_integer()) :: [integer(), ...]"],
      documentation:
        "Returns the ordered digits for the given `integer`.\n\nAn optional `base` value may be provided representing the radix for the returned\ndigits. This one must be an integer >= 2.\n\n## Examples\n\n    iex> Integer.digits(123)\n    [1, 2, 3]\n\n    iex> Integer.digits(170, 2)\n    [1, 0, 1, 0, 1, 0, 1, 0]\n\n    iex> Integer.digits(-170, 2)\n    [-1, 0, -1, 0, -1, 0, -1, 0]\n\n",
    },
  ],
  name: "Integer",
  callbacks: [],
  macros: [
    {
      name: "is_odd/1",
      type: "macro",
      specs: [],
      documentation:
        "Determines if `integer` is odd.\n\nReturns `true` if the given `integer` is an odd number,\notherwise it returns `false`.\n\nAllowed in guard clauses.\n\n## Examples\n\n    iex> Integer.is_odd(5)\n    true\n\n    iex> Integer.is_odd(6)\n    false\n\n    iex> Integer.is_odd(-5)\n    true\n\n    iex> Integer.is_odd(0)\n    false\n\n",
    },
    {
      name: "is_even/1",
      type: "macro",
      specs: [],
      documentation:
        "Determines if an `integer` is even.\n\nReturns `true` if the given `integer` is an even number,\notherwise it returns `false`.\n\nAllowed in guard clauses.\n\n## Examples\n\n    iex> Integer.is_even(10)\n    true\n\n    iex> Integer.is_even(5)\n    false\n\n    iex> Integer.is_even(-10)\n    true\n\n    iex> Integer.is_even(0)\n    true\n\n",
    },
  ],
  types: [],
};
