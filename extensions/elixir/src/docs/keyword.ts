import type { ModuleDoc } from "../types";

export const Keyword: ModuleDoc = {
  functions: [
    {
      name: "values/1",
      type: "function",
      specs: ["@spec values(t()) :: [value()]"],
      documentation:
        "Returns all values from the keyword list.\n\nKeeps values from duplicate keys in the resulting list of values.\n\n## Examples\n\n    iex> Keyword.values(a: 1, b: 2)\n    [1, 2]\n    iex> Keyword.values(a: 1, b: 2, a: 3)\n    [1, 2, 3]\n\n",
    },
    {
      name: "validate!/2",
      type: "function",
      specs: [
        "@spec validate!(\n        keyword(),\n        values :: [atom() | {atom(), term()}]\n      ) :: keyword()",
      ],
      documentation:
        "Similar to `validate/2` but returns the keyword or raises an error.\n\n## Examples\n\n    iex> Keyword.validate!([], [one: 1, two: 2]) |> Enum.sort()\n    [one: 1, two: 2]\n    iex> Keyword.validate!([two: 3], [one: 1, two: 2]) |> Enum.sort()\n    [one: 1, two: 3]\n\nIf atoms are given, they are supported as keys but do not\nprovide a default value:\n\n    iex> Keyword.validate!([], [:one, two: 2]) |> Enum.sort()\n    [two: 2]\n    iex> Keyword.validate!([one: 1], [:one, two: 2]) |> Enum.sort()\n    [one: 1, two: 2]\n\nPassing unknown keys raises an error:\n\n    iex> Keyword.validate!([three: 3], [one: 1, two: 2])\n    ** (ArgumentError) unknown keys [:three] in [three: 3], the allowed keys are: [:one, :two]\n\nPassing the same key multiple times also errors:\n\n    iex> Keyword.validate!([one: 1, two: 2, one: 1], [:one, :two])\n    ** (ArgumentError) duplicate keys [:one] in [one: 1, two: 2, one: 1]\n\n",
    },
    {
      name: "validate/2",
      type: "function",
      specs: [
        "@spec validate(\n        keyword(),\n        values :: [atom() | {atom(), term()}]\n      ) :: {:ok, keyword()} | {:error, [atom()]}",
      ],
      documentation:
        "Ensures the given `keyword` has only the keys given in `values`.\n\nThe second argument must be a list of atoms, specifying\na given key, or tuples specifying a key and a default value.\n\nIf the keyword list has only the given keys, it returns\n`{:ok, keyword}` with default values applied. Otherwise it\nreturns `{:error, invalid_keys}` with invalid keys.\n\nSee also: `validate!/2`.\n\n## Examples\n\n    iex> {:ok, result} = Keyword.validate([], [one: 1, two: 2])\n    iex> Enum.sort(result)\n    [one: 1, two: 2]\n\n    iex> {:ok, result} = Keyword.validate([two: 3], [one: 1, two: 2])\n    iex> Enum.sort(result)\n    [one: 1, two: 3]\n\nIf atoms are given, they are supported as keys but do not\nprovide a default value:\n\n    iex> {:ok, result} = Keyword.validate([], [:one, two: 2])\n    iex> Enum.sort(result)\n    [two: 2]\n\n    iex> {:ok, result} = Keyword.validate([one: 1], [:one, two: 2])\n    iex> Enum.sort(result)\n    [one: 1, two: 2]\n\nPassing unknown keys returns an error:\n\n    iex> Keyword.validate([three: 3, four: 4], [one: 1, two: 2])\n    {:error, [:four, :three]}\n\nPassing the same key multiple times also errors:\n\n    iex> Keyword.validate([one: 1, two: 2, one: 1], [:one, :two])\n    {:error, [:one]}\n\n",
    },
    {
      name: "update!/3",
      type: "function",
      specs: [
        "@spec update!(t(), key(), (current_value :: value() -> new_value :: value())) ::\n        t()",
      ],
      documentation:
        "Updates the value under `key` using the given function.\n\nRaises `KeyError` if the `key` does not exist.\n\nRemoves all duplicate keys and only updates the first one.\n\n## Examples\n\n    iex> Keyword.update!([a: 1, b: 2, a: 3], :a, &(&1 * 2))\n    [a: 2, b: 2]\n    iex> Keyword.update!([a: 1, b: 2, c: 3], :b, &(&1 * 2))\n    [a: 1, b: 4, c: 3]\n\n    iex> Keyword.update!([a: 1], :b, &(&1 * 2))\n    ** (KeyError) key :b not found in: [a: 1]\n\n",
    },
    {
      name: "update/4",
      type: "function",
      specs: [
        "@spec update(t(), key(), default :: value(), (existing_value :: value() ->\n                                                new_value :: value())) :: t()",
      ],
      documentation:
        "Updates the value under `key` in `keywords` using the given function.\n\nIf the `key` does not exist, it inserts the given `default` value.\nDoes not pass the `default` value through the update function.\n\nRemoves all duplicate keys and only updates the first one.\n\n## Examples\n\n    iex> Keyword.update([a: 1], :a, 13, fn existing_value -> existing_value * 2 end)\n    [a: 2]\n\n    iex> Keyword.update([a: 1, a: 2], :a, 13, fn existing_value -> existing_value * 2 end)\n    [a: 2]\n\n    iex> Keyword.update([a: 1], :b, 11, fn existing_value -> existing_value * 2 end)\n    [a: 1, b: 11]\n\n",
    },
    {
      name: "to_list/1",
      type: "function",
      specs: ["@spec to_list(t()) :: t()"],
      documentation:
        "Returns the keyword list itself.\n\n## Examples\n\n    iex> Keyword.to_list(a: 1)\n    [a: 1]\n\n",
    },
    {
      name: "take/2",
      type: "function",
      specs: ["@spec take(t(), [key()]) :: t()"],
      documentation:
        "Takes all entries corresponding to the given `keys` and returns them as a new\nkeyword list.\n\nPreserves duplicate keys in the new keyword list.\n\n## Examples\n\n    iex> Keyword.take([a: 1, b: 2, c: 3], [:a, :c, :e])\n    [a: 1, c: 3]\n    iex> Keyword.take([a: 1, b: 2, c: 3, a: 5], [:a, :c, :e])\n    [a: 1, c: 3, a: 5]\n\n",
    },
    {
      name: "split_with/2",
      type: "function",
      specs: [
        "@spec split_with(t(), ({key(), value()} -> as_boolean(term()))) :: {t(), t()}",
      ],
      documentation:
        "Splits the `keywords` into two keyword lists according to the given function\n`fun`.\n\nThe provided `fun` receives each `{key, value}` pair in the `keywords` as its only\nargument. Returns a tuple with the first keyword list containing all the\nelements in `keywords` for which applying `fun` returned a truthy value, and\na second keyword list with all the elements for which applying `fun` returned\na falsy value (`false` or `nil`).\n\n## Examples\n\n    iex> Keyword.split_with([a: 1, b: 2, c: 3], fn {_k, v} -> rem(v, 2) == 0 end)\n    {[b: 2], [a: 1, c: 3]}\n\n    iex> Keyword.split_with([a: 1, b: 2, c: 3, b: 4], fn {_k, v} -> rem(v, 2) == 0 end)\n    {[b: 2, b: 4], [a: 1, c: 3]}\n\n    iex> Keyword.split_with([a: 1, b: 2, c: 3, b: 4], fn {k, v} -> k in [:a, :c] and rem(v, 2) == 0 end)\n    {[], [a: 1, b: 2, c: 3, b: 4]}\n\n    iex> Keyword.split_with([], fn {_k, v} -> rem(v, 2) == 0 end)\n    {[], []}\n\n",
    },
    {
      name: "split/2",
      type: "function",
      specs: ["@spec split(t(), [key()]) :: {t(), t()}"],
      documentation:
        "Takes all entries corresponding to the given `keys` and extracts them into a\nseparate keyword list.\n\nReturns a tuple with the new list and the old list with removed keys.\n\nIgnores keys for which there are no entries in the keyword list.\n\nEntries with duplicate keys end up in the same keyword list.\n\n## Examples\n\n    iex> Keyword.split([a: 1, b: 2, c: 3], [:a, :c, :e])\n    {[a: 1, c: 3], [b: 2]}\n    iex> Keyword.split([a: 1, b: 2, c: 3, a: 4], [:a, :c, :e])\n    {[a: 1, c: 3, a: 4], [b: 2]}\n\n",
    },
    {
      name: "replace_lazy/3",
      type: "function",
      specs: [
        "@spec replace_lazy(t(), key(), (existing_value :: value() ->\n                                  new_value :: value())) :: t()",
      ],
      documentation:
        "Replaces the value under `key` using the given function only if\n`key` already exists in `keywords`.\n\nIn comparison to `replace/3`, this can be useful when it's expensive to calculate the value.\n\nIf `key` does not exist, the original keyword list is returned unchanged.\n\n## Examples\n\n    iex> Keyword.replace_lazy([a: 1, b: 2], :a, fn v -> v * 4 end)\n    [a: 4, b: 2]\n\n    iex> Keyword.replace_lazy([a: 2, b: 2, a: 1], :a, fn v -> v * 4 end)\n    [a: 8, b: 2]\n\n    iex> Keyword.replace_lazy([a: 1, b: 2], :c, fn v -> v * 4 end)\n    [a: 1, b: 2]\n\n",
    },
    {
      name: "replace!/3",
      type: "function",
      specs: ["@spec replace!(t(), key(), value()) :: t()"],
      documentation:
        "Puts a value under `key` only if the `key` already exists in `keywords`.\n\nIf `key` is not present in `keywords`, it raises a `KeyError`.\n\n## Examples\n\n    iex> Keyword.replace!([a: 1, b: 2, a: 3], :a, :new)\n    [a: :new, b: 2]\n    iex> Keyword.replace!([a: 1, b: 2, c: 3, b: 4], :b, :new)\n    [a: 1, b: :new, c: 3]\n\n    iex> Keyword.replace!([a: 1], :b, 2)\n    ** (KeyError) key :b not found in: [a: 1]\n\n",
    },
    {
      name: "replace/3",
      type: "function",
      specs: ["@spec replace(t(), key(), value()) :: t()"],
      documentation:
        "Puts a value under `key` only if the `key` already exists in `keywords`.\n\nIn case a key exists multiple times in the keyword list,\nit removes later occurrences.\n\n## Examples\n\n    iex> Keyword.replace([a: 1, b: 2, a: 4], :a, 3)\n    [a: 3, b: 2]\n\n    iex> Keyword.replace([a: 1], :b, 2)\n    [a: 1]\n\n",
    },
    {
      name: "reject/2",
      type: "function",
      specs: [
        "@spec reject(t(), ({key(), value()} -> as_boolean(term()))) :: t()",
      ],
      documentation:
        "Returns a keyword list excluding the entries from `keywords`\nfor which the function `fun` returns a truthy value.\n\nSee also `filter/2`.\n\n## Examples\n\n    iex> Keyword.reject([one: 1, two: 2, three: 3], fn {_key, val} -> rem(val, 2) == 1 end)\n    [two: 2]\n\n",
    },
    {
      name: "put_new_lazy/3",
      type: "function",
      specs: ["@spec put_new_lazy(t(), key(), (-> value())) :: t()"],
      documentation:
        "Evaluates `fun` and puts the result under `key`\nin keyword list unless `key` is already present.\n\nThis is useful if the value is very expensive to calculate or\ngenerally difficult to set up and tear down again.\n\n## Examples\n\n    iex> keyword = [a: 1]\n    iex> fun = fn ->\n    ...>   # some expensive operation here\n    ...>   13\n    ...> end\n    iex> Keyword.put_new_lazy(keyword, :a, fun)\n    [a: 1]\n    iex> Keyword.put_new_lazy(keyword, :b, fun)\n    [b: 13, a: 1]\n\n",
    },
    {
      name: "put_new/3",
      type: "function",
      specs: ["@spec put_new(t(), key(), value()) :: t()"],
      documentation:
        "Puts the given `value` under `key`, unless the entry `key` already exists.\n\n## Examples\n\n    iex> Keyword.put_new([a: 1], :b, 2)\n    [b: 2, a: 1]\n    iex> Keyword.put_new([a: 1, b: 2], :a, 3)\n    [a: 1, b: 2]\n\n",
    },
    {
      name: "put/3",
      type: "function",
      specs: ["@spec put(t(), key(), value()) :: t()"],
      documentation:
        "Puts the given `value` under the specified `key`.\n\nIf a value under `key` already exists, it overrides the value\nand removes all duplicate entries.\n\n## Examples\n\n    iex> Keyword.put([a: 1], :b, 2)\n    [b: 2, a: 1]\n    iex> Keyword.put([a: 1, b: 2], :a, 3)\n    [a: 3, b: 2]\n    iex> Keyword.put([a: 1, b: 2, a: 4], :a, 3)\n    [a: 3, b: 2]\n\n",
    },
    {
      name: "pop_values/2",
      type: "function",
      specs: ["@spec pop_values(t(), key()) :: {[value()], t()}"],
      documentation:
        "Returns all values for `key` and removes all associated entries in the keyword list.\n\nIt returns a tuple where the first element is a list of values for `key` and the\nsecond element is a keyword list with all entries associated with `key` removed.\nIf the `key` is not present in the keyword list, it returns `{[], keyword_list}`.\n\nIf you don't want to remove all the entries associated with `key` use `pop_first/3`\ninstead, which will remove only the first entry.\n\n## Examples\n\n    iex> Keyword.pop_values([a: 1], :a)\n    {[1], []}\n    iex> Keyword.pop_values([a: 1], :b)\n    {[], [a: 1]}\n    iex> Keyword.pop_values([a: 1, a: 2], :a)\n    {[1, 2], []}\n\n",
    },
    {
      name: "pop_lazy/3",
      type: "function",
      specs: ["@spec pop_lazy(t(), key(), (-> value())) :: {value(), t()}"],
      documentation:
        "Lazily returns and removes all values associated with `key` in the keyword list.\n\nThis is useful if the default value is very expensive to calculate or\ngenerally difficult to set up and tear down again.\n\nRemoves all duplicate keys. See `pop_first/3` for removing only the first entry.\n\n## Examples\n\n    iex> keyword = [a: 1]\n    iex> fun = fn ->\n    ...>   # some expensive operation here\n    ...>   13\n    ...> end\n    iex> Keyword.pop_lazy(keyword, :a, fun)\n    {1, []}\n    iex> Keyword.pop_lazy(keyword, :b, fun)\n    {13, [a: 1]}\n\n",
    },
    {
      name: "pop_first/3",
      type: "function",
      specs: [
        "@spec pop_first(t(), key(), default()) :: {value() | default(), t()}",
      ],
      documentation:
        "Returns and removes the first value associated with `key` in the keyword list.\n\nKeeps duplicate keys in the resulting keyword list.\n\n## Examples\n\n    iex> Keyword.pop_first([a: 1], :a)\n    {1, []}\n    iex> Keyword.pop_first([a: 1], :b)\n    {nil, [a: 1]}\n    iex> Keyword.pop_first([a: 1], :b, 3)\n    {3, [a: 1]}\n    iex> Keyword.pop_first([a: 1, a: 2], :a)\n    {1, [a: 2]}\n\n",
    },
    {
      name: "pop!/2",
      type: "function",
      specs: ["@spec pop!(t(), key()) :: {value(), t()}"],
      documentation:
        "Returns the first value for `key` and removes all associated entries in the keyword list,\nraising if `key` is not present.\n\nThis function behaves like `pop/3`, but raises in case the `key` is not present in the\ngiven `keywords`.\n\n## Examples\n\n    iex> Keyword.pop!([a: 1], :a)\n    {1, []}\n    iex> Keyword.pop!([a: 1, a: 2], :a)\n    {1, []}\n    iex> Keyword.pop!([a: 1], :b)\n    ** (KeyError) key :b not found in: [a: 1]\n\n",
    },
    {
      name: "pop/3",
      type: "function",
      specs: ["@spec pop(t(), key(), default()) :: {value() | default(), t()}"],
      documentation:
        "Returns the first value for `key` and removes all associated entries in the keyword list.\n\nIt returns a tuple where the first element is the first value for `key` and the\nsecond element is a keyword list with all entries associated with `key` removed.\nIf the `key` is not present in the keyword list, it returns `{default, keyword_list}`.\n\nIf you don't want to remove all the entries associated with `key` use `pop_first/3`\ninstead, which will remove only the first entry.\n\n## Examples\n\n    iex> Keyword.pop([a: 1], :a)\n    {1, []}\n    iex> Keyword.pop([a: 1], :b)\n    {nil, [a: 1]}\n    iex> Keyword.pop([a: 1], :b, 3)\n    {3, [a: 1]}\n    iex> Keyword.pop([a: 1, a: 2], :a)\n    {1, []}\n\n",
    },
    {
      name: "new/2",
      type: "function",
      specs: ["@spec new(Enumerable.t(), (term() -> {key(), value()})) :: t()"],
      documentation:
        "Creates a keyword list from an enumerable via the transformation function.\n\nRemoves duplicate entries and the last one prevails.\nUnlike `Enum.into(enumerable, [], fun)`,\n`Keyword.new(enumerable, fun)` guarantees the keys are unique.\n\n## Examples\n\n    iex> Keyword.new([:a, :b], fn x -> {x, x} end)\n    [a: :a, b: :b]\n\n",
    },
    {
      name: "new/1",
      type: "function",
      specs: ["@spec new(Enumerable.t()) :: t()"],
      documentation:
        "Creates a keyword list from an enumerable.\n\nRemoves duplicate entries and the last one prevails.\nUnlike `Enum.into(enumerable, [])`, `Keyword.new(enumerable)`\nguarantees the keys are unique.\n\n## Examples\n\n    iex> Keyword.new([{:b, 1}, {:a, 2}])\n    [b: 1, a: 2]\n\n    iex> Keyword.new([{:a, 1}, {:a, 2}, {:a, 3}])\n    [a: 3]\n\n",
    },
    {
      name: "new/0",
      type: "function",
      specs: ["@spec new() :: []"],
      documentation:
        "Returns an empty keyword list, i.e. an empty list.\n\n## Examples\n\n    iex> Keyword.new()\n    []\n\n",
    },
    {
      name: "merge/3",
      type: "function",
      specs: [
        "@spec merge(t(), t(), (key(), value(), value() -> value())) :: t()",
      ],
      documentation:
        "Merges two keyword lists into one.\n\nAdds all keys, including duplicate keys, given in `keywords2`\nto `keywords1`. Invokes the given function to solve conflicts.\n\nIf `keywords2` has duplicate keys, it invokes the given function\nfor each matching pair in `keywords1`.\n\nThere are no guarantees about the order of the keys in the returned keyword.\n\n## Examples\n\n    iex> Keyword.merge([a: 1, b: 2], [a: 3, d: 4], fn _k, v1, v2 ->\n    ...>   v1 + v2\n    ...> end)\n    [b: 2, a: 4, d: 4]\n\n    iex> Keyword.merge([a: 1, b: 2], [a: 3, d: 4, a: 5], fn :a, v1, v2 ->\n    ...>   v1 + v2\n    ...> end)\n    [b: 2, a: 4, d: 4, a: 5]\n\n    iex> Keyword.merge([a: 1, b: 2, a: 3], [a: 3, d: 4, a: 5], fn :a, v1, v2 ->\n    ...>   v1 + v2\n    ...> end)\n    [b: 2, a: 4, d: 4, a: 8]\n\n    iex> Keyword.merge([a: 1, b: 2], [:a, :b], fn :a, v1, v2 ->\n    ...>   v1 + v2\n    ...> end)\n    ** (ArgumentError) expected a keyword list as the second argument, got: [:a, :b]\n\n",
    },
    {
      name: "merge/2",
      type: "function",
      specs: ["@spec merge(t(), t()) :: t()"],
      documentation:
        "Merges two keyword lists into one.\n\nAdds all keys, including duplicate keys, given in `keywords2`\nto `keywords1`, overriding any existing ones.\n\nThere are no guarantees about the order of the keys in the returned keyword.\n\n## Examples\n\n    iex> Keyword.merge([a: 1, b: 2], [a: 3, d: 4])\n    [b: 2, a: 3, d: 4]\n\n    iex> Keyword.merge([a: 1, b: 2], [a: 3, d: 4, a: 5])\n    [b: 2, a: 3, d: 4, a: 5]\n\n    iex> Keyword.merge([a: 1], [2, 3])\n    ** (ArgumentError) expected a keyword list as the second argument, got: [2, 3]\n\n",
    },
    {
      name: "keyword?/1",
      type: "function",
      specs: ["@spec keyword?(term()) :: boolean()"],
      documentation:
        "Returns `true` if `term` is a keyword list, otherwise `false`.\n\nWhen `term` is a list it is traversed to the end.\n\n## Examples\n\n    iex> Keyword.keyword?([])\n    true\n    iex> Keyword.keyword?(a: 1)\n    true\n    iex> Keyword.keyword?([{Foo, 1}])\n    true\n    iex> Keyword.keyword?([{}])\n    false\n    iex> Keyword.keyword?([:key])\n    false\n    iex> Keyword.keyword?(%{})\n    false\n\n",
    },
    {
      name: "keys/1",
      type: "function",
      specs: ["@spec keys(t()) :: [key()]"],
      documentation:
        'Returns all keys from the keyword list.\n\nKeeps duplicate keys in the resulting list of keys.\n\n## Examples\n\n    iex> Keyword.keys(a: 1, b: 2)\n    [:a, :b]\n\n    iex> Keyword.keys(a: 1, b: 2, a: 3)\n    [:a, :b, :a]\n\n    iex> Keyword.keys([{:a, 1}, {"b", 2}, {:c, 3}])\n    ** (ArgumentError) expected a keyword list, but an entry in the list is not a two-element tuple with an atom as its first element, got: {"b", 2}\n\n',
    },
    {
      name: "intersect/3",
      type: "function",
      specs: [
        "@spec intersect(keyword(), keyword(), (key(), value(), value() -> value())) ::\n        keyword()",
      ],
      documentation:
        'Intersects two keyword lists, returning a keyword with the common keys.\n\nBy default, it returns the values of the intersected keys in `keyword2`.\nThe keys are returned in the order found in `keyword1`.\n\n## Examples\n\n    iex> Keyword.intersect([a: 1, b: 2], [b: "b", c: "c"])\n    [b: "b"]\n\n    iex> Keyword.intersect([a: 1, b: 2], [b: 2, c: 3], fn _k, v1, v2 ->\n    ...>   v1 + v2\n    ...> end)\n    [b: 4]\n\n',
    },
    {
      name: "has_key?/2",
      type: "function",
      specs: ["@spec has_key?(t(), key()) :: boolean()"],
      documentation:
        "Returns whether a given `key` exists in the given `keywords`.\n\n## Examples\n\n    iex> Keyword.has_key?([a: 1], :a)\n    true\n    iex> Keyword.has_key?([a: 1], :b)\n    false\n\n",
    },
    {
      name: "get_values/2",
      type: "function",
      specs: ["@spec get_values(t(), key()) :: [value()]"],
      documentation:
        "Gets all values under a specific `key`.\n\n## Examples\n\n    iex> Keyword.get_values([], :a)\n    []\n    iex> Keyword.get_values([a: 1], :a)\n    [1]\n    iex> Keyword.get_values([a: 1, a: 2], :a)\n    [1, 2]\n\n",
    },
    {
      name: "get_lazy/3",
      type: "function",
      specs: ["@spec get_lazy(t(), key(), (-> value())) :: value()"],
      documentation:
        "Gets the value under the given `key`.\n\nIf `key` does not exist, lazily evaluates `fun` and returns its result.\n\nThis is useful if the default value is very expensive to calculate or\ngenerally difficult to set up and tear down again.\n\nIf duplicate entries exist, it returns the first one.\nUse `get_values/2` to retrieve all entries.\n\n## Examples\n\n    iex> keyword = [a: 1]\n    iex> fun = fn ->\n    ...>   # some expensive operation here\n    ...>   13\n    ...> end\n    iex> Keyword.get_lazy(keyword, :a, fun)\n    1\n    iex> Keyword.get_lazy(keyword, :b, fun)\n    13\n\n",
    },
    {
      name: "get_and_update!/3",
      type: "function",
      specs: [
        "@spec get_and_update!(t(), key(), (value() ->\n                                     {current_value, new_value :: value()}\n                                     | :pop)) ::\n        {current_value, new_keywords :: t()}\n      when current_value: value()",
      ],
      documentation:
        'Gets the value under `key` and updates it. Raises if there is no `key`.\n\nThe `fun` argument receives the value under `key` and must return a\ntwo-element tuple: the current value (the retrieved value, which can be\noperated on before being returned) and the new value to be stored under\n`key`.\n\nReturns a tuple that contains the current value returned by\n`fun` and a new keyword list with the updated value under `key`.\n\n## Examples\n\n    iex> Keyword.get_and_update!([a: 1], :a, fn current_value ->\n    ...>   {current_value, "new value!"}\n    ...> end)\n    {1, [a: "new value!"]}\n\n    iex> Keyword.get_and_update!([a: 1], :b, fn current_value ->\n    ...>   {current_value, "new value!"}\n    ...> end)\n    ** (KeyError) key :b not found in: [a: 1]\n\n    iex> Keyword.get_and_update!([a: 1], :a, fn _ ->\n    ...>   :pop\n    ...> end)\n    {1, []}\n\n',
    },
    {
      name: "get_and_update/3",
      type: "function",
      specs: [
        "@spec get_and_update(t(), key(), (value() | nil ->\n                                    {current_value, new_value :: value()} | :pop)) ::\n        {current_value, new_keywords :: t()}\n      when current_value: value()",
      ],
      documentation:
        'Gets the value from `key` and updates it, all in one pass.\n\nThe `fun` argument receives the value of `key` (or `nil` if `key`\nis not present) and must return a two-element tuple: the current value\n(the retrieved value, which can be operated on before being returned)\nand the new value to be stored under `key`. The `fun` may also\nreturn `:pop`, implying the current value shall be removed from the\nkeyword list and returned.\n\nReturns a tuple that contains the current value returned by\n`fun` and a new keyword list with the updated value under `key`.\n\n## Examples\n\n    iex> Keyword.get_and_update([a: 1], :a, fn current_value ->\n    ...>   {current_value, "new value!"}\n    ...> end)\n    {1, [a: "new value!"]}\n\n    iex> Keyword.get_and_update([a: 1], :b, fn current_value ->\n    ...>   {current_value, "new value!"}\n    ...> end)\n    {nil, [b: "new value!", a: 1]}\n\n    iex> Keyword.get_and_update([a: 2], :a, fn number ->\n    ...>   {2 * number, 3 * number}\n    ...> end)\n    {4, [a: 6]}\n\n    iex> Keyword.get_and_update([a: 1], :a, fn _ -> :pop end)\n    {1, []}\n\n    iex> Keyword.get_and_update([a: 1], :b, fn _ -> :pop end)\n    {nil, [a: 1]}\n\n',
    },
    {
      name: "get/3",
      type: "function",
      specs: ["@spec get(t(), key(), default()) :: value() | default()"],
      documentation:
        "Gets the value under the given `key`.\n\nReturns the default value if `key` does not exist\n(`nil` if no default value is provided).\n\nIf duplicate entries exist, it returns the first one.\nUse `get_values/2` to retrieve all entries.\n\n## Examples\n\n    iex> Keyword.get([], :a)\n    nil\n    iex> Keyword.get([a: 1], :a)\n    1\n    iex> Keyword.get([a: 1], :b)\n    nil\n    iex> Keyword.get([a: 1], :b, 3)\n    3\n\nWith duplicate keys:\n\n    iex> Keyword.get([a: 1, a: 2], :a, 3)\n    1\n    iex> Keyword.get([a: 1, a: 2], :b, 3)\n    3\n\n",
    },
    {
      name: "from_keys/2",
      type: "function",
      specs: ["@spec from_keys([key()], value()) :: t(value())"],
      documentation:
        "Builds a keyword from the given `keys` and the fixed `value`.\n\n## Examples\n\n    iex> Keyword.from_keys([:foo, :bar, :baz], :atom)\n    [foo: :atom, bar: :atom, baz: :atom]\n    iex> Keyword.from_keys([], :atom)\n    []\n\n",
    },
    {
      name: "filter/2",
      type: "function",
      specs: [
        "@spec filter(t(), ({key(), value()} -> as_boolean(term()))) :: t()",
      ],
      documentation:
        "Returns a keyword list containing only the entries from `keywords`\nfor which the function `fun` returns a truthy value.\n\nSee also `reject/2` which discards all entries where the function\nreturns a truthy value.\n\n## Examples\n\n    iex> Keyword.filter([one: 1, two: 2, three: 3], fn {_key, val} -> rem(val, 2) == 1 end)\n    [one: 1, three: 3]\n\n",
    },
    {
      name: "fetch!/2",
      type: "function",
      specs: ["@spec fetch!(t(), key()) :: value()"],
      documentation:
        "Fetches the value for specific `key`.\n\nIf the `key` does not exist, it raises a `KeyError`.\n\n## Examples\n\n    iex> Keyword.fetch!([a: 1], :a)\n    1\n    iex> Keyword.fetch!([a: 1], :b)\n    ** (KeyError) key :b not found in: [a: 1]\n\n",
    },
    {
      name: "fetch/2",
      type: "function",
      specs: ["@spec fetch(t(), key()) :: {:ok, value()} | :error"],
      documentation:
        "Fetches the value for a specific `key` and returns it in a tuple.\n\nIf the `key` does not exist, it returns `:error`.\n\n## Examples\n\n    iex> Keyword.fetch([a: 1], :a)\n    {:ok, 1}\n    iex> Keyword.fetch([a: 1], :b)\n    :error\n\n",
    },
    {
      name: "equal?/2",
      type: "function",
      specs: ["@spec equal?(t(), t()) :: boolean()"],
      documentation:
        "Checks if two keywords are equal.\n\nConsiders two keywords to be equal if they contain\nthe same keys and those keys contain the same values.\n\n## Examples\n\n    iex> Keyword.equal?([a: 1, b: 2], [b: 2, a: 1])\n    true\n    iex> Keyword.equal?([a: 1, b: 2], [b: 1, a: 2])\n    false\n    iex> Keyword.equal?([a: 1, b: 2, a: 3], [b: 2, a: 3, a: 1])\n    true\n\nComparison between values is done with `===/3`,\nwhich means integers are not equivalent to floats:\n\n    iex> Keyword.equal?([a: 1.0], [a: 1])\n    false\n\n",
    },
    {
      name: "drop/2",
      type: "function",
      specs: ["@spec drop(t(), [key()]) :: t()"],
      documentation:
        "Drops the given `keys` from the keyword list.\n\nRemoves duplicate keys from the new keyword list.\n\n## Examples\n\n    iex> Keyword.drop([a: 1, a: 2], [:a])\n    []\n    iex> Keyword.drop([a: 1, b: 2, c: 3], [:b, :d])\n    [a: 1, c: 3]\n    iex> Keyword.drop([a: 1, b: 2, b: 3, c: 3, a: 5], [:b, :d])\n    [a: 1, c: 3, a: 5]\n\n",
    },
    {
      name: "delete_first/2",
      type: "function",
      specs: ["@spec delete_first(t(), key()) :: t()"],
      documentation:
        "Deletes the first entry in the keyword list under a specific `key`.\n\nIf the `key` does not exist, it returns the keyword list unchanged.\n\n## Examples\n\n    iex> Keyword.delete_first([a: 1, b: 2, a: 3], :a)\n    [b: 2, a: 3]\n    iex> Keyword.delete_first([b: 2], :a)\n    [b: 2]\n\n",
    },
    {
      name: "delete/2",
      type: "function",
      specs: ["@spec delete(t(), key()) :: t()"],
      documentation:
        "Deletes the entries in the keyword list under a specific `key`.\n\nIf the `key` does not exist, it returns the keyword list unchanged.\nUse `delete_first/2` to delete just the first entry in case of\nduplicate keys.\n\n## Examples\n\n    iex> Keyword.delete([a: 1, b: 2], :a)\n    [b: 2]\n    iex> Keyword.delete([a: 1, b: 2, a: 3], :a)\n    [b: 2]\n    iex> Keyword.delete([b: 2], :a)\n    [b: 2]\n\n",
    },
  ],
  name: "Keyword",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "t/1",
      type: "type",
      specs: [
        "@type t() :: [{key(), value()}]",
        "@type t(value) :: [{key(), value}]",
      ],
      documentation: null,
    },
    {
      name: "t/0",
      type: "type",
      specs: [
        "@type t() :: [{key(), value()}]",
        "@type t(value) :: [{key(), value}]",
      ],
      documentation: null,
    },
    {
      name: "default/0",
      type: "type",
      specs: ["@type default() :: any()"],
      documentation: null,
    },
    {
      name: "value/0",
      type: "type",
      specs: ["@type value() :: any()"],
      documentation: null,
    },
    {
      name: "key/0",
      type: "type",
      specs: ["@type key() :: atom()"],
      documentation: null,
    },
  ],
};
