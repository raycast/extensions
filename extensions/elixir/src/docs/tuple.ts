import type { ModuleDoc } from "../types";

export const Tuple: ModuleDoc = {
  functions: [
    {
      name: "to_list/1",
      type: "function",
      specs: ["@spec to_list(tuple()) :: list()"],
      documentation:
        "Converts a tuple to a list.\n\nReturns a new list with all the tuple elements.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> tuple = {:foo, :bar, :baz}\n    iex> Tuple.to_list(tuple)\n    [:foo, :bar, :baz]\n\n",
    },
    {
      name: "sum/1",
      type: "function",
      specs: ["@spec sum(tuple()) :: number()"],
      documentation:
        "Computes a sum of tuple elements.\n\n## Examples\n\n    iex> Tuple.sum({255, 255})\n    510\n    iex> Tuple.sum({255, 0.0})\n    255.0\n    iex> Tuple.sum({})\n    0\n",
    },
    {
      name: "product/1",
      type: "function",
      specs: ["@spec product(tuple()) :: number()"],
      documentation:
        "Computes a product of tuple elements.\n\n## Examples\n\n    iex> Tuple.product({255, 255})\n    65025\n    iex> Tuple.product({255, 1.0})\n    255.0\n    iex> Tuple.product({})\n    1\n",
    },
    {
      name: "insert_at/3",
      type: "function",
      specs: ["@spec insert_at(tuple(), non_neg_integer(), term()) :: tuple()"],
      documentation:
        "Inserts an element into a tuple.\n\nInserts `value` into `tuple` at the given `index`.\nRaises an `ArgumentError` if `index` is negative or greater than the\nlength of `tuple`. Index is zero-based.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> tuple = {:bar, :baz}\n    iex> Tuple.insert_at(tuple, 0, :foo)\n    {:foo, :bar, :baz}\n    iex> Tuple.insert_at(tuple, 2, :bong)\n    {:bar, :baz, :bong}\n\n",
    },
    {
      name: "duplicate/2",
      type: "function",
      specs: ["@spec duplicate(term(), non_neg_integer()) :: tuple()"],
      documentation:
        "Creates a new tuple.\n\nCreates a tuple of `size` containing the\ngiven `data` at every position.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> Tuple.duplicate(:hello, 3)\n    {:hello, :hello, :hello}\n\n",
    },
    {
      name: "delete_at/2",
      type: "function",
      specs: ["@spec delete_at(tuple(), non_neg_integer()) :: tuple()"],
      documentation:
        "Removes an element from a tuple.\n\nDeletes the element at the given `index` from `tuple`.\nRaises an `ArgumentError` if `index` is negative or greater than\nor equal to the length of `tuple`. Index is zero-based.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> tuple = {:foo, :bar, :baz}\n    iex> Tuple.delete_at(tuple, 0)\n    {:bar, :baz}\n\n",
    },
    {
      name: "append/2",
      type: "function",
      specs: ["@spec append(tuple(), term()) :: tuple()"],
      documentation:
        "Inserts an element at the end of a tuple.\n\nReturns a new tuple with the element appended at the end, and contains\nthe elements in `tuple` followed by `value` as the last element.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> tuple = {:foo, :bar}\n    iex> Tuple.append(tuple, :baz)\n    {:foo, :bar, :baz}\n\n",
    },
  ],
  name: "Tuple",
  callbacks: [],
  macros: [],
  types: [],
};
