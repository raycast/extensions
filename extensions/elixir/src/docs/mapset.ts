import type { ModuleDoc } from "../types";

export const MapSet: ModuleDoc = {
  functions: [
    {
      name: "union/2",
      type: "function",
      specs: [
        "@spec union(t(val1), t(val2)) :: t(val1 | val2)\n      when val1: value(), val2: value()",
      ],
      documentation:
        "Returns a set containing all members of `map_set1` and `map_set2`.\n\n## Examples\n\n    iex> MapSet.union(MapSet.new([1, 2]), MapSet.new([2, 3, 4]))\n    MapSet.new([1, 2, 3, 4])\n\n",
    },
    {
      name: "to_list/1",
      type: "function",
      specs: ["@spec to_list(t(val)) :: [val] when val: value()"],
      documentation:
        "Converts `map_set` to a list.\n\n## Examples\n\n    iex> MapSet.to_list(MapSet.new([1, 2, 3]))\n    [1, 2, 3]\n\n",
    },
    {
      name: "symmetric_difference/2",
      type: "function",
      specs: [
        "@spec symmetric_difference(t(val1), t(val2)) :: t(val1 | val2)\n      when val1: value(), val2: value()",
      ],
      documentation:
        "Returns a set with elements that are present in only one but not both sets.\n\n## Examples\n\n    iex> MapSet.symmetric_difference(MapSet.new([1, 2, 3]), MapSet.new([2, 3, 4]))\n    MapSet.new([1, 4])\n\n",
    },
    {
      name: "subset?/2",
      type: "function",
      specs: ["@spec subset?(t(), t()) :: boolean()"],
      documentation:
        "Checks if `map_set1`'s members are all contained in `map_set2`.\n\nThis function checks if `map_set1` is a subset of `map_set2`.\n\n## Examples\n\n    iex> MapSet.subset?(MapSet.new([1, 2]), MapSet.new([1, 2, 3]))\n    true\n    iex> MapSet.subset?(MapSet.new([1, 2, 3]), MapSet.new([1, 2]))\n    false\n\n",
    },
    {
      name: "split_with/2",
      type: "function",
      specs: [
        "@spec split_with(t(), (any() -> as_boolean(term()))) :: {t(), t()}",
      ],
      documentation:
        "Splits the `map_set` into two `MapSet`s according to the given function `fun`.\n\n`fun` receives each element in the `map_set` as its only argument. Returns\na tuple with the first `MapSet` containing all the elements in `map_set` for which\napplying `fun` returned a truthy value, and a second `MapSet` with all the elements\nfor which applying `fun` returned a falsy value (`false` or `nil`).\n\n## Examples\n\n    iex> {while_true, while_false} = MapSet.split_with(MapSet.new([1, 2, 3, 4]), fn v -> rem(v, 2) == 0 end)\n    iex> while_true\n    MapSet.new([2, 4])\n    iex> while_false\n    MapSet.new([1, 3])\n\n    iex> {while_true, while_false} = MapSet.split_with(MapSet.new(), fn {_k, v} -> v > 50 end)\n    iex> while_true\n    MapSet.new([])\n    iex> while_false\n    MapSet.new([])\n\n",
    },
    {
      name: "size/1",
      type: "function",
      specs: ["@spec size(t()) :: non_neg_integer()"],
      documentation:
        "Returns the number of elements in `map_set`.\n\n## Examples\n\n    iex> MapSet.size(MapSet.new([1, 2, 3]))\n    3\n\n",
    },
    {
      name: "reject/2",
      type: "function",
      specs: [
        "@spec reject(t(a), (a -> as_boolean(term()))) :: t(a) when a: value()",
      ],
      documentation:
        'Returns a set by excluding the elements from `map_set` for which invoking `fun`\nreturns a truthy value.\n\nSee also `filter/2`.\n\n## Examples\n\n    iex> MapSet.reject(MapSet.new(1..5), fn x -> rem(x, 2) != 0 end)\n    MapSet.new([2, 4])\n\n    iex> MapSet.reject(MapSet.new(["a", :b, "c"]), &is_atom/1)\n    MapSet.new(["a", "c"])\n\n',
    },
    {
      name: "put/2",
      type: "function",
      specs: [
        "@spec put(t(val), new_val) :: t(val | new_val)\n      when val: value(), new_val: value()",
      ],
      documentation:
        "Inserts `value` into `map_set` if `map_set` doesn't already contain it.\n\n## Examples\n\n    iex> MapSet.put(MapSet.new([1, 2, 3]), 3)\n    MapSet.new([1, 2, 3])\n    iex> MapSet.put(MapSet.new([1, 2, 3]), 4)\n    MapSet.new([1, 2, 3, 4])\n\n",
    },
    {
      name: "new/2",
      type: "function",
      specs: [
        "@spec new(Enumerable.t(), (term() -> val)) :: t(val) when val: value()",
      ],
      documentation:
        "Creates a set from an enumerable via the transformation function.\n\n## Examples\n\n    iex> MapSet.new([1, 2, 1], fn x -> 2 * x end)\n    MapSet.new([2, 4])\n\n",
    },
    {
      name: "new/1",
      type: "function",
      specs: ["@spec new(Enumerable.t()) :: t()"],
      documentation:
        "Creates a set from an enumerable.\n\n## Examples\n\n    iex> MapSet.new([:b, :a, 3])\n    MapSet.new([3, :a, :b])\n    iex> MapSet.new([3, 3, 3, 2, 2, 1])\n    MapSet.new([1, 2, 3])\n\n",
    },
    {
      name: "new/0",
      type: "function",
      specs: ["@spec new() :: t()"],
      documentation:
        "Returns a new set.\n\n## Examples\n\n    iex> MapSet.new()\n    MapSet.new([])\n\n",
    },
    {
      name: "member?/2",
      type: "function",
      specs: ["@spec member?(t(), value()) :: boolean()"],
      documentation:
        "Checks if `map_set` contains `value`.\n\n## Examples\n\n    iex> MapSet.member?(MapSet.new([1, 2, 3]), 2)\n    true\n    iex> MapSet.member?(MapSet.new([1, 2, 3]), 4)\n    false\n\n",
    },
    {
      name: "intersection/2",
      type: "function",
      specs: ["@spec intersection(t(val), t(val)) :: t(val) when val: value()"],
      documentation:
        "Returns a set containing only members that `map_set1` and `map_set2` have in common.\n\n## Examples\n\n    iex> MapSet.intersection(MapSet.new([1, 2]), MapSet.new([2, 3, 4]))\n    MapSet.new([2])\n\n    iex> MapSet.intersection(MapSet.new([1, 2]), MapSet.new([3, 4]))\n    MapSet.new([])\n\n",
    },
    {
      name: "filter/2",
      type: "function",
      specs: [
        "@spec filter(t(a), (a -> as_boolean(term()))) :: t(a) when a: value()",
      ],
      documentation:
        'Filters the set by returning only the elements from `map_set` for which invoking\n`fun` returns a truthy value.\n\nAlso see `reject/2` which discards all elements where the function returns\na truthy value.\n\n> #### Performance considerations {: .tip}\n>\n> If you find yourself doing multiple calls to `MapSet.filter/2`\n> and `MapSet.reject/2` in a pipeline, it is likely more efficient\n> to use `Enum.map/2` and `Enum.filter/2` instead and convert to\n> a map at the end using `MapSet.new/1`.\n\n## Examples\n\n    iex> MapSet.filter(MapSet.new(1..5), fn x -> x > 3 end)\n    MapSet.new([4, 5])\n\n    iex> MapSet.filter(MapSet.new(["a", :b, "c"]), &is_atom/1)\n    MapSet.new([:b])\n\n',
    },
    {
      name: "equal?/2",
      type: "function",
      specs: ["@spec equal?(t(), t()) :: boolean()"],
      documentation:
        "Checks if two sets are equal.\n\nThe comparison between elements is done using `===/2`,\nwhich a set with `1` is not equivalent to a set with\n`1.0`.\n\n## Examples\n\n    iex> MapSet.equal?(MapSet.new([1, 2]), MapSet.new([2, 1, 1]))\n    true\n    iex> MapSet.equal?(MapSet.new([1, 2]), MapSet.new([3, 4]))\n    false\n    iex> MapSet.equal?(MapSet.new([1]), MapSet.new([1.0]))\n    false\n\n",
    },
    {
      name: "disjoint?/2",
      type: "function",
      specs: ["@spec disjoint?(t(), t()) :: boolean()"],
      documentation:
        "Checks if `map_set1` and `map_set2` have no members in common.\n\n## Examples\n\n    iex> MapSet.disjoint?(MapSet.new([1, 2]), MapSet.new([3, 4]))\n    true\n    iex> MapSet.disjoint?(MapSet.new([1, 2]), MapSet.new([2, 3]))\n    false\n\n",
    },
    {
      name: "difference/2",
      type: "function",
      specs: [
        "@spec difference(t(val1), t(val2)) :: t(val1) when val1: value(), val2: value()",
      ],
      documentation:
        "Returns a set that is `map_set1` without the members of `map_set2`.\n\n## Examples\n\n    iex> MapSet.difference(MapSet.new([1, 2]), MapSet.new([2, 3, 4]))\n    MapSet.new([1])\n\n",
    },
    {
      name: "delete/2",
      type: "function",
      specs: [
        "@spec delete(t(val1), val2) :: t(val1) when val1: value(), val2: value()",
      ],
      documentation:
        "Deletes `value` from `map_set`.\n\nReturns a new set which is a copy of `map_set` but without `value`.\n\n## Examples\n\n    iex> map_set = MapSet.new([1, 2, 3])\n    iex> MapSet.delete(map_set, 4)\n    MapSet.new([1, 2, 3])\n    iex> MapSet.delete(map_set, 2)\n    MapSet.new([1, 3])\n\n",
    },
  ],
  name: "MapSet",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "internal/1",
      type: "type",
      specs: ["@opaque internal(value)"],
      documentation: null,
    },
    {
      name: "t/0",
      type: "type",
      specs: [
        "@type t() :: t(term())",
        "@type t(value) :: %MapSet{map: internal(value)}",
      ],
      documentation: null,
    },
    {
      name: "t/1",
      type: "type",
      specs: [
        "@type t() :: t(term())",
        "@type t(value) :: %MapSet{map: internal(value)}",
      ],
      documentation: null,
    },
    {
      name: "value/0",
      type: "type",
      specs: ["@type value() :: term()"],
      documentation: null,
    },
  ],
};
