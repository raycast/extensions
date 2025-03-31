import type { ModuleDoc } from "../types";

export const Range: ModuleDoc = {
  functions: [
    {
      name: "to_list/1",
      type: "function",
      specs: ["@spec to_list(t()) :: [integer()]"],
      documentation:
        "Converts a range to a list.\n\n## Examples\n\n    iex> Range.to_list(0..5)\n    [0, 1, 2, 3, 4, 5]\n    iex> Range.to_list(-3..0)\n    [-3, -2, -1, 0]\n\n",
    },
    {
      name: "split/2",
      type: "function",
      specs: ["@spec split(t(), integer()) :: {t(), t()}"],
      documentation:
        "Splits a range in two.\n\nIt returns a tuple of two elements.\n\nIf `split` is less than the number of elements in the range, the first\nelement in the range will have `split` entries and the second will have\nall remaining entries.\n\nIf `split` is more than the number of elements in the range, the second\nrange in the tuple will emit zero elements.\n\n## Examples\n\nIncreasing ranges:\n\n    iex> Range.split(1..5, 2)\n    {1..2, 3..5}\n\n    iex> Range.split(1..5//2, 2)\n    {1..3//2, 5..5//2}\n\n    iex> Range.split(1..5//2, 0)\n    {1..-1//2, 1..5//2}\n\n    iex> Range.split(1..5//2, 10)\n    {1..5//2, 7..5//2}\n\nDecreasing ranges can also be split:\n\n    iex> Range.split(5..1//-1, 2)\n    {5..4//-1, 3..1//-1}\n\n    iex> Range.split(5..1//-2, 2)\n    {5..3//-2, 1..1//-2}\n\n    iex> Range.split(5..1//-2, 0)\n    {5..7//-2, 5..1//-2}\n\n    iex> Range.split(5..1//-2, 10)\n    {5..1//-2, -1..1//-2}\n\nEmpty ranges preserve their property but still return empty ranges:\n\n    iex> Range.split(2..5//-1, 2)\n    {2..3//-1, 4..5//-1}\n\n    iex> Range.split(2..5//-1, 10)\n    {2..3//-1, 4..5//-1}\n\n    iex> Range.split(5..2//1, 2)\n    {5..4//1, 3..2//1}\n\n    iex> Range.split(5..2//1, 10)\n    {5..4//1, 3..2//1}\n\nIf the number to split is negative, it splits from the back:\n\n    iex> Range.split(1..5, -2)\n    {1..3, 4..5}\n\n    iex> Range.split(5..1//-1, -2)\n    {5..3//-1, 2..1//-1}\n\nIf it is negative and greater than the elements in the range,\nthe first element of the tuple will be an empty range:\n\n    iex> Range.split(1..5, -10)\n    {1..0//1, 1..5}\n\n    iex> Range.split(5..1//-1, -10)\n    {5..6//-1, 5..1//-1}\n\n## Properties\n\nWhen a range is split, the following properties are observed.\nGiven `split(input)` returns `{left, right}`, we have:\n\n    assert input.first == left.first\n    assert input.last == right.last\n    assert input.step == left.step\n    assert input.step == right.step\n    assert Range.size(input) == Range.size(left) + Range.size(right)\n\n",
    },
    {
      name: "size/1",
      type: "function",
      specs: ["@spec size(t()) :: non_neg_integer()"],
      documentation:
        "Returns the size of `range`.\n\n## Examples\n\n    iex> Range.size(1..10)\n    10\n    iex> Range.size(1..10//2)\n    5\n    iex> Range.size(1..10//3)\n    4\n    iex> Range.size(1..10//-1)\n    0\n\n    iex> Range.size(10..1//-1)\n    10\n    iex> Range.size(10..1//-2)\n    5\n    iex> Range.size(10..1//-3)\n    4\n    iex> Range.size(10..1//1)\n    0\n\n",
    },
    {
      name: "shift/2",
      type: "function",
      specs: ["@spec shift(t(), integer()) :: t()"],
      documentation:
        "Shifts a range by the given number of steps.\n\n## Examples\n\n    iex> Range.shift(0..10, 1)\n    1..11\n    iex> Range.shift(0..10, 2)\n    2..12\n\n    iex> Range.shift(0..10//2, 2)\n    4..14//2\n    iex> Range.shift(10..0//-2, 2)\n    6..-4//-2\n\n",
    },
    {
      name: "new/3",
      type: "function",
      specs: ["@spec new(limit(), limit(), step()) :: t()"],
      documentation:
        "Creates a new range with `step`.\n\n## Examples\n\n    iex> Range.new(-100, 100, 2)\n    -100..100//2\n\n",
    },
    {
      name: "new/2",
      type: "function",
      specs: ["@spec new(limit(), limit()) :: t()"],
      documentation:
        "Creates a new range.\n\nIf `first` is less than `last`, the range will be increasing from\n`first` to `last`. If `first` is equal to `last`, the range will contain\none element, which is the number itself.\n\nIf `first` is greater than `last`, the range will be decreasing from `first`\nto `last`, albeit this behavior is deprecated. Therefore, it is advised to\nexplicitly list the step with `new/3`.\n\n## Examples\n\n    iex> Range.new(-100, 100)\n    -100..100\n\n",
    },
    {
      name: "disjoint?/2",
      type: "function",
      specs: ["@spec disjoint?(t(), t()) :: boolean()"],
      documentation:
        "Checks if two ranges are disjoint.\n\n## Examples\n\n    iex> Range.disjoint?(1..5, 6..9)\n    true\n    iex> Range.disjoint?(5..1//-1, 6..9)\n    true\n    iex> Range.disjoint?(1..5, 5..9)\n    false\n    iex> Range.disjoint?(1..5, 2..7)\n    false\n\nSteps are also considered when computing the ranges to be disjoint:\n\n    iex> Range.disjoint?(1..10//2, 2..10//2)\n    true\n\n    # First element in common is 29\n    iex> Range.disjoint?(1..100//14, 8..100//21)\n    false\n    iex> Range.disjoint?(57..-1//-14, 8..100//21)\n    false\n    iex> Range.disjoint?(1..100//14, 50..8//-21)\n    false\n    iex> Range.disjoint?(1..28//14, 8..28//21)\n    true\n\n    # First element in common is 14\n    iex> Range.disjoint?(2..28//3, 9..28//5)\n    false\n    iex> Range.disjoint?(26..2//-3, 29..9//-5)\n    false\n\n    # Starting from the back without alignment\n    iex> Range.disjoint?(27..11//-3, 30..0//-7)\n    true\n\n",
    },
  ],
  name: "Range",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "t/2",
      type: "type",
      specs: [
        "@type t() :: %Range{first: limit(), last: limit(), step: step()}",
        "@type t(first, last) :: %Range{first: first, last: last, step: step()}",
      ],
      documentation: null,
    },
    {
      name: "t/0",
      type: "type",
      specs: [
        "@type t() :: %Range{first: limit(), last: limit(), step: step()}",
        "@type t(first, last) :: %Range{first: first, last: last, step: step()}",
      ],
      documentation: null,
    },
    {
      name: "step/0",
      type: "type",
      specs: ["@type step() :: pos_integer() | neg_integer()"],
      documentation: null,
    },
    {
      name: "limit/0",
      type: "type",
      specs: ["@type limit() :: integer()"],
      documentation: null,
    },
  ],
};
