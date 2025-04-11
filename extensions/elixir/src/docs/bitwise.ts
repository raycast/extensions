import type { ModuleDoc } from "../types";

export const Bitwise: ModuleDoc = {
  functions: [
    {
      name: "|||/2",
      type: "function",
      specs: ["@spec integer() ||| integer() :: integer()"],
      documentation:
        "Bitwise OR operator.\n\nCalculates the bitwise OR of its arguments.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> 9 ||| 3\n    11\n\n",
    },
    {
      name: "bxor/2",
      type: "function",
      specs: ["@spec bxor(integer(), integer()) :: integer()"],
      documentation:
        "Calculates the bitwise XOR of its arguments.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> bxor(9, 3)\n    10\n\n",
    },
    {
      name: "bsr/2",
      type: "function",
      specs: ["@spec bsr(integer(), integer()) :: integer()"],
      documentation:
        "Calculates the result of an arithmetic right bitshift.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> bsr(1, 2)\n    0\n\n    iex> bsr(1, -2)\n    4\n\n    iex> bsr(-1, 2)\n    -1\n\n    iex> bsr(-1, -2)\n    -4\n\n",
    },
    {
      name: "bsl/2",
      type: "function",
      specs: ["@spec bsl(integer(), integer()) :: integer()"],
      documentation:
        "Calculates the result of an arithmetic left bitshift.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> bsl(1, 2)\n    4\n\n    iex> bsl(1, -2)\n    0\n\n    iex> bsl(-1, 2)\n    -4\n\n    iex> bsl(-1, -2)\n    -1\n\n",
    },
    {
      name: "bor/2",
      type: "function",
      specs: ["@spec bor(integer(), integer()) :: integer()"],
      documentation:
        "Calculates the bitwise OR of its arguments.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> bor(9, 3)\n    11\n\n",
    },
    {
      name: "bnot/1",
      type: "function",
      specs: ["@spec bnot(integer()) :: integer()"],
      documentation:
        "Calculates the bitwise NOT of the argument.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> bnot(2)\n    -3\n\n    iex> bnot(2) &&& 3\n    1\n\n",
    },
    {
      name: "band/2",
      type: "function",
      specs: ["@spec band(integer(), integer()) :: integer()"],
      documentation:
        "Calculates the bitwise AND of its arguments.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> band(9, 3)\n    1\n\n",
    },
    {
      name: ">>>/2",
      type: "function",
      specs: ["@spec integer() >>> integer() :: integer()"],
      documentation:
        "Arithmetic right bitshift operator.\n\nCalculates the result of an arithmetic right bitshift.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> 1 >>> 2\n    0\n\n    iex> 1 >>> -2\n    4\n\n    iex> -1 >>> 2\n    -1\n\n    iex> -1 >>> -2\n    -4\n\n",
    },
    {
      name: "<<</2",
      type: "function",
      specs: ["@spec integer() <<< integer() :: integer()"],
      documentation:
        "Arithmetic left bitshift operator.\n\nCalculates the result of an arithmetic left bitshift.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> 1 <<< 2\n    4\n\n    iex> 1 <<< -2\n    0\n\n    iex> -1 <<< 2\n    -4\n\n    iex> -1 <<< -2\n    -1\n\n",
    },
    {
      name: "&&&/2",
      type: "function",
      specs: ["@spec integer() &&& integer() :: integer()"],
      documentation:
        "Bitwise AND operator.\n\nCalculates the bitwise AND of its arguments.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> 9 &&& 3\n    1\n\n",
    },
  ],
  name: "Bitwise",
  callbacks: [],
  macros: [],
  types: [],
};
