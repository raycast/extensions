import type { ModuleDoc } from "../types";

export const Map: ModuleDoc = {
  functions: [
    {
      name: "values/1",
      type: "function",
      specs: ["@spec values(map()) :: [value()]"],
      documentation:
        "Returns all values from `map`.\n\nInlined by the compiler.\n\n## Examples\n\n    Map.values(%{a: 1, b: 2})\n    [1, 2]\n\n",
    },
    {
      name: "update!/3",
      type: "function",
      specs: [
        "@spec update!(map(), key(), (existing_value :: value() -> new_value :: value())) ::\n        map()",
      ],
      documentation:
        "Updates `key` with the given function.\n\nIf `key` is present in `map` then the existing value is passed to `fun` and its result is\nused as the updated value of `key`. If `key` is\nnot present in `map`, a `KeyError` exception is raised.\n\n## Examples\n\n    iex> Map.update!(%{a: 1}, :a, &(&1 * 2))\n    %{a: 2}\n\n    iex> Map.update!(%{a: 1}, :b, &(&1 * 2))\n    ** (KeyError) key :b not found in: %{a: 1}\n\n",
    },
    {
      name: "update/4",
      type: "function",
      specs: [
        "@spec update(map(), key(), default :: value(), (existing_value :: value() ->\n                                                  new_value :: value())) ::\n        map()",
      ],
      documentation:
        "Updates the `key` in `map` with the given function.\n\nIf `key` is present in `map` then the existing value is passed to `fun` and its result is\nused as the updated value of `key`. If `key` is\nnot present in `map`, `default` is inserted as the value of `key`. The default\nvalue will not be passed through the update function.\n\n## Examples\n\n    iex> Map.update(%{a: 1}, :a, 13, fn existing_value -> existing_value * 2 end)\n    %{a: 2}\n    iex> Map.update(%{a: 1}, :b, 11, fn existing_value -> existing_value * 2 end)\n    %{a: 1, b: 11}\n\n",
    },
    {
      name: "to_list/1",
      type: "function",
      specs: ["@spec to_list(map()) :: [{term(), term()}]"],
      documentation:
        "Converts `map` to a list.\n\nEach key-value pair in the map is converted to a two-element tuple `{key,\nvalue}` in the resulting list.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> Map.to_list(%{a: 1})\n    [a: 1]\n    iex> Map.to_list(%{1 => 2})\n    [{1, 2}]\n\n",
    },
    {
      name: "take/2",
      type: "function",
      specs: ["@spec take(map(), [key()]) :: map()"],
      documentation:
        "Returns a new map with all the key-value pairs in `map` where the key\nis in `keys`.\n\nIf `keys` contains keys that are not in `map`, they're simply ignored.\n\n## Examples\n\n    iex> Map.take(%{a: 1, b: 2, c: 3}, [:a, :c, :e])\n    %{a: 1, c: 3}\n\n",
    },
    {
      name: "split_with/2",
      type: "function",
      specs: [
        "@spec split_with(map(), ({key(), value()} -> as_boolean(term()))) ::\n        {map(), map()}",
      ],
      documentation:
        "Splits the `map` into two maps according to the given function `fun`.\n\n`fun` receives each `{key, value}` pair in the `map` as its only argument. Returns\na tuple with the first map containing all the elements in `map` for which\napplying `fun` returned a truthy value, and a second map with all the elements\nfor which applying `fun` returned a falsy value (`false` or `nil`).\n\n## Examples\n\n    iex> Map.split_with(%{a: 1, b: 2, c: 3, d: 4}, fn {_k, v} -> rem(v, 2) == 0 end)\n    {%{b: 2, d: 4}, %{a: 1, c: 3}}\n\n    iex> Map.split_with(%{a: 1, b: -2, c: 1, d: -3}, fn {k, _v} -> k in [:b, :d] end)\n    {%{b: -2, d: -3}, %{a: 1, c: 1}}\n\n    iex> Map.split_with(%{a: 1, b: -2, c: 1, d: -3}, fn {_k, v} -> v > 50 end)\n    {%{}, %{a: 1, b: -2, c: 1, d: -3}}\n\n    iex> Map.split_with(%{}, fn {_k, v} -> v > 50 end)\n    {%{}, %{}}\n\n",
    },
    {
      name: "split/2",
      type: "function",
      specs: ["@spec split(map(), [key()]) :: {map(), map()}"],
      documentation:
        "Takes all entries corresponding to the given `keys` in `map` and extracts\nthem into a separate map.\n\nReturns a tuple with the new map and the old map with removed keys.\n\nKeys for which there are no entries in `map` are ignored.\n\n## Examples\n\n    iex> Map.split(%{a: 1, b: 2, c: 3}, [:a, :c, :e])\n    {%{a: 1, c: 3}, %{b: 2}}\n\n",
    },
    {
      name: "replace_lazy/3",
      type: "function",
      specs: [
        "@spec replace_lazy(map(), key(), (existing_value :: value() ->\n                                    new_value :: value())) :: map()",
      ],
      documentation:
        "Replaces the value under `key` using the given function only if\n`key` already exists in `map`.\n\nIn comparison to `replace/3`, this can be useful when it's expensive to calculate the value.\n\nIf `key` does not exist, the original map is returned unchanged.\n\n## Examples\n\n    iex> Map.replace_lazy(%{a: 1, b: 2}, :a, fn v -> v * 4 end)\n    %{a: 4, b: 2}\n\n    iex> Map.replace_lazy(%{a: 1, b: 2}, :c, fn v -> v * 4 end)\n    %{a: 1, b: 2}\n\n",
    },
    {
      name: "replace!/3",
      type: "function",
      specs: ["@spec replace!(map(), key(), value()) :: map()"],
      documentation:
        "Puts a value under `key` only if the `key` already exists in `map`.\n\nIf `key` is not present in `map`, a `KeyError` exception is raised.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> Map.replace!(%{a: 1, b: 2}, :a, 3)\n    %{a: 3, b: 2}\n\n    iex> Map.replace!(%{a: 1}, :b, 2)\n    ** (KeyError) key :b not found in: %{a: 1}\n\n",
    },
    {
      name: "replace/3",
      type: "function",
      specs: ["@spec replace(map(), key(), value()) :: map()"],
      documentation:
        "Puts a value under `key` only if the `key` already exists in `map`.\n\n## Examples\n\n    iex> Map.replace(%{a: 1, b: 2}, :a, 3)\n    %{a: 3, b: 2}\n\n    iex> Map.replace(%{a: 1}, :b, 2)\n    %{a: 1}\n\n",
    },
    {
      name: "reject/2",
      type: "function",
      specs: [
        "@spec reject(map(), ({key(), value()} -> as_boolean(term()))) :: map()",
      ],
      documentation:
        "Returns map excluding the pairs from `map` for which `fun` returns\na truthy value.\n\nSee also `filter/2`.\n\n## Examples\n\n    iex> Map.reject(%{one: 1, two: 2, three: 3}, fn {_key, val} -> rem(val, 2) == 1 end)\n    %{two: 2}\n\n",
    },
    {
      name: "put_new_lazy/3",
      type: "function",
      specs: ["@spec put_new_lazy(map(), key(), (-> value())) :: map()"],
      documentation:
        "Evaluates `fun` and puts the result under `key`\nin `map` unless `key` is already present.\n\nThis function is useful in case you want to compute the value to put under\n`key` only if `key` is not already present, as for example, when the value is expensive to\ncalculate or generally difficult to setup and teardown again.\n\n## Examples\n\n    iex> map = %{a: 1}\n    iex> fun = fn ->\n    ...>   # some expensive operation here\n    ...>   3\n    ...> end\n    iex> Map.put_new_lazy(map, :a, fun)\n    %{a: 1}\n    iex> Map.put_new_lazy(map, :b, fun)\n    %{a: 1, b: 3}\n\n",
    },
    {
      name: "put_new/3",
      type: "function",
      specs: ["@spec put_new(map(), key(), value()) :: map()"],
      documentation:
        "Puts the given `value` under `key` unless the entry `key`\nalready exists in `map`.\n\n## Examples\n\n    iex> Map.put_new(%{a: 1}, :b, 2)\n    %{a: 1, b: 2}\n    iex> Map.put_new(%{a: 1, b: 2}, :a, 3)\n    %{a: 1, b: 2}\n\n",
    },
    {
      name: "put/3",
      type: "function",
      specs: ["@spec put(map(), key(), value()) :: map()"],
      documentation:
        "Puts the given `value` under `key` in `map`.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> Map.put(%{a: 1}, :b, 2)\n    %{a: 1, b: 2}\n    iex> Map.put(%{a: 1, b: 2}, :a, 3)\n    %{a: 3, b: 2}\n\n",
    },
    {
      name: "pop_lazy/3",
      type: "function",
      specs: ["@spec pop_lazy(map(), key(), (-> value())) :: {value(), map()}"],
      documentation:
        "Lazily returns and removes the value associated with `key` in `map`.\n\nIf `key` is present in `map`, it returns `{value, new_map}` where `value` is the value of\nthe key and `new_map` is the result of removing `key` from `map`. If `key`\nis not present in `map`, `{fun_result, map}` is returned, where `fun_result`\nis the result of applying `fun`.\n\nThis is useful if the default value is very expensive to calculate or\ngenerally difficult to setup and teardown again.\n\n## Examples\n\n    iex> map = %{a: 1}\n    iex> fun = fn ->\n    ...>   # some expensive operation here\n    ...>   13\n    ...> end\n    iex> Map.pop_lazy(map, :a, fun)\n    {1, %{}}\n    iex> Map.pop_lazy(map, :b, fun)\n    {13, %{a: 1}}\n\n",
    },
    {
      name: "pop!/2",
      type: "function",
      specs: ["@spec pop!(map(), key()) :: {value(), updated_map :: map()}"],
      documentation:
        "Removes the value associated with `key` in `map` and returns the value\nand the updated map, or it raises if `key` is not present.\n\nBehaves the same as `pop/3` but raises if `key` is not present in `map`.\n\n## Examples\n\n    iex> Map.pop!(%{a: 1}, :a)\n    {1, %{}}\n    iex> Map.pop!(%{a: 1, b: 2}, :a)\n    {1, %{b: 2}}\n    iex> Map.pop!(%{a: 1}, :b)\n    ** (KeyError) key :b not found in: %{a: 1}\n\n",
    },
    {
      name: "pop/3",
      type: "function",
      specs: [
        "@spec pop(map(), key(), default) ::\n        {value(), updated_map :: map()} | {default, map()}\n      when default: value()",
      ],
      documentation:
        "Removes the value associated with `key` in `map` and returns the value and the updated map.\n\nIf `key` is present in `map`, it returns `{value, updated_map}` where `value` is the value of\nthe key and `updated_map` is the result of removing `key` from `map`. If `key`\nis not present in `map`, `{default, map}` is returned.\n\n## Examples\n\n    iex> Map.pop(%{a: 1}, :a)\n    {1, %{}}\n    iex> Map.pop(%{a: 1}, :b)\n    {nil, %{a: 1}}\n    iex> Map.pop(%{a: 1}, :b, 3)\n    {3, %{a: 1}}\n\n",
    },
    {
      name: "new/2",
      type: "function",
      specs: [
        "@spec new(Enumerable.t(), (term() -> {key(), value()})) :: map()",
      ],
      documentation:
        "Creates a map from an `enumerable` via the given transformation function.\n\nDuplicated keys are removed; the latest one prevails.\n\n## Examples\n\n    iex> Map.new([:a, :b], fn x -> {x, x} end)\n    %{a: :a, b: :b}\n\n    iex> Map.new(%{a: 2, b: 3, c: 4}, fn {key, val} -> {key, val * 2} end)\n    %{a: 4, b: 6, c: 8}\n\n",
    },
    {
      name: "new/1",
      type: "function",
      specs: ["@spec new(Enumerable.t()) :: map()"],
      documentation:
        "Creates a map from an `enumerable`.\n\nDuplicated keys are removed; the latest one prevails.\n\n## Examples\n\n    iex> Map.new([{:b, 1}, {:a, 2}])\n    %{a: 2, b: 1}\n    iex> Map.new(a: 1, a: 2, a: 3)\n    %{a: 3}\n\n",
    },
    {
      name: "new/0",
      type: "function",
      specs: ["@spec new() :: map()"],
      documentation:
        "Returns a new empty map.\n\n## Examples\n\n    iex> Map.new()\n    %{}\n\n",
    },
    {
      name: "merge/3",
      type: "function",
      specs: [
        "@spec merge(map(), map(), (key(), value(), value() -> value())) :: map()",
      ],
      documentation:
        "Merges two maps into one, resolving conflicts through the given `fun`.\n\nAll keys in `map2` will be added to `map1`. The given function will be invoked\nwhen there are duplicate keys; its arguments are `key` (the duplicate key),\n`value1` (the value of `key` in `map1`), and `value2` (the value of `key` in\n`map2`). The value returned by `fun` is used as the value under `key` in\nthe resulting map.\n\n## Examples\n\n    iex> Map.merge(%{a: 1, b: 2}, %{a: 3, d: 4}, fn _k, v1, v2 ->\n    ...>   v1 + v2\n    ...> end)\n    %{a: 4, b: 2, d: 4}\n\n",
    },
    {
      name: "merge/2",
      type: "function",
      specs: ["@spec merge(map(), map()) :: map()"],
      documentation:
        'Merges two maps into one.\n\nAll keys in `map2` will be added to `map1`, overriding any existing one\n(i.e., the keys in `map2` "have precedence" over the ones in `map1`).\n\nIf you have a struct and you would like to merge a set of keys into the\nstruct, do not use this function, as it would merge all keys on the right\nside into the struct, even if the key is not part of the struct. Instead,\nuse `struct/2`.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> Map.merge(%{a: 1, b: 2}, %{a: 3, d: 4})\n    %{a: 3, b: 2, d: 4}\n\n',
    },
    {
      name: "keys/1",
      type: "function",
      specs: ["@spec keys(map()) :: [key()]"],
      documentation:
        "Returns all keys from `map`.\n\nInlined by the compiler.\n\n## Examples\n\n    Map.keys(%{a: 1, b: 2})\n    [:a, :b]\n\n",
    },
    {
      name: "intersect/3",
      type: "function",
      specs: [
        "@spec intersect(map(), map(), (key(), value(), value() -> value())) :: map()",
      ],
      documentation:
        "Intersects two maps, returning a map with the common keys and resolving conflicts through a function.\n\nThe given function will be invoked when there are duplicate keys; its\narguments are `key` (the duplicate key), `value1` (the value of `key` in\n`map1`), and `value2` (the value of `key` in `map2`). The value returned by\n`fun` is used as the value under `key` in the resulting map.\n\n## Examples\n\n    iex> Map.intersect(%{a: 1, b: 2}, %{b: 2, c: 3}, fn _k, v1, v2 ->\n    ...>   v1 + v2\n    ...> end)\n    %{b: 4}\n",
    },
    {
      name: "intersect/2",
      type: "function",
      specs: ["@spec intersect(map(), map()) :: map()"],
      documentation:
        'Intersects two maps, returning a map with the common keys.\n\nThe values in the returned map are the values of the intersected keys in `map2`.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> Map.intersect(%{a: 1, b: 2}, %{b: "b", c: "c"})\n    %{b: "b"}\n\n',
    },
    {
      name: "has_key?/2",
      type: "function",
      specs: ["@spec has_key?(map(), key()) :: boolean()"],
      documentation:
        "Returns whether the given `key` exists in the given `map`.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> Map.has_key?(%{a: 1}, :a)\n    true\n    iex> Map.has_key?(%{a: 1}, :b)\n    false\n\n",
    },
    {
      name: "get_lazy/3",
      type: "function",
      specs: ["@spec get_lazy(map(), key(), (-> value())) :: value()"],
      documentation:
        "Gets the value for a specific `key` in `map`.\n\nIf `key` is present in `map` then its value `value` is\nreturned. Otherwise, `fun` is evaluated and its result is returned.\n\nThis is useful if the default value is very expensive to calculate or\ngenerally difficult to setup and teardown again.\n\n## Examples\n\n    iex> map = %{a: 1}\n    iex> fun = fn ->\n    ...>   # some expensive operation here\n    ...>   13\n    ...> end\n    iex> Map.get_lazy(map, :a, fun)\n    1\n    iex> Map.get_lazy(map, :b, fun)\n    13\n\n",
    },
    {
      name: "get_and_update!/3",
      type: "function",
      specs: [
        "@spec get_and_update!(map(), key(), (value() ->\n                                       {current_value, new_value :: value()}\n                                       | :pop)) :: {current_value, map()}\n      when current_value: value()",
      ],
      documentation:
        'Gets the value from `key` and updates it, all in one pass. Raises if there is no `key`.\n\nBehaves exactly like `get_and_update/3`, but raises a `KeyError` exception if\n`key` is not present in `map`.\n\n## Examples\n\n    iex> Map.get_and_update!(%{a: 1}, :a, fn current_value ->\n    ...>   {current_value, "new value!"}\n    ...> end)\n    {1, %{a: "new value!"}}\n\n    iex> Map.get_and_update!(%{a: 1}, :b, fn current_value ->\n    ...>   {current_value, "new value!"}\n    ...> end)\n    ** (KeyError) key :b not found in: %{a: 1}\n\n    iex> Map.get_and_update!(%{a: 1}, :a, fn _ ->\n    ...>   :pop\n    ...> end)\n    {1, %{}}\n\n',
    },
    {
      name: "get_and_update/3",
      type: "function",
      specs: [
        "@spec get_and_update(map(), key(), (value() | nil ->\n                                      {current_value, new_value :: value()}\n                                      | :pop)) ::\n        {current_value, new_map :: map()}\n      when current_value: value()",
      ],
      documentation:
        'Gets the value from `key` and updates it, all in one pass.\n\n`fun` is called with the current value under `key` in `map` (or `nil` if `key`\nis not present in `map`) and must return a two-element tuple: the current value\n(the retrieved value, which can be operated on before being returned) and the\nnew value to be stored under `key` in the resulting new map. `fun` may also\nreturn `:pop`, which means the current value shall be removed from `map` and\nreturned (making this function behave like `Map.pop(map, key)`).\n\nThe returned value is a two-element tuple with the current value returned by\n`fun` and a new map with the updated value under `key`.\n\n## Examples\n\n    iex> Map.get_and_update(%{a: 1}, :a, fn current_value ->\n    ...>   {current_value, "new value!"}\n    ...> end)\n    {1, %{a: "new value!"}}\n\n    iex> Map.get_and_update(%{a: 1}, :b, fn current_value ->\n    ...>   {current_value, "new value!"}\n    ...> end)\n    {nil, %{a: 1, b: "new value!"}}\n\n    iex> Map.get_and_update(%{a: 1}, :a, fn _ -> :pop end)\n    {1, %{}}\n\n    iex> Map.get_and_update(%{a: 1}, :b, fn _ -> :pop end)\n    {nil, %{a: 1}}\n\n',
    },
    {
      name: "get/3",
      type: "function",
      specs: ["@spec get(map(), key(), value()) :: value()"],
      documentation:
        "Gets the value for a specific `key` in `map`.\n\nIf `key` is present in `map` then its value `value` is\nreturned. Otherwise, `default` is returned.\n\nIf `default` is not provided, `nil` is used.\n\n## Examples\n\n    iex> Map.get(%{}, :a)\n    nil\n    iex> Map.get(%{a: 1}, :a)\n    1\n    iex> Map.get(%{a: 1}, :b)\n    nil\n    iex> Map.get(%{a: 1}, :b, 3)\n    3\n    iex> Map.get(%{a: nil}, :a, 1)\n    nil\n\n",
    },
    {
      name: "from_struct/1",
      type: "function",
      specs: ["@spec from_struct(atom() | struct()) :: map()"],
      documentation:
        'Converts a `struct` to map.\n\nIt accepts the struct module or a struct itself and\nsimply removes the `__struct__` field from the given struct\nor from a new struct generated from the given module.\n\n## Example\n\n    defmodule User do\n      defstruct [:name]\n    end\n\n    Map.from_struct(User)\n    #=> %{name: nil}\n\n    Map.from_struct(%User{name: "john"})\n    #=> %{name: "john"}\n\n',
    },
    {
      name: "from_keys/2",
      type: "function",
      specs: ["@spec from_keys([key()], value()) :: map()"],
      documentation:
        "Builds a map from the given `keys` and the fixed `value`.\n\n## Examples\n\n    iex> Map.from_keys([1, 2, 3], :number)\n    %{1 => :number, 2 => :number, 3 => :number}\n\n",
    },
    {
      name: "filter/2",
      type: "function",
      specs: [
        "@spec filter(map(), ({key(), value()} -> as_boolean(term()))) :: map()",
      ],
      documentation:
        "Returns a map containing only those pairs from `map`\nfor which `fun` returns a truthy value.\n\n`fun` receives the key and value of each of the\nelements in the map as a key-value pair.\n\nSee also `reject/2` which discards all elements where the\nfunction returns a truthy value.\n\n> #### Performance considerations {: .tip}\n>\n> If you find yourself doing multiple calls to `Map.filter/2`\n> and `Map.reject/2` in a pipeline, it is likely more efficient\n> to use `Enum.map/2` and `Enum.filter/2` instead and convert to\n> a map at the end using `Map.new/1`.\n\n## Examples\n\n    iex> Map.filter(%{one: 1, two: 2, three: 3}, fn {_key, val} -> rem(val, 2) == 1 end)\n    %{one: 1, three: 3}\n\n",
    },
    {
      name: "fetch!/2",
      type: "function",
      specs: ["@spec fetch!(map(), key()) :: value()"],
      documentation:
        "Fetches the value for a specific `key` in the given `map`, erroring out if\n`map` doesn't contain `key`.\n\nIf `map` contains `key`, the corresponding value is returned. If\n`map` doesn't contain `key`, a `KeyError` exception is raised.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> Map.fetch!(%{a: 1}, :a)\n    1\n\n",
    },
    {
      name: "fetch/2",
      type: "function",
      specs: ["@spec fetch(map(), key()) :: {:ok, value()} | :error"],
      documentation:
        "Fetches the value for a specific `key` in the given `map`.\n\nIf `map` contains the given `key` then its value is returned in the shape of `{:ok, value}`.\nIf `map` doesn't contain `key`, `:error` is returned.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> Map.fetch(%{a: 1}, :a)\n    {:ok, 1}\n    iex> Map.fetch(%{a: 1}, :b)\n    :error\n\n",
    },
    {
      name: "equal?/2",
      type: "function",
      specs: ["@spec equal?(map(), map()) :: boolean()"],
      documentation:
        "Checks if two maps are equal.\n\nTwo maps are considered to be equal if they contain\nthe same keys and those keys contain the same values.\n\nNote this function exists for completeness so the `Map`\nand `Keyword` modules provide similar APIs. In practice,\ndevelopers often compare maps using `==/2` or `===/2`\ndirectly.\n\n## Examples\n\n    iex> Map.equal?(%{a: 1, b: 2}, %{b: 2, a: 1})\n    true\n    iex> Map.equal?(%{a: 1, b: 2}, %{b: 1, a: 2})\n    false\n\nComparison between keys and values is done with `===/3`,\nwhich means integers are not equivalent to floats:\n\n    iex> Map.equal?(%{a: 1.0}, %{a: 1})\n    false\n\n",
    },
    {
      name: "drop/2",
      type: "function",
      specs: ["@spec drop(map(), [key()]) :: map()"],
      documentation:
        "Drops the given `keys` from `map`.\n\nIf `keys` contains keys that are not in `map`, they're simply ignored.\n\n## Examples\n\n    iex> Map.drop(%{a: 1, b: 2, c: 3}, [:b, :d])\n    %{a: 1, c: 3}\n\n",
    },
    {
      name: "delete/2",
      type: "function",
      specs: ["@spec delete(map(), key()) :: map()"],
      documentation:
        "Deletes the entry in `map` for a specific `key`.\n\nIf the `key` does not exist, returns `map` unchanged.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> Map.delete(%{a: 1, b: 2}, :a)\n    %{b: 2}\n    iex> Map.delete(%{b: 2}, :a)\n    %{b: 2}\n\n",
    },
  ],
  name: "Map",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "value/0",
      type: "type",
      specs: ["@type value() :: any()"],
      documentation: null,
    },
    {
      name: "key/0",
      type: "type",
      specs: ["@type key() :: any()"],
      documentation: null,
    },
  ],
};
