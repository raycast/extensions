import type { ModuleDoc } from "../types";

export const List: ModuleDoc = {
  functions: [
    {
      name: "zip/1",
      type: "function",
      specs: ["@spec zip([list()]) :: [tuple()]"],
      documentation:
        "Zips corresponding elements from each list in `list_of_lists`.\n\nThe zipping finishes as soon as any list terminates.\n\n## Examples\n\n    iex> List.zip([[1, 2], [3, 4], [5, 6]])\n    [{1, 3, 5}, {2, 4, 6}]\n\n    iex> List.zip([[1, 2], [3], [5, 6]])\n    [{1, 3, 5}]\n\n",
    },
    {
      name: "wrap/1",
      type: "function",
      specs: ["@spec wrap(term()) :: maybe_improper_list()"],
      documentation:
        'Wraps `term` in a list if this is not list.\n\nIf `term` is already a list, it returns the list.\nIf `term` is `nil`, it returns an empty list.\n\n## Examples\n\n    iex> List.wrap("hello")\n    ["hello"]\n\n    iex> List.wrap([1, 2, 3])\n    [1, 2, 3]\n\n    iex> List.wrap(nil)\n    []\n\n',
    },
    {
      name: "update_at/3",
      type: "function",
      specs: [
        "@spec update_at([elem], integer(), (elem -> any())) :: list() when elem: var",
      ],
      documentation:
        "Returns a list with an updated value at the specified `index`.\n\nNegative indices indicate an offset from the end of the `list`.\nIf `index` is out of bounds, the original `list` is returned.\n\n## Examples\n\n    iex> List.update_at([1, 2, 3], 0, &(&1 + 10))\n    [11, 2, 3]\n\n    iex> List.update_at([1, 2, 3], 10, &(&1 + 10))\n    [1, 2, 3]\n\n    iex> List.update_at([1, 2, 3], -1, &(&1 + 10))\n    [1, 2, 13]\n\n    iex> List.update_at([1, 2, 3], -10, &(&1 + 10))\n    [1, 2, 3]\n\n",
    },
    {
      name: "to_tuple/1",
      type: "function",
      specs: ["@spec to_tuple(list()) :: tuple()"],
      documentation:
        "Converts a list to a tuple.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> List.to_tuple([:share, [:elixir, 163]])\n    {:share, [:elixir, 163]}\n\n",
    },
    {
      name: "to_string/1",
      type: "function",
      specs: ["@spec to_string(:unicode.charlist()) :: String.t()"],
      documentation:
        'Converts a list of integers representing code points, lists or\nstrings into a string.\n\nTo be converted to a string, a list must either be empty or only\ncontain the following elements:\n\n  * strings\n  * integers representing Unicode code points\n  * a list containing one of these three elements\n\nNote that this function expects a list of integers representing\nUnicode code points. If you have a list of bytes, you must instead use\nthe [`:binary` module](`:binary`).\n\n## Examples\n\n    iex> List.to_string([0x00E6, 0x00DF])\n    "æß"\n\n    iex> List.to_string([0x0061, "bc"])\n    "abc"\n\n    iex> List.to_string([0x0064, "ee", [~c"p"]])\n    "deep"\n\n    iex> List.to_string([])\n    ""\n\n',
    },
    {
      name: "to_integer/2",
      type: "function",
      specs: [
        "@spec to_integer(\n        charlist(),\n        2..36\n      ) :: integer()",
      ],
      documentation:
        'Returns an integer whose text representation is `charlist` in base `base`.\n\nInlined by the compiler.\n\nThe base needs to be between `2` and `36`.\n\n## Examples\n\n    iex> List.to_integer(~c"3FF", 16)\n    1023\n\n',
    },
    {
      name: "to_integer/1",
      type: "function",
      specs: ["@spec to_integer(charlist()) :: integer()"],
      documentation:
        'Returns an integer whose text representation is `charlist`.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> List.to_integer(~c"123")\n    123\n\n',
    },
    {
      name: "to_float/1",
      type: "function",
      specs: ["@spec to_float(charlist()) :: float()"],
      documentation:
        'Returns the float whose text representation is `charlist`.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> List.to_float(~c"2.2017764e+0")\n    2.2017764\n\n',
    },
    {
      name: "to_existing_atom/1",
      type: "function",
      specs: ["@spec to_existing_atom(charlist()) :: atom()"],
      documentation:
        'Converts a charlist to an existing atom.\n\nElixir supports conversions from charlists which contain any Unicode\ncode point. Raises an `ArgumentError` if the atom does not exist.\n\nInlined by the compiler.\n\n> #### Atoms and modules {: .info}\n>\n> Since Elixir is a compiled language, the atoms defined in a module\n> will only exist after said module is loaded, which typically happens\n> whenever a function in the module is executed. Therefore, it is\n> generally recommended to call `List.to_existing_atom/1` only to\n> convert atoms defined within the module making the function call\n> to `to_existing_atom/1`.\n\n## Examples\n\n    iex> _ = :my_atom\n    iex> List.to_existing_atom(~c"my_atom")\n    :my_atom\n\n    iex> _ = :"🌢 Elixir"\n    iex> List.to_existing_atom(~c"🌢 Elixir")\n    :"🌢 Elixir"\n\n',
    },
    {
      name: "to_charlist/1",
      type: "function",
      specs: ["@spec to_charlist(:unicode.charlist()) :: charlist()"],
      documentation:
        'Converts a list of integers representing Unicode code points, lists or\nstrings into a charlist.\n\nNote that this function expects a list of integers representing\nUnicode code points. If you have a list of bytes, you must instead use\nthe [`:binary` module](`:binary`).\n\n## Examples\n\n    iex> ~c"æß" = List.to_charlist([0x00E6, 0x00DF])\n    [230, 223]\n\n    iex> List.to_charlist([0x0061, "bc"])\n    ~c"abc"\n\n    iex> List.to_charlist([0x0064, "ee", [~c"p"]])\n    ~c"deep"\n\n',
    },
    {
      name: "to_atom/1",
      type: "function",
      specs: ["@spec to_atom(charlist()) :: atom()"],
      documentation:
        'Converts a charlist to an atom.\n\nElixir supports conversions from charlists which contain any Unicode\ncode point.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> List.to_atom(~c"Elixir")\n    :Elixir\n\n    iex> List.to_atom(~c"🌢 Elixir")\n    :"🌢 Elixir"\n\n',
    },
    {
      name: "starts_with?/2",
      type: "function",
      specs: [
        "@spec starts_with?([...], [...]) :: boolean()",
        "@spec starts_with?(list(), []) :: true",
        "@spec starts_with?([], [...]) :: false",
      ],
      documentation:
        "Returns `true` if `list` starts with the given `prefix` list, otherwise returns `false`.\n\nIf `prefix` is an empty list, it returns `true`.\n\n### Examples\n\n    iex> List.starts_with?([1, 2, 3], [1, 2])\n    true\n\n    iex> List.starts_with?([1, 2], [1, 2, 3])\n    false\n\n    iex> List.starts_with?([:alpha], [])\n    true\n\n    iex> List.starts_with?([], [:alpha])\n    false\n\n",
    },
    {
      name: "replace_at/3",
      type: "function",
      specs: ["@spec replace_at(list(), integer(), any()) :: list()"],
      documentation:
        "Returns a list with a replaced value at the specified `index`.\n\nNegative indices indicate an offset from the end of the `list`.\nIf `index` is out of bounds, the original `list` is returned.\n\n## Examples\n\n    iex> List.replace_at([1, 2, 3], 0, 0)\n    [0, 2, 3]\n\n    iex> List.replace_at([1, 2, 3], 10, 0)\n    [1, 2, 3]\n\n    iex> List.replace_at([1, 2, 3], -1, 0)\n    [1, 2, 0]\n\n    iex> List.replace_at([1, 2, 3], -10, 0)\n    [1, 2, 3]\n\n",
    },
    {
      name: "pop_at/3",
      type: "function",
      specs: ["@spec pop_at(list(), integer(), any()) :: {any(), list()}"],
      documentation:
        "Returns and removes the value at the specified `index` in the `list`.\n\nNegative indices indicate an offset from the end of the `list`.\nIf `index` is out of bounds, the original `list` is returned.\n\n## Examples\n\n    iex> List.pop_at([1, 2, 3], 0)\n    {1, [2, 3]}\n    iex> List.pop_at([1, 2, 3], 5)\n    {nil, [1, 2, 3]}\n    iex> List.pop_at([1, 2, 3], 5, 10)\n    {10, [1, 2, 3]}\n    iex> List.pop_at([1, 2, 3], -1)\n    {3, [1, 2]}\n\n",
    },
    {
      name: "myers_difference/3",
      type: "function",
      specs: [
        "@spec myers_difference(list(), list(), (term(), term() -> script | nil)) ::\n        script\n      when script: [{:eq | :ins | :del | :diff, list()}]",
      ],
      documentation:
        'Returns a keyword list that represents an *edit script* with nested diffs.\n\nThis is an extension of `myers_difference/2` where a `diff_script` function\ncan be given in case it is desired to compute nested differences. The function\nmay return a list with the inner edit script or `nil` in case there is no\nsuch script. The returned inner edit script will be under the `:diff` key.\n\n## Examples\n\n    iex> List.myers_difference(["a", "db", "c"], ["a", "bc"], &String.myers_difference/2)\n    [eq: ["a"], diff: [del: "d", eq: "b", ins: "c"], del: ["c"]]\n\n',
    },
    {
      name: "myers_difference/2",
      type: "function",
      specs: [
        "@spec myers_difference(list(), list()) :: [{:eq | :ins | :del, list()}]",
      ],
      documentation:
        'Returns a keyword list that represents an *edit script*.\n\nThe algorithm is outlined in the\n"An O(ND) Difference Algorithm and Its Variations" paper by E. Myers.\n\nAn *edit script* is a keyword list. Each key describes the "editing action" to\ntake in order to bring `list1` closer to being equal to `list2`; a key can be\n`:eq`, `:ins`, or `:del`. Each value is a sublist of either `list1` or `list2`\nthat should be inserted (if the corresponding key is `:ins`), deleted (if the\ncorresponding key is `:del`), or left alone (if the corresponding key is\n`:eq`) in `list1` in order to be closer to `list2`.\n\nSee `myers_difference/3` if you want to handle nesting in the diff scripts.\n\n## Examples\n\n    iex> List.myers_difference([1, 4, 2, 3], [1, 2, 3, 4])\n    [eq: [1], del: [4], eq: [2, 3], ins: [4]]\n\n',
    },
    {
      name: "last/2",
      type: "function",
      specs: [
        "@spec last([], any()) :: any()",
        "@spec last([elem, ...], any()) :: elem when elem: var",
      ],
      documentation:
        "Returns the last element in `list` or `default` if `list` is empty.\n\n`last/2` has been introduced in Elixir v1.12.0, while `last/1` has been available since v1.0.0.\n\n## Examples\n\n    iex> List.last([])\n    nil\n\n    iex> List.last([], 1)\n    1\n\n    iex> List.last([1])\n    1\n\n    iex> List.last([1, 2, 3])\n    3\n\n",
    },
    {
      name: "keytake/3",
      type: "function",
      specs: [
        "@spec keytake([tuple()], any(), non_neg_integer()) :: {tuple(), [tuple()]} | nil",
      ],
      documentation:
        'Receives a `list` of tuples and returns the first tuple\nwhere the element at `position` in the tuple matches the\ngiven `key`, as well as the `list` without found tuple.\n\nIf such a tuple is not found, `nil` will be returned.\n\n## Examples\n\n    iex> List.keytake([a: 1, b: 2], :a, 0)\n    {{:a, 1}, [b: 2]}\n\n    iex> List.keytake([a: 1, b: 2], 2, 1)\n    {{:b, 2}, [a: 1]}\n\n    iex> List.keytake([a: 1, b: 2], :c, 0)\n    nil\n\nThis function works for any list of tuples:\n\n    iex> List.keytake([{22, "SSH"}, {80, "HTTP"}], 80, 0)\n    {{80, "HTTP"}, [{22, "SSH"}]}\n\n',
    },
    {
      name: "keystore/4",
      type: "function",
      specs: [
        "@spec keystore([tuple()], any(), non_neg_integer(), tuple()) :: [tuple(), ...]",
      ],
      documentation:
        'Receives a `list` of tuples and replaces the element\nidentified by `key` at `position` with `new_tuple`.\n\nIf the element does not exist, it is added to the end of the `list`.\n\n## Examples\n\n    iex> List.keystore([a: 1, b: 2], :a, 0, {:a, 3})\n    [a: 3, b: 2]\n\n    iex> List.keystore([a: 1, b: 2], :c, 0, {:c, 3})\n    [a: 1, b: 2, c: 3]\n\nThis function works for any list of tuples:\n\n    iex> List.keystore([{22, "SSH"}], 80, 0, {80, "HTTP"})\n    [{22, "SSH"}, {80, "HTTP"}]\n\n',
    },
    {
      name: "keysort/3",
      type: "function",
      specs: [
        "@spec keysort(\n        [tuple()],\n        non_neg_integer(),\n        (any(), any() -> boolean())\n        | :asc\n        | :desc\n        | module()\n        | {:asc | :desc, module()}\n      ) :: [tuple()]",
      ],
      documentation:
        'Receives a list of tuples and sorts the elements\nat `position` of the tuples.\n\nThe sort is stable.\n\nA `sorter` argument is available since Elixir v1.14.0. Similar to\n`Enum.sort/2`, the sorter can be an anonymous function, the atoms\n`:asc` or `:desc`, or module that implements a compare function.\n\n## Examples\n\n    iex> List.keysort([a: 5, b: 1, c: 3], 1)\n    [b: 1, c: 3, a: 5]\n\n    iex> List.keysort([a: 5, c: 1, b: 3], 0)\n    [a: 5, b: 3, c: 1]\n\nTo sort in descending order:\n\n    iex> List.keysort([a: 5, c: 1, b: 3], 0, :desc)\n    [c: 1, b: 3, a: 5]\n\nAs in `Enum.sort/2`, avoid using the default sorting function to sort\nstructs, as by default it performs structural comparison instead of a\nsemantic one. In such cases, you shall pass a sorting function as third\nelement or any module that implements a `compare/2` function. For example,\nif you have tuples with user names and their birthday, and you want to\nsort on their birthday, in both ascending and descending order, you should\ndo:\n\n    iex> users = [\n    ...>   {"Ellis", ~D[1943-05-11]},\n    ...>   {"Lovelace", ~D[1815-12-10]},\n    ...>   {"Turing", ~D[1912-06-23]}\n    ...> ]\n    iex> List.keysort(users, 1, Date)\n    [\n      {"Lovelace", ~D[1815-12-10]},\n      {"Turing", ~D[1912-06-23]},\n      {"Ellis", ~D[1943-05-11]}\n    ]\n    iex> List.keysort(users, 1, {:desc, Date})\n    [\n      {"Ellis", ~D[1943-05-11]},\n      {"Turing", ~D[1912-06-23]},\n      {"Lovelace", ~D[1815-12-10]}\n    ]\n\n',
    },
    {
      name: "keyreplace/4",
      type: "function",
      specs: [
        "@spec keyreplace([tuple()], any(), non_neg_integer(), tuple()) :: [tuple()]",
      ],
      documentation:
        'Receives a list of tuples and if the identified element by `key` at `position`\nexists, it is replaced with `new_tuple`.\n\n## Examples\n\n    iex> List.keyreplace([a: 1, b: 2], :a, 0, {:a, 3})\n    [a: 3, b: 2]\n\n    iex> List.keyreplace([a: 1, b: 2], :a, 1, {:a, 3})\n    [a: 1, b: 2]\n\nThis function works for any list of tuples:\n\n    iex> List.keyreplace([{22, "SSH"}, {80, "HTTP"}], 22, 0, {22, "Secure Shell"})\n    [{22, "Secure Shell"}, {80, "HTTP"}]\n\n',
    },
    {
      name: "keymember?/3",
      type: "function",
      specs: [
        "@spec keymember?([tuple()], any(), non_neg_integer()) :: boolean()",
      ],
      documentation:
        'Receives a list of tuples and returns `true` if there is\na tuple where the element at `position` in the tuple matches\nthe given `key`.\n\n## Examples\n\n    iex> List.keymember?([a: 1, b: 2], :a, 0)\n    true\n\n    iex> List.keymember?([a: 1, b: 2], 2, 1)\n    true\n\n    iex> List.keymember?([a: 1, b: 2], :c, 0)\n    false\n\nThis function works for any list of tuples:\n\n    iex> List.keymember?([{22, "SSH"}, {80, "HTTP"}], 22, 0)\n    true\n\n',
    },
    {
      name: "keyfind!/3",
      type: "function",
      specs: ["@spec keyfind!([tuple()], any(), non_neg_integer()) :: any()"],
      documentation:
        'Receives a list of tuples and returns the first tuple\nwhere the element at `position` in the tuple matches the\ngiven `key`.\n\nIf no matching tuple is found, an error is raised.\n\n## Examples\n\n    iex> List.keyfind!([a: 1, b: 2], :a, 0)\n    {:a, 1}\n\n    iex> List.keyfind!([a: 1, b: 2], 2, 1)\n    {:b, 2}\n\n    iex> List.keyfind!([a: 1, b: 2], :c, 0)\n    ** (KeyError) key :c at position 0 not found in: [a: 1, b: 2]\n\nThis function works for any list of tuples:\n\n    iex> List.keyfind!([{22, "SSH"}, {80, "HTTP"}], 22, 0)\n    {22, "SSH"}\n\n',
    },
    {
      name: "keyfind/4",
      type: "function",
      specs: [
        "@spec keyfind([tuple()], any(), non_neg_integer(), any()) :: any()",
      ],
      documentation:
        'Receives a list of tuples and returns the first tuple\nwhere the element at `position` in the tuple matches the\ngiven `key`.\n\nIf no matching tuple is found, `default` is returned.\n\n## Examples\n\n    iex> List.keyfind([a: 1, b: 2], :a, 0)\n    {:a, 1}\n\n    iex> List.keyfind([a: 1, b: 2], 2, 1)\n    {:b, 2}\n\n    iex> List.keyfind([a: 1, b: 2], :c, 0)\n    nil\n\nThis function works for any list of tuples:\n\n    iex> List.keyfind([{22, "SSH"}, {80, "HTTP"}], 22, 0)\n    {22, "SSH"}\n\n',
    },
    {
      name: "keydelete/3",
      type: "function",
      specs: [
        "@spec keydelete([tuple()], any(), non_neg_integer()) :: [tuple()]",
      ],
      documentation:
        'Receives a `list` of tuples and deletes the first tuple\nwhere the element at `position` matches the\ngiven `key`. Returns the new list.\n\n## Examples\n\n    iex> List.keydelete([a: 1, b: 2], :a, 0)\n    [b: 2]\n\n    iex> List.keydelete([a: 1, b: 2], 2, 1)\n    [a: 1]\n\n    iex> List.keydelete([a: 1, b: 2], :c, 0)\n    [a: 1, b: 2]\n\nThis function works for any list of tuples:\n\n    iex> List.keydelete([{22, "SSH"}, {80, "HTTP"}], 80, 0)\n    [{22, "SSH"}]\n\n',
    },
    {
      name: "insert_at/3",
      type: "function",
      specs: ["@spec insert_at(list(), integer(), any()) :: list()"],
      documentation:
        "Returns a list with `value` inserted at the specified `index`.\n\nNote that `index` is capped at the list length. Negative indices\nindicate an offset from the end of the `list`.\n\n## Examples\n\n    iex> List.insert_at([1, 2, 3, 4], 2, 0)\n    [1, 2, 0, 3, 4]\n\n    iex> List.insert_at([1, 2, 3], 10, 0)\n    [1, 2, 3, 0]\n\n    iex> List.insert_at([1, 2, 3], -1, 0)\n    [1, 2, 3, 0]\n\n    iex> List.insert_at([1, 2, 3], -10, 0)\n    [0, 1, 2, 3]\n\n",
    },
    {
      name: "improper?/1",
      type: "function",
      specs: ["@spec improper?(maybe_improper_list()) :: boolean()"],
      documentation:
        "Returns `true` if `list` is an improper list. Otherwise returns `false`.\n\n## Examples\n\n    iex> List.improper?([1, 2 | 3])\n    true\n\n    iex> List.improper?([1, 2, 3])\n    false\n\n",
    },
    {
      name: "foldr/3",
      type: "function",
      specs: [
        "@spec foldr([elem], acc, (elem, acc -> acc)) :: acc when elem: var, acc: var",
      ],
      documentation:
        "Folds (reduces) the given list from the right with\na function. Requires an accumulator, which can be any value.\n\n## Examples\n\n    iex> List.foldr([1, 2, 3, 4], 0, fn x, acc -> x - acc end)\n    -2\n\n    iex> List.foldr([1, 2, 3, 4], %{sum: 0, product: 1}, fn x, %{sum: a1, product: a2} -> %{sum: a1 + x, product: a2 * x} end)\n    %{product: 24, sum: 10}\n\n",
    },
    {
      name: "foldl/3",
      type: "function",
      specs: [
        "@spec foldl([elem], acc, (elem, acc -> acc)) :: acc when elem: var, acc: var",
      ],
      documentation:
        "Folds (reduces) the given list from the left with\na function. Requires an accumulator, which can be any value.\n\n## Examples\n\n    iex> List.foldl([5, 5], 10, fn x, acc -> x + acc end)\n    20\n\n    iex> List.foldl([1, 2, 3, 4], 0, fn x, acc -> x - acc end)\n    2\n\n    iex> List.foldl([1, 2, 3], {0, 0}, fn x, {a1, a2} -> {a1 + x, a2 - x} end)\n    {6, -6}\n\n",
    },
    {
      name: "flatten/2",
      type: "function",
      specs: [
        "@spec flatten(deep_list, [elem]) :: [elem]\n      when deep_list: [elem | deep_list], elem: var",
      ],
      documentation:
        "Flattens the given `list` of nested lists.\nThe list `tail` will be added at the end of\nthe flattened list.\n\nEmpty list elements from `list` are discarded,\nbut not the ones from `tail`.\n\n## Examples\n\n    iex> List.flatten([1, [[2], 3]], [4, 5])\n    [1, 2, 3, 4, 5]\n\n    iex> List.flatten([1, [], 2], [3, [], 4])\n    [1, 2, 3, [], 4]\n\n",
    },
    {
      name: "flatten/1",
      type: "function",
      specs: [
        "@spec flatten(deep_list) :: list() when deep_list: [any() | deep_list]",
      ],
      documentation:
        "Flattens the given `list` of nested lists.\n\nEmpty list elements are discarded.\n\n## Examples\n\n    iex> List.flatten([1, [[2], 3]])\n    [1, 2, 3]\n\n    iex> List.flatten([[], [[], []]])\n    []\n\n",
    },
    {
      name: "first/2",
      type: "function",
      specs: [
        "@spec first([], any()) :: any()",
        "@spec first([elem, ...], any()) :: elem when elem: var",
      ],
      documentation:
        "Returns the first element in `list` or `default` if `list` is empty.\n\n`first/2` has been introduced in Elixir v1.12.0, while `first/1` has been available since v1.0.0.\n\n## Examples\n\n    iex> List.first([])\n    nil\n\n    iex> List.first([], 1)\n    1\n\n    iex> List.first([1])\n    1\n\n    iex> List.first([1, 2, 3])\n    1\n\n",
    },
    {
      name: "duplicate/2",
      type: "function",
      specs: [
        "@spec duplicate(any(), 0) :: []",
        "@spec duplicate(elem, pos_integer()) :: [elem, ...] when elem: var",
      ],
      documentation:
        'Duplicates the given element `n` times in a list.\n\n`n` is an integer greater than or equal to `0`.\n\nIf `n` is `0`, an empty list is returned.\n\n## Examples\n\n    iex> List.duplicate("hello", 0)\n    []\n\n    iex> List.duplicate("hi", 1)\n    ["hi"]\n\n    iex> List.duplicate("bye", 2)\n    ["bye", "bye"]\n\n    iex> List.duplicate([1, 2], 3)\n    [[1, 2], [1, 2], [1, 2]]\n\n',
    },
    {
      name: "delete_at/2",
      type: "function",
      specs: ["@spec delete_at(list(), integer()) :: list()"],
      documentation:
        "Produces a new list by removing the value at the specified `index`.\n\nNegative indices indicate an offset from the end of the `list`.\nIf `index` is out of bounds, the original `list` is returned.\n\n## Examples\n\n    iex> List.delete_at([1, 2, 3], 0)\n    [2, 3]\n\n    iex> List.delete_at([1, 2, 3], 10)\n    [1, 2, 3]\n\n    iex> List.delete_at([1, 2, 3], -1)\n    [1, 2]\n\n",
    },
    {
      name: "delete/2",
      type: "function",
      specs: [
        "@spec delete([], any()) :: []",
        "@spec delete([...], any()) :: list()",
      ],
      documentation:
        "Deletes the given `element` from the `list`. Returns a new list without\nthe element.\n\nIf the `element` occurs more than once in the `list`, just\nthe first occurrence is removed.\n\n## Examples\n\n    iex> List.delete([:a, :b, :c], :a)\n    [:b, :c]\n\n    iex> List.delete([:a, :b, :c], :d)\n    [:a, :b, :c]\n\n    iex> List.delete([:a, :b, :b, :c], :b)\n    [:a, :b, :c]\n\n    iex> List.delete([], :b)\n    []\n\n",
    },
    {
      name: "ascii_printable?/2",
      type: "function",
      specs: [
        "@spec ascii_printable?(list(), 0) :: true",
        "@spec ascii_printable?([], limit) :: true when limit: :infinity | pos_integer()",
        "@spec ascii_printable?([...], limit) :: boolean()\n      when limit: :infinity | pos_integer()",
      ],
      documentation:
        'Checks if `list` is a charlist made only of printable ASCII characters.\n\nTakes an optional `limit` as a second argument. `ascii_printable?/2` only\nchecks the printability of the list up to the `limit`.\n\nA printable charlist in Elixir contains only the printable characters in the\nstandard seven-bit ASCII character encoding, which are characters ranging from\n32 to 126 in decimal notation, plus the following control characters:\n\n  * `?\\a` - Bell\n  * `?\\b` - Backspace\n  * `?\\t` - Horizontal tab\n  * `?\\n` - Line feed\n  * `?\\v` - Vertical tab\n  * `?\\f` - Form feed\n  * `?\\r` - Carriage return\n  * `?\\e` - Escape\n\nFor more information read the [Character groups](https://en.wikipedia.org/wiki/ASCII#Character_groups)\nsection in the Wikipedia article of the [ASCII](https://en.wikipedia.org/wiki/ASCII) standard.\n\n## Examples\n\n    iex> List.ascii_printable?(~c"abc")\n    true\n\n    iex> List.ascii_printable?(~c"abc" ++ [0])\n    false\n\n    iex> List.ascii_printable?(~c"abc" ++ [0], 2)\n    true\n\nImproper lists are not printable, even if made only of ASCII characters:\n\n    iex> List.ascii_printable?(~c"abc" ++ ?d)\n    false\n\n',
    },
  ],
  name: "List",
  callbacks: [],
  macros: [],
  types: [],
};
