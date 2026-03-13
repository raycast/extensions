import type { ModuleDoc } from "../types";

export const Enum: ModuleDoc = {
  functions: [
    {
      name: "zip_with/3",
      type: "function",
      specs: [
        "@spec zip_with(t(), t(), (enum1_elem :: term(), enum2_elem :: term() -> term())) ::\n        [term()]",
      ],
      documentation:
        "Zips corresponding elements from two enumerables into a list, transforming them with\nthe `zip_fun` function as it goes.\n\nThe corresponding elements from each collection are passed to the provided two-arity `zip_fun`\nfunction in turn. Returns a list that contains the result of calling `zip_fun` for each pair of\nelements.\n\nThe zipping finishes as soon as either enumerable runs out of elements.\n\n## Zipping Maps\n\nIt's important to remember that zipping inherently relies on order.\nIf you zip two lists you get the element at the index from each list in turn.\nIf we zip two maps together it's tempting to think that you will get the given\nkey in the left map and the matching key in the right map, but there is no such\nguarantee because map keys are not ordered! Consider the following:\n\n    left =  %{:a => 1, 1 => 3}\n    right = %{:a => 1, :b => :c}\n    Enum.zip(left, right)\n    # [{{1, 3}, {:a, 1}}, {{:a, 1}, {:b, :c}}]\n\nAs you can see `:a` does not get paired with `:a`. If this is what you want,\nyou should use `Map.merge/3`.\n\n## Examples\n\n    iex> Enum.zip_with([1, 2], [3, 4], fn x, y -> x + y end)\n    [4, 6]\n\n    iex> Enum.zip_with([1, 2], [3, 4, 5, 6], fn x, y -> x + y end)\n    [4, 6]\n\n    iex> Enum.zip_with([1, 2, 5, 6], [3, 4], fn x, y -> x + y end)\n    [4, 6]\n\n",
    },
    {
      name: "zip_with/2",
      type: "function",
      specs: ["@spec zip_with(t(), ([term()] -> term())) :: [term()]"],
      documentation:
        "Zips corresponding elements from a finite collection of enumerables\ninto list, transforming them with the `zip_fun` function as it goes.\n\nThe first element from each of the enums in `enumerables` will be put\ninto a list which is then passed to the one-arity `zip_fun` function.\nThen, the second elements from each of the enums are put into a list\nand passed to `zip_fun`, and so on until any one of the enums in\n`enumerables` runs out of elements.\n\nReturns a list with all the results of calling `zip_fun`.\n\n## Examples\n\n    iex> Enum.zip_with([[1, 2], [3, 4], [5, 6]], fn [x, y, z] -> x + y + z end)\n    [9, 12]\n\n    iex> Enum.zip_with([[1, 2], [3, 4]], fn [x, y] -> x + y end)\n    [4, 6]\n\n",
    },
    {
      name: "zip_reduce/4",
      type: "function",
      specs: [
        "@spec zip_reduce(t(), t(), acc, (enum1_elem :: term(),\n                                 enum2_elem :: term(),\n                                 acc ->\n                                   acc)) :: acc\n      when acc: term()",
      ],
      documentation:
        "Reduces over two enumerables halting as soon as either enumerable is empty.\n\nIn practice, the behavior provided by this function can be achieved with:\n\n    Enum.reduce(Stream.zip(left, right), acc, reducer)\n\nBut `zip_reduce/4` exists for convenience purposes.\n\n## Examples\n\n    iex> Enum.zip_reduce([1, 2], [3, 4], 0, fn x, y, acc -> x + y + acc end)\n    10\n\n    iex> Enum.zip_reduce([1, 2], [3, 4], [], fn x, y, acc -> [x + y | acc] end)\n    [6, 4]\n",
    },
    {
      name: "zip_reduce/3",
      type: "function",
      specs: [
        "@spec zip_reduce(t(), acc, ([term()], acc -> acc)) :: acc when acc: term()",
      ],
      documentation:
        "Reduces over all of the given enumerables, halting as soon as any enumerable is\nempty.\n\nThe reducer will receive 2 args: a list of elements (one from each enum) and the\naccumulator.\n\nIn practice, the behavior provided by this function can be achieved with:\n\n    Enum.reduce(Stream.zip(enums), acc, reducer)\n\nBut `zip_reduce/3` exists for convenience purposes.\n\n## Examples\n\n    iex> enums = [[1, 1], [2, 2], [3, 3]]\n    ...>  Enum.zip_reduce(enums, [], fn elements, acc ->\n    ...>    [List.to_tuple(elements) | acc]\n    ...> end)\n    [{1, 2, 3}, {1, 2, 3}]\n\n    iex> enums = [[1, 2], [a: 3, b: 4], [5, 6]]\n    ...> Enum.zip_reduce(enums, [], fn elements, acc ->\n    ...>   [List.to_tuple(elements) | acc]\n    ...> end)\n    [{2, {:b, 4}, 6}, {1, {:a, 3}, 5}]\n",
    },
    {
      name: "zip/2",
      type: "function",
      specs: ["@spec zip(t(), t()) :: [{any(), any()}]"],
      documentation:
        "Zips corresponding elements from two enumerables into a list\nof tuples.\n\nBecause a list of two-element tuples with atoms as the first\ntuple element is a keyword list (`Keyword`), zipping a first list\nof atoms with a second list of any kind creates a keyword list.\n\nThe zipping finishes as soon as either enumerable completes.\n\n## Examples\n\n    iex> Enum.zip([1, 2, 3], [:a, :b, :c])\n    [{1, :a}, {2, :b}, {3, :c}]\n\n    iex> Enum.zip([:a, :b, :c], [1, 2, 3])\n    [a: 1, b: 2, c: 3]\n\n    iex> Enum.zip([1, 2, 3, 4, 5], [:a, :b, :c])\n    [{1, :a}, {2, :b}, {3, :c}]\n\n",
    },
    {
      name: "zip/1",
      type: "function",
      specs: [
        "@spec zip(enumerables) :: [tuple()] when enumerables: [t()] | t()",
      ],
      documentation:
        'Zips corresponding elements from a finite collection of enumerables\ninto a list of tuples.\n\nThe zipping finishes as soon as any enumerable in the given collection completes.\n\n## Examples\n\n    iex> Enum.zip([[1, 2, 3], [:a, :b, :c], ["foo", "bar", "baz"]])\n    [{1, :a, "foo"}, {2, :b, "bar"}, {3, :c, "baz"}]\n\n    iex> Enum.zip([[1, 2, 3, 4, 5], [:a, :b, :c]])\n    [{1, :a}, {2, :b}, {3, :c}]\n\n',
    },
    {
      name: "with_index/2",
      type: "function",
      specs: [
        "@spec with_index(t(), integer()) :: [{term(), integer()}]",
        "@spec with_index(t(), (element(), index() -> value)) :: [value]\n      when value: any()",
      ],
      documentation:
        "Returns the `enumerable` with each element wrapped in a tuple\nalongside its index or according to a given function.\n\nMay receive a function or an integer offset.\n\nIf an `offset` is given, it will index from the given offset instead of from\nzero.\n\nIf a `function` is given, it will index by invoking the function for each\nelement and index (zero-based) of the enumerable.\n\n## Examples\n\n    iex> Enum.with_index([:a, :b, :c])\n    [a: 0, b: 1, c: 2]\n\n    iex> Enum.with_index([:a, :b, :c], 3)\n    [a: 3, b: 4, c: 5]\n\n    iex> Enum.with_index([:a, :b, :c], fn element, index -> {index, element} end)\n    [{0, :a}, {1, :b}, {2, :c}]\n\n",
    },
    {
      name: "unzip/1",
      type: "function",
      specs: ["@spec unzip(t()) :: {[element()], [element()]}"],
      documentation:
        "Opposite of `zip/2`. Extracts two-element tuples from the\ngiven `enumerable` and groups them together.\n\nIt takes an `enumerable` with elements being two-element tuples and returns\na tuple with two lists, each of which is formed by the first and\nsecond element of each tuple, respectively.\n\nThis function fails unless `enumerable` is or can be converted into a\nlist of tuples with *exactly* two elements in each tuple.\n\n## Examples\n\n    iex> Enum.unzip([{:a, 1}, {:b, 2}, {:c, 3}])\n    {[:a, :b, :c], [1, 2, 3]}\n\n",
    },
    {
      name: "uniq_by/2",
      type: "function",
      specs: ["@spec uniq_by(t(), (element() -> term())) :: list()"],
      documentation:
        "Enumerates the `enumerable`, by removing the elements for which\nfunction `fun` returned duplicate elements.\n\nThe function `fun` maps every element to a term. Two elements are\nconsidered duplicates if the return value of `fun` is equal for\nboth of them.\n\nThe first occurrence of each element is kept.\n\n## Example\n\n    iex> Enum.uniq_by([{1, :x}, {2, :y}, {1, :z}], fn {x, _} -> x end)\n    [{1, :x}, {2, :y}]\n\n    iex> Enum.uniq_by([a: {:tea, 2}, b: {:tea, 2}, c: {:coffee, 1}], fn {_, y} -> y end)\n    [a: {:tea, 2}, c: {:coffee, 1}]\n\n",
    },
    {
      name: "uniq/1",
      type: "function",
      specs: ["@spec uniq(t()) :: list()"],
      documentation:
        "Enumerates the `enumerable`, removing all duplicate elements.\n\n## Examples\n\n    iex> Enum.uniq([1, 2, 3, 3, 2, 1])\n    [1, 2, 3]\n\n",
    },
    {
      name: "to_list/1",
      type: "function",
      specs: ["@spec to_list(t()) :: [element()]"],
      documentation:
        "Converts `enumerable` to a list.\n\n## Examples\n\n    iex> Enum.to_list(1..3)\n    [1, 2, 3]\n\n",
    },
    {
      name: "take_while/2",
      type: "function",
      specs: [
        "@spec take_while(t(), (element() -> as_boolean(term()))) :: list()",
      ],
      documentation:
        "Takes the elements from the beginning of the `enumerable` while `fun` returns\na truthy value.\n\n## Examples\n\n    iex> Enum.take_while([1, 2, 3], fn x -> x < 3 end)\n    [1, 2]\n\n",
    },
    {
      name: "take_random/2",
      type: "function",
      specs: ["@spec take_random(t(), non_neg_integer()) :: list()"],
      documentation:
        'Takes `count` random elements from `enumerable`.\n\nNote that this function will traverse the whole `enumerable` to\nget the random sublist.\n\nSee `random/1` for notes on implementation and random seed.\n\n## Examples\n\n    # Although not necessary, let\'s seed the random algorithm\n    iex> :rand.seed(:exsss, {1, 2, 3})\n    iex> Enum.take_random(1..10, 2)\n    [6, 1]\n    iex> Enum.take_random(?a..?z, 5)\n    ~c"bkzmt"\n\n',
    },
    {
      name: "take_every/2",
      type: "function",
      specs: ["@spec take_every(t(), non_neg_integer()) :: list()"],
      documentation:
        "Returns a list of every `nth` element in the `enumerable`,\nstarting with the first element.\n\nThe first element is always included, unless `nth` is 0.\n\nThe second argument specifying every `nth` element must be a non-negative\ninteger.\n\n## Examples\n\n    iex> Enum.take_every(1..10, 2)\n    [1, 3, 5, 7, 9]\n\n    iex> Enum.take_every(1..10, 0)\n    []\n\n    iex> Enum.take_every([1, 2, 3], 1)\n    [1, 2, 3]\n\n",
    },
    {
      name: "take/2",
      type: "function",
      specs: ["@spec take(t(), integer()) :: list()"],
      documentation:
        "Takes an `amount` of elements from the beginning or the end of the `enumerable`.\n\nIf a positive `amount` is given, it takes the `amount` elements from the\nbeginning of the `enumerable`.\n\nIf a negative `amount` is given, the `amount` of elements will be taken from the end.\nThe `enumerable` will be enumerated once to retrieve the proper index and\nthe remaining calculation is performed from the end.\n\nIf amount is `0`, it returns `[]`.\n\n## Examples\n\n    iex> Enum.take([1, 2, 3], 2)\n    [1, 2]\n\n    iex> Enum.take([1, 2, 3], 10)\n    [1, 2, 3]\n\n    iex> Enum.take([1, 2, 3], 0)\n    []\n\n    iex> Enum.take([1, 2, 3], -1)\n    [3]\n\n",
    },
    {
      name: "sum/1",
      type: "function",
      specs: ["@spec sum(t()) :: number()"],
      documentation:
        "Returns the sum of all elements.\n\nRaises `ArithmeticError` if `enumerable` contains a non-numeric value.\n\n## Examples\n\n    iex> Enum.sum([1, 2, 3])\n    6\n\n    iex> Enum.sum(1..10)\n    55\n\n    iex> Enum.sum(1..10//2)\n    25\n\n",
    },
    {
      name: "split_with/2",
      type: "function",
      specs: [
        "@spec split_with(t(), (element() -> as_boolean(term()))) :: {list(), list()}",
      ],
      documentation:
        "Splits the `enumerable` in two lists according to the given function `fun`.\n\nSplits the given `enumerable` in two lists by calling `fun` with each element\nin the `enumerable` as its only argument. Returns a tuple with the first list\ncontaining all the elements in `enumerable` for which applying `fun` returned\na truthy value, and a second list with all the elements for which applying\n`fun` returned a falsy value (`false` or `nil`).\n\nThe elements in both the returned lists are in the same relative order as they\nwere in the original enumerable (if such enumerable was ordered, like a\nlist). See the examples below.\n\n## Examples\n\n    iex> Enum.split_with([5, 4, 3, 2, 1, 0], fn x -> rem(x, 2) == 0 end)\n    {[4, 2, 0], [5, 3, 1]}\n\n    iex> Enum.split_with([a: 1, b: -2, c: 1, d: -3], fn {_k, v} -> v < 0 end)\n    {[b: -2, d: -3], [a: 1, c: 1]}\n\n    iex> Enum.split_with([a: 1, b: -2, c: 1, d: -3], fn {_k, v} -> v > 50 end)\n    {[], [a: 1, b: -2, c: 1, d: -3]}\n\n    iex> Enum.split_with([], fn {_k, v} -> v > 50 end)\n    {[], []}\n\n",
    },
    {
      name: "split_while/2",
      type: "function",
      specs: [
        "@spec split_while(t(), (element() -> as_boolean(term()))) :: {list(), list()}",
      ],
      documentation:
        "Splits enumerable in two at the position of the element for which\n`fun` returns a falsy value (`false` or `nil`) for the first time.\n\nIt returns a two-element tuple with two lists of elements.\nThe element that triggered the split is part of the second list.\n\n## Examples\n\n    iex> Enum.split_while([1, 2, 3, 4], fn x -> x < 3 end)\n    {[1, 2], [3, 4]}\n\n    iex> Enum.split_while([1, 2, 3, 4], fn x -> x < 0 end)\n    {[], [1, 2, 3, 4]}\n\n    iex> Enum.split_while([1, 2, 3, 4], fn x -> x > 0 end)\n    {[1, 2, 3, 4], []}\n\n",
    },
    {
      name: "split/2",
      type: "function",
      specs: ["@spec split(t(), integer()) :: {list(), list()}"],
      documentation:
        "Splits the `enumerable` into two enumerables, leaving `count`\nelements in the first one.\n\nIf `count` is a negative number, it starts counting from the\nback to the beginning of the `enumerable`.\n\nBe aware that a negative `count` implies the `enumerable`\nwill be enumerated twice: once to calculate the position, and\na second time to do the actual splitting.\n\n## Examples\n\n    iex> Enum.split([1, 2, 3], 2)\n    {[1, 2], [3]}\n\n    iex> Enum.split([1, 2, 3], 10)\n    {[1, 2, 3], []}\n\n    iex> Enum.split([1, 2, 3], 0)\n    {[], [1, 2, 3]}\n\n    iex> Enum.split([1, 2, 3], -1)\n    {[1, 2], [3]}\n\n    iex> Enum.split([1, 2, 3], -5)\n    {[], [1, 2, 3]}\n\n",
    },
    {
      name: "sort_by/3",
      type: "function",
      specs: [
        "@spec sort_by(\n        t(),\n        (element() -> mapped_element),\n        (element(), element() -> boolean())\n        | :asc\n        | :desc\n        | module()\n        | {:asc | :desc, module()}\n      ) :: list()\n      when mapped_element: element()",
      ],
      documentation:
        'Sorts the mapped results of the `enumerable` according to the provided `sorter`\nfunction.\n\nThis function maps each element of the `enumerable` using the\nprovided `mapper` function. The enumerable is then sorted by\nthe mapped elements using the `sorter`, which defaults to `:asc`\nand sorts the elements ascendingly.\n\n`sort_by/3` differs from `sort/2` in that it only calculates the\ncomparison value for each element in the enumerable once instead of\nonce for each element in each comparison. If the same function is\nbeing called on both elements, it\'s more efficient to use `sort_by/3`.\n\n## Ascending and descending (since v1.10.0)\n\n`sort_by/3` allows a developer to pass `:asc` or `:desc` as the sorter,\nwhich is a convenience for [`&<=/2`](`<=/2`) and [`&>=/2`](`>=/2`) respectively:\n    iex> Enum.sort_by([2, 3, 1], &(&1), :asc)\n    [1, 2, 3]\n\n    iex> Enum.sort_by([2, 3, 1], &(&1), :desc)\n    [3, 2, 1]\n\n## Examples\n\nUsing the default `sorter` of `:asc` :\n\n    iex> Enum.sort_by(["some", "kind", "of", "monster"], &byte_size/1)\n    ["of", "some", "kind", "monster"]\n\nSorting by multiple properties - first by size, then by first letter\n(this takes advantage of the fact that tuples are compared element-by-element):\n\n    iex> Enum.sort_by(["some", "kind", "of", "monster"], &{byte_size(&1), String.first(&1)})\n    ["of", "kind", "some", "monster"]\n\nSimilar to `sort/2`, you can pass a custom sorter:\n\n    iex> Enum.sort_by(["some", "kind", "of", "monster"], &byte_size/1, :desc)\n    ["monster", "some", "kind", "of"]\n\nAs in `sort/2`, avoid using the default sorting function to sort\nstructs, as by default it performs structural comparison instead of\na semantic one. In such cases, you shall pass a sorting function as\nthird element or any module that implements a `compare/2` function.\nFor example, to sort users by their birthday in both ascending and\ndescending order respectively:\n\n    iex> users = [\n    ...>   %{name: "Ellis", birthday: ~D[1943-05-11]},\n    ...>   %{name: "Lovelace", birthday: ~D[1815-12-10]},\n    ...>   %{name: "Turing", birthday: ~D[1912-06-23]}\n    ...> ]\n    iex> Enum.sort_by(users, &(&1.birthday), Date)\n    [\n      %{name: "Lovelace", birthday: ~D[1815-12-10]},\n      %{name: "Turing", birthday: ~D[1912-06-23]},\n      %{name: "Ellis", birthday: ~D[1943-05-11]}\n    ]\n    iex> Enum.sort_by(users, &(&1.birthday), {:desc, Date})\n    [\n      %{name: "Ellis", birthday: ~D[1943-05-11]},\n      %{name: "Turing", birthday: ~D[1912-06-23]},\n      %{name: "Lovelace", birthday: ~D[1815-12-10]}\n    ]\n\n## Performance characteristics\n\nAs detailed in the initial section, `sort_by/3` calculates the comparison\nvalue for each element in the enumerable once instead of once for each\nelement in each comparison. This implies `sort_by/3` must do an initial\npass on the data to compute those values.\n\nHowever, if those values are cheap to compute, for example, you have\nalready extracted the field you want to sort by into a tuple, then those\nextra passes become overhead. In such cases, consider using `List.keysort/3`\ninstead.\n\nLet\'s see an example. Imagine you have a list of products and you have a\nlist of IDs. You want to keep all products that are in the given IDs and\nreturn their names sorted by their price. You could write it like this:\n\n    for(\n      product <- products,\n      product.id in ids,\n      do: product\n    )\n    |> Enum.sort_by(& &1.price)\n    |> Enum.map(& &1.name)\n\nHowever, you could also write it like this:\n\n    for(\n      product <- products,\n      product.id in ids,\n      do: {product.name, product.price}\n    )\n    |> List.keysort(1)\n    |> Enum.map(&elem(&1, 0))\n\nUsing `List.keysort/3` will be a better choice for performance sensitive\ncode as it avoids additional traversals.\n',
    },
    {
      name: "sort/2",
      type: "function",
      specs: [
        "@spec sort(\n        t(),\n        (element(), element() -> boolean())\n        | :asc\n        | :desc\n        | module()\n        | {:asc | :desc, module()}\n      ) :: list()",
      ],
      documentation:
        'Sorts the `enumerable` by the given function.\n\nThis function uses the merge sort algorithm. The given function should compare\ntwo arguments, and return `true` if the first argument precedes or is in the\nsame place as the second one.\n\n## Examples\n\n    iex> Enum.sort([1, 2, 3], &(&1 >= &2))\n    [3, 2, 1]\n\nThe sorting algorithm will be stable as long as the given function\nreturns `true` for values considered equal:\n\n    iex> Enum.sort(["some", "kind", "of", "monster"], &(byte_size(&1) <= byte_size(&2)))\n    ["of", "some", "kind", "monster"]\n\nIf the function does not return `true` for equal values, the sorting\nis not stable and the order of equal terms may be shuffled.\nFor example:\n\n    iex> Enum.sort(["some", "kind", "of", "monster"], &(byte_size(&1) < byte_size(&2)))\n    ["of", "kind", "some", "monster"]\n\n## Ascending and descending (since v1.10.0)\n\n`sort/2` allows a developer to pass `:asc` or `:desc` as the sorter, which is a convenience for\n[`&<=/2`](`<=/2`) and [`&>=/2`](`>=/2`) respectively.\n\n    iex> Enum.sort([2, 3, 1], :asc)\n    [1, 2, 3]\n    iex> Enum.sort([2, 3, 1], :desc)\n    [3, 2, 1]\n\n## Sorting structs\n\nDo not use `</2`, `<=/2`, `>/2`, `>=/2` and friends when sorting structs.\nThat\'s because the built-in operators above perform structural comparison\nand not a semantic one. Imagine we sort the following list of dates:\n\n    iex> dates = [~D[2019-01-01], ~D[2020-03-02], ~D[2019-06-06]]\n    iex> Enum.sort(dates)\n    [~D[2019-01-01], ~D[2020-03-02], ~D[2019-06-06]]\n\nNote that the returned result is incorrect, because `sort/1` by default uses\n`<=/2`, which will compare their structure. When comparing structures, the\nfields are compared in alphabetical order, which means the dates above will\nbe compared by `day`, `month` and then `year`, which is the opposite of what\nwe want.\n\nFor this reason, most structs provide a "compare" function, such as\n`Date.compare/2`, which receives two structs and returns `:lt` (less-than),\n`:eq` (equal to), and `:gt` (greater-than). If you pass a module as the\nsorting function, Elixir will automatically use the `compare/2` function\nof said module:\n\n    iex> dates = [~D[2019-01-01], ~D[2020-03-02], ~D[2019-06-06]]\n    iex> Enum.sort(dates, Date)\n    [~D[2019-01-01], ~D[2019-06-06], ~D[2020-03-02]]\n\nTo retrieve all dates in descending order, you can wrap the module in\na tuple with `:asc` or `:desc` as first element:\n\n    iex> dates = [~D[2019-01-01], ~D[2020-03-02], ~D[2019-06-06]]\n    iex> Enum.sort(dates, {:asc, Date})\n    [~D[2019-01-01], ~D[2019-06-06], ~D[2020-03-02]]\n    iex> dates = [~D[2019-01-01], ~D[2020-03-02], ~D[2019-06-06]]\n    iex> Enum.sort(dates, {:desc, Date})\n    [~D[2020-03-02], ~D[2019-06-06], ~D[2019-01-01]]\n\n',
    },
    {
      name: "sort/1",
      type: "function",
      specs: ["@spec sort(t()) :: list()"],
      documentation:
        "Sorts the `enumerable` according to Erlang's term ordering.\n\nThis function uses the merge sort algorithm. Do not use this\nfunction to sort structs, see `sort/2` for more information.\n\n## Examples\n\n    iex> Enum.sort([3, 2, 1])\n    [1, 2, 3]\n\n",
    },
    {
      name: "slide/3",
      type: "function",
      specs: ["@spec slide(t(), Range.t() | index(), index()) :: list()"],
      documentation:
        "Slides a single or multiple elements given by `range_or_single_index` from `enumerable`\nto `insertion_index`.\n\nThe semantics of the range to be moved match the semantics of `Enum.slice/2`.\nSpecifically, that means:\n\n * Indices are normalized, meaning that negative indexes will be counted from the end\n    (for example, -1 means the last element of the enumerable). This will result in *two*\n    traversals of your enumerable on types like lists that don't provide a constant-time count.\n\n  * If the normalized index range's `last` is out of bounds, the range is truncated to the last element.\n\n  * If the normalized index range's `first` is out of bounds, the selected range for sliding\n    will be empty, so you'll get back your input list.\n\n  * Decreasing ranges (such as `5..0//1`) also select an empty range to be moved,\n    so you'll get back your input list.\n\n  * Ranges with any step but 1 will raise an error.\n\n## Examples\n\n    # Slide a single element\n    iex> Enum.slide([:a, :b, :c, :d, :e, :f, :g], 5, 1)\n    [:a, :f, :b, :c, :d, :e, :g]\n\n    # Slide a range of elements backward\n    iex> Enum.slide([:a, :b, :c, :d, :e, :f, :g], 3..5, 1)\n    [:a, :d, :e, :f, :b, :c, :g]\n\n    # Slide a range of elements forward\n    iex> Enum.slide([:a, :b, :c, :d, :e, :f, :g], 1..3, 5)\n    [:a, :e, :f, :b, :c, :d, :g]\n\n    # Slide with negative indices (counting from the end)\n    iex> Enum.slide([:a, :b, :c, :d, :e, :f, :g], 3..-1//1, 2)\n    [:a, :b, :d, :e, :f, :g, :c]\n    iex> Enum.slide([:a, :b, :c, :d, :e, :f, :g], -4..-2, 1)\n    [:a, :d, :e, :f, :b, :c, :g]\n\n    # Insert at negative indices (counting from the end)\n    iex> Enum.slide([:a, :b, :c, :d, :e, :f, :g], 3, -1)\n    [:a, :b, :c, :e, :f, :g, :d]\n\n",
    },
    {
      name: "slice/3",
      type: "function",
      specs: ["@spec slice(t(), index(), non_neg_integer()) :: list()"],
      documentation:
        "Returns a subset list of the given `enumerable`, from `start_index` (zero-based)\nwith `amount` number of elements if available.\n\nGiven an `enumerable`, it drops elements right before element `start_index`;\nthen, it takes `amount` of elements, returning as many elements as possible if\nthere are not enough elements.\n\nA negative `start_index` can be passed, which means the `enumerable` is\nenumerated once and the index is counted from the end (for example,\n`-1` starts slicing from the last element).\n\nIt returns `[]` if `amount` is `0` or if `start_index` is out of bounds.\n\n## Examples\n\n    iex> Enum.slice(1..100, 5, 10)\n    [6, 7, 8, 9, 10, 11, 12, 13, 14, 15]\n\n    # amount to take is greater than the number of elements\n    iex> Enum.slice(1..10, 5, 100)\n    [6, 7, 8, 9, 10]\n\n    iex> Enum.slice(1..10, 5, 0)\n    []\n\n    # using a negative start index\n    iex> Enum.slice(1..10, -6, 3)\n    [5, 6, 7]\n    iex> Enum.slice(1..10, -11, 5)\n    [1, 2, 3, 4, 5]\n\n    # out of bound start index\n    iex> Enum.slice(1..10, 10, 5)\n    []\n\n",
    },
    {
      name: "slice/2",
      type: "function",
      specs: ["@spec slice(t(), Range.t()) :: list()"],
      documentation:
        "Returns a subset list of the given `enumerable` by `index_range`.\n\n`index_range` must be a `Range`. Given an `enumerable`, it drops\nelements before `index_range.first` (zero-base), then it takes elements\nuntil element `index_range.last` (inclusively).\n\nIndexes are normalized, meaning that negative indexes will be counted\nfrom the end (for example, `-1` means the last element of the `enumerable`).\n\nIf `index_range.last` is out of bounds, then it is assigned as the index\nof the last element.\n\nIf the normalized `index_range.first` is out of bounds of the given\n`enumerable`, or this one is greater than the normalized `index_range.last`,\nthen `[]` is returned.\n\nIf a step `n` (other than `1`) is used in `index_range`, then it takes\nevery `n`th element from `index_range.first` to `index_range.last`\n(according to the same rules described above).\n\n## Examples\n\n    iex> Enum.slice([1, 2, 3, 4, 5], 1..3)\n    [2, 3, 4]\n\n    iex> Enum.slice([1, 2, 3, 4, 5], 3..10)\n    [4, 5]\n\n    # Last three elements (negative indexes)\n    iex> Enum.slice([1, 2, 3, 4, 5], -3..-1)\n    [3, 4, 5]\n\nFor ranges where `start > stop`, you need to explicit\nmark them as increasing:\n\n    iex> Enum.slice([1, 2, 3, 4, 5], 1..-2//1)\n    [2, 3, 4]\n\nThe step can be any positive number. For example, to\nget every 2 elements of the collection:\n\n    iex> Enum.slice([1, 2, 3, 4, 5], 0..-1//2)\n    [1, 3, 5]\n\nTo get every third element of the first ten elements:\n\n    iex> integers = Enum.to_list(1..20)\n    iex> Enum.slice(integers, 0..9//3)\n    [1, 4, 7, 10]\n\nIf the first position is after the end of the enumerable\nor after the last position of the range, it returns an\nempty list:\n\n    iex> Enum.slice([1, 2, 3, 4, 5], 6..10)\n    []\n\n    # first is greater than last\n    iex> Enum.slice([1, 2, 3, 4, 5], 6..5//1)\n    []\n\n",
    },
    {
      name: "shuffle/1",
      type: "function",
      specs: ["@spec shuffle(t()) :: list()"],
      documentation:
        "Returns a list with the elements of `enumerable` shuffled.\n\nThis function uses Erlang's [`:rand` module](`:rand`) to calculate\nthe random value. Check its documentation for setting a\ndifferent random algorithm or a different seed.\n\n## Examples\n\nThe examples below use the `:exsss` pseudorandom algorithm since it's\nthe default from Erlang/OTP 22:\n\n    # Although not necessary, let's seed the random algorithm\n    iex> :rand.seed(:exsss, {11, 22, 33})\n    iex> Enum.shuffle([1, 2, 3])\n    [2, 1, 3]\n    iex> Enum.shuffle([1, 2, 3])\n    [2, 3, 1]\n\n",
    },
    {
      name: "scan/3",
      type: "function",
      specs: ["@spec scan(t(), any(), (element(), any() -> any())) :: list()"],
      documentation:
        "Applies the given function to each element in the `enumerable`,\nstoring the result in a list and passing it as the accumulator\nfor the next computation. Uses the given `acc` as the starting value.\n\n## Examples\n\n    iex> Enum.scan(1..5, 0, &(&1 + &2))\n    [1, 3, 6, 10, 15]\n\n",
    },
    {
      name: "scan/2",
      type: "function",
      specs: ["@spec scan(t(), (element(), any() -> any())) :: list()"],
      documentation:
        "Applies the given function to each element in the `enumerable`,\nstoring the result in a list and passing it as the accumulator\nfor the next computation. Uses the first element in the `enumerable`\nas the starting value.\n\n## Examples\n\n    iex> Enum.scan(1..5, &(&1 + &2))\n    [1, 3, 6, 10, 15]\n\n",
    },
    {
      name: "reverse_slice/3",
      type: "function",
      specs: [
        "@spec reverse_slice(t(), non_neg_integer(), non_neg_integer()) :: list()",
      ],
      documentation:
        "Reverses the `enumerable` in the range from initial `start_index`\nthrough `count` elements.\n\nIf `count` is greater than the size of the rest of the `enumerable`,\nthen this function will reverse the rest of the enumerable.\n\n## Examples\n\n    iex> Enum.reverse_slice([1, 2, 3, 4, 5, 6], 2, 4)\n    [1, 2, 6, 5, 4, 3]\n\n",
    },
    {
      name: "reverse/2",
      type: "function",
      specs: ["@spec reverse(t(), t()) :: list()"],
      documentation:
        "Reverses the elements in `enumerable`, appends the `tail`, and returns\nit as a list.\n\nThis is an optimization for\n`enumerable |> Enum.reverse() |> Enum.concat(tail)`.\n\n## Examples\n\n    iex> Enum.reverse([1, 2, 3], [4, 5, 6])\n    [3, 2, 1, 4, 5, 6]\n\n",
    },
    {
      name: "reverse/1",
      type: "function",
      specs: ["@spec reverse(t()) :: list()"],
      documentation:
        "Returns a list of elements in `enumerable` in reverse order.\n\n## Examples\n\n    iex> Enum.reverse([1, 2, 3])\n    [3, 2, 1]\n\n",
    },
    {
      name: "reject/2",
      type: "function",
      specs: ["@spec reject(t(), (element() -> as_boolean(term()))) :: list()"],
      documentation:
        "Returns a list of elements in `enumerable` excluding those for which the function `fun` returns\na truthy value.\n\nSee also `filter/2`.\n\n## Examples\n\n    iex> Enum.reject([1, 2, 3], fn x -> rem(x, 2) == 0 end)\n    [1, 3]\n\n",
    },
    {
      name: "reduce_while/3",
      type: "function",
      specs: [
        "@spec reduce_while(t(), any(), (element(), any() ->\n                                  {:cont, any()} | {:halt, any()})) :: any()",
      ],
      documentation:
        "Reduces `enumerable` until `fun` returns `{:halt, term}`.\n\nThe return value for `fun` is expected to be\n\n  * `{:cont, acc}` to continue the reduction with `acc` as the new\n    accumulator or\n  * `{:halt, acc}` to halt the reduction\n\nIf `fun` returns `{:halt, acc}` the reduction is halted and the function\nreturns `acc`. Otherwise, if the enumerable is exhausted, the function returns\nthe accumulator of the last `{:cont, acc}`.\n\n## Examples\n\n    iex> Enum.reduce_while(1..100, 0, fn x, acc ->\n    ...>   if x < 5 do\n    ...>     {:cont, acc + x}\n    ...>   else\n    ...>     {:halt, acc}\n    ...>   end\n    ...> end)\n    10\n    iex> Enum.reduce_while(1..100, 0, fn x, acc ->\n    ...>   if x > 0 do\n    ...>     {:cont, acc + x}\n    ...>   else\n    ...>     {:halt, acc}\n    ...>   end\n    ...> end)\n    5050\n\n",
    },
    {
      name: "reduce/3",
      type: "function",
      specs: ["@spec reduce(t(), acc(), (element(), acc() -> acc())) :: acc()"],
      documentation:
        "Invokes `fun` for each element in the `enumerable` with the accumulator.\n\nThe initial value of the accumulator is `acc`. The function is invoked for\neach element in the enumerable with the accumulator. The result returned\nby the function is used as the accumulator for the next iteration.\nThe function returns the last accumulator.\n\n## Examples\n\n    iex> Enum.reduce([1, 2, 3], 0, fn x, acc -> x + acc end)\n    6\n\n    iex> Enum.reduce(%{a: 2, b: 3, c: 4}, 0, fn {_key, val}, acc -> acc + val end)\n    9\n\n## Reduce as a building block\n\nReduce (sometimes called `fold`) is a basic building block in functional\nprogramming. Almost all of the functions in the `Enum` module can be\nimplemented on top of reduce. Those functions often rely on other operations,\nsuch as `Enum.reverse/1`, which are optimized by the runtime.\n\nFor example, we could implement `map/2` in terms of `reduce/3` as follows:\n\n    def my_map(enumerable, fun) do\n      enumerable\n      |> Enum.reduce([], fn x, acc -> [fun.(x) | acc] end)\n      |> Enum.reverse()\n    end\n\nIn the example above, `Enum.reduce/3` accumulates the result of each call\nto `fun` into a list in reverse order, which is correctly ordered at the\nend by calling `Enum.reverse/1`.\n\nImplementing functions like `map/2`, `filter/2` and others are a good\nexercise for understanding the power behind `Enum.reduce/3`. When an\noperation cannot be expressed by any of the functions in the `Enum`\nmodule, developers will most likely resort to `reduce/3`.\n",
    },
    {
      name: "reduce/2",
      type: "function",
      specs: ["@spec reduce(t(), (element(), acc() -> acc())) :: acc()"],
      documentation:
        "Invokes `fun` for each element in the `enumerable` with the\naccumulator.\n\nRaises `Enum.EmptyError` if `enumerable` is empty.\n\nThe first element of the `enumerable` is used as the initial value\nof the accumulator. Then, the function is invoked with the next\nelement and the accumulator. The result returned by the function\nis used as the accumulator for the next iteration, recursively.\nWhen the `enumerable` is done, the last accumulator is returned.\n\nSince the first element of the enumerable is used as the initial\nvalue of the accumulator, `fun` will only be executed `n - 1` times\nwhere `n` is the length of the enumerable. This function won't call\nthe specified function for enumerables that are one-element long.\n\nIf you wish to use another value for the accumulator, use\n`Enum.reduce/3`.\n\n## Examples\n\n    iex> Enum.reduce([1, 2, 3, 4], fn x, acc -> x * acc end)\n    24\n\n",
    },
    {
      name: "random/1",
      type: "function",
      specs: ["@spec random(t()) :: element()"],
      documentation:
        "Returns a random element of an `enumerable`.\n\nRaises `Enum.EmptyError` if `enumerable` is empty.\n\nThis function uses Erlang's [`:rand` module](`:rand`) to calculate\nthe random value. Check its documentation for setting a\ndifferent random algorithm or a different seed.\n\nIf a range is passed into the function, this function will pick a\nrandom value between the range limits, without traversing the whole\nrange (thus executing in constant time and constant memory).\n\n## Examples\n\nThe examples below use the `:exsss` pseudorandom algorithm since it's\nthe default from Erlang/OTP 22:\n\n    # Although not necessary, let's seed the random algorithm\n    iex> :rand.seed(:exsss, {100, 101, 102})\n    iex> Enum.random([1, 2, 3])\n    2\n    iex> Enum.random([1, 2, 3])\n    1\n    iex> Enum.random(1..1_000)\n    309\n\n## Implementation\n\nThe random functions in this module implement reservoir sampling,\nwhich allows them to sample infinite collections. In particular,\nwe implement Algorithm L, as described in by Kim-Hung Li in\n\"Reservoir-Sampling Algorithms of Time Complexity O(n(1+log(N/n)))\".\n",
    },
    {
      name: "product/1",
      type: "function",
      specs: ["@spec product(t()) :: number()"],
      documentation:
        "Returns the product of all elements.\n\nRaises `ArithmeticError` if `enumerable` contains a non-numeric value.\n\n## Examples\n\n    iex> Enum.product([])\n    1\n    iex> Enum.product([2, 3, 4])\n    24\n    iex> Enum.product([2.0, 3.0, 4.0])\n    24.0\n\n",
    },
    {
      name: "min_max_by/4",
      type: "function",
      specs: [
        "@spec min_max_by(\n        t(),\n        (element() -> any()),\n        (element(), element() -> boolean()) | module(),\n        (-> empty_result)\n      ) :: {element(), element()} | empty_result\n      when empty_result: any()",
      ],
      documentation:
        'Returns a tuple with the minimal and the maximal elements in the\nenumerable as calculated by the given function.\n\nIf multiple elements are considered maximal or minimal, the first one\nthat was found is returned.\n\n## Examples\n\n    iex> Enum.min_max_by(["aaa", "bb", "c"], fn x -> String.length(x) end)\n    {"c", "aaa"}\n\n    iex> Enum.min_max_by(["aaa", "a", "bb", "c", "ccc"], &String.length/1)\n    {"a", "aaa"}\n\n    iex> Enum.min_max_by([], &String.length/1, fn -> {nil, nil} end)\n    {nil, nil}\n\nThe fact this function uses Erlang\'s term ordering means that the\ncomparison is structural and not semantic. Therefore, if you want\nto compare structs, most structs provide a "compare" function, such as\n`Date.compare/2`, which receives two structs and returns `:lt` (less-than),\n`:eq` (equal to), and `:gt` (greater-than). If you pass a module as the\nsorting function, Elixir will automatically use the `compare/2` function\nof said module:\n\n    iex> users = [\n    ...>   %{name: "Ellis", birthday: ~D[1943-05-11]},\n    ...>   %{name: "Lovelace", birthday: ~D[1815-12-10]},\n    ...>   %{name: "Turing", birthday: ~D[1912-06-23]}\n    ...> ]\n    iex> Enum.min_max_by(users, &(&1.birthday), Date)\n    {\n      %{name: "Lovelace", birthday: ~D[1815-12-10]},\n      %{name: "Ellis", birthday: ~D[1943-05-11]}\n    }\n\nFinally, if you don\'t want to raise on empty enumerables, you can pass\nthe empty fallback:\n\n    iex> Enum.min_max_by([], &String.length/1, fn -> nil end)\n    nil\n\n',
    },
    {
      name: "min_max/2",
      type: "function",
      specs: [
        "@spec min_max(t(), (-> empty_result)) :: {element(), element()} | empty_result\n      when empty_result: any()",
      ],
      documentation:
        "Returns a tuple with the minimal and the maximal elements in the\nenumerable according to Erlang's term ordering.\n\nIf multiple elements are considered maximal or minimal, the first one\nthat was found is returned.\n\nCalls the provided `empty_fallback` function and returns its value if\n`enumerable` is empty. The default `empty_fallback` raises `Enum.EmptyError`.\n\n## Examples\n\n    iex> Enum.min_max([2, 3, 1])\n    {1, 3}\n\n    iex> Enum.min_max([], fn -> {nil, nil} end)\n    {nil, nil}\n\n",
    },
    {
      name: "min_by/4",
      type: "function",
      specs: [
        "@spec min_by(\n        t(),\n        (element() -> any()),\n        (element(), element() -> boolean()) | module(),\n        (-> empty_result)\n      ) :: element() | empty_result\n      when empty_result: any()",
      ],
      documentation:
        'Returns the minimal element in the `enumerable` as calculated\nby the given `fun`.\n\nBy default, the comparison is done with the `<=` sorter function.\nIf multiple elements are considered minimal, the first one that\nwas found is returned. If you want the last element considered\nminimal to be returned, the sorter function should not return true\nfor equal elements.\n\nCalls the provided `empty_fallback` function and returns its value if\n`enumerable` is empty. The default `empty_fallback` raises `Enum.EmptyError`.\n\n## Examples\n\n    iex> Enum.min_by(["a", "aa", "aaa"], fn x -> String.length(x) end)\n    "a"\n\n    iex> Enum.min_by(["a", "aa", "aaa", "b", "bbb"], &String.length/1)\n    "a"\n\nThe fact this function uses Erlang\'s term ordering means that the\ncomparison is structural and not semantic. Therefore, if you want\nto compare structs, most structs provide a "compare" function, such as\n`Date.compare/2`, which receives two structs and returns `:lt` (less-than),\n`:eq` (equal to), and `:gt` (greater-than). If you pass a module as the\nsorting function, Elixir will automatically use the `compare/2` function\nof said module:\n\n    iex> users = [\n    ...>   %{name: "Ellis", birthday: ~D[1943-05-11]},\n    ...>   %{name: "Lovelace", birthday: ~D[1815-12-10]},\n    ...>   %{name: "Turing", birthday: ~D[1912-06-23]}\n    ...> ]\n    iex> Enum.min_by(users, &(&1.birthday), Date)\n    %{name: "Lovelace", birthday: ~D[1815-12-10]}\n\nFinally, if you don\'t want to raise on empty enumerables, you can pass\nthe empty fallback:\n\n    iex> Enum.min_by([], &String.length/1, fn -> nil end)\n    nil\n\n',
    },
    {
      name: "min/3",
      type: "function",
      specs: [
        "@spec min(\n        t(),\n        (element(), element() -> boolean()) | module(),\n        (-> empty_result)\n      ) :: element() | empty_result\n      when empty_result: any()",
      ],
      documentation:
        "Returns the minimal element in the `enumerable` according\nto Erlang's term ordering.\n\nBy default, the comparison is done with the `<=` sorter function.\nIf multiple elements are considered minimal, the first one that\nwas found is returned. If you want the last element considered\nminimal to be returned, the sorter function should not return true\nfor equal elements.\n\nIf the enumerable is empty, the provided `empty_fallback` is called.\nThe default `empty_fallback` raises `Enum.EmptyError`.\n\n## Examples\n\n    iex> Enum.min([1, 2, 3])\n    1\n\nThe fact this function uses Erlang's term ordering means that the comparison\nis structural and not semantic. For example:\n\n    iex> Enum.min([~D[2017-03-31], ~D[2017-04-01]])\n    ~D[2017-04-01]\n\nIn the example above, `min/2` returned April 1st instead of March 31st\nbecause the structural comparison compares the day before the year.\nFor this reason, most structs provide a \"compare\" function, such as\n`Date.compare/2`, which receives two structs and returns `:lt` (less-than),\n`:eq` (equal to), and `:gt` (greater-than). If you pass a module as the\nsorting function, Elixir will automatically use the `compare/2` function\nof said module:\n\n    iex> Enum.min([~D[2017-03-31], ~D[2017-04-01]], Date)\n    ~D[2017-03-31]\n\nFinally, if you don't want to raise on empty enumerables, you can pass\nthe empty fallback:\n\n    iex> Enum.min([], fn -> 0 end)\n    0\n\n",
    },
    {
      name: "member?/2",
      type: "function",
      specs: ["@spec member?(t(), element()) :: boolean()"],
      documentation:
        "Checks if `element` exists within the `enumerable`.\n\nMembership is tested with the match (`===/2`) operator.\n\n## Examples\n\n    iex> Enum.member?(1..10, 5)\n    true\n    iex> Enum.member?(1..10, 5.0)\n    false\n\n    iex> Enum.member?([1.0, 2.0, 3.0], 2)\n    false\n    iex> Enum.member?([1.0, 2.0, 3.0], 2.000)\n    true\n\n    iex> Enum.member?([:a, :b, :c], :d)\n    false\n\n\nWhen called outside guards, the [`in`](`in/2`) and [`not in`](`in/2`)\noperators work by using this function.\n",
    },
    {
      name: "max_by/4",
      type: "function",
      specs: [
        "@spec max_by(\n        t(),\n        (element() -> any()),\n        (element(), element() -> boolean()) | module(),\n        (-> empty_result)\n      ) :: element() | empty_result\n      when empty_result: any()",
      ],
      documentation:
        'Returns the maximal element in the `enumerable` as calculated\nby the given `fun`.\n\nBy default, the comparison is done with the `>=` sorter function.\nIf multiple elements are considered maximal, the first one that\nwas found is returned. If you want the last element considered\nmaximal to be returned, the sorter function should not return true\nfor equal elements.\n\nCalls the provided `empty_fallback` function and returns its value if\n`enumerable` is empty. The default `empty_fallback` raises `Enum.EmptyError`.\n\n## Examples\n\n    iex> Enum.max_by(["a", "aa", "aaa"], fn x -> String.length(x) end)\n    "aaa"\n\n    iex> Enum.max_by(["a", "aa", "aaa", "b", "bbb"], &String.length/1)\n    "aaa"\n\nThe fact this function uses Erlang\'s term ordering means that the\ncomparison is structural and not semantic. Therefore, if you want\nto compare structs, most structs provide a "compare" function, such as\n`Date.compare/2`, which receives two structs and returns `:lt` (less-than),\n`:eq` (equal to), and `:gt` (greater-than). If you pass a module as the\nsorting function, Elixir will automatically use the `compare/2` function\nof said module:\n\n    iex> users = [\n    ...>   %{name: "Ellis", birthday: ~D[1943-05-11]},\n    ...>   %{name: "Lovelace", birthday: ~D[1815-12-10]},\n    ...>   %{name: "Turing", birthday: ~D[1912-06-23]}\n    ...> ]\n    iex> Enum.max_by(users, &(&1.birthday), Date)\n    %{name: "Ellis", birthday: ~D[1943-05-11]}\n\nFinally, if you don\'t want to raise on empty enumerables, you can pass\nthe empty fallback:\n\n    iex> Enum.max_by([], &String.length/1, fn -> nil end)\n    nil\n\n',
    },
    {
      name: "max/3",
      type: "function",
      specs: [
        "@spec max(\n        t(),\n        (element(), element() -> boolean()) | module(),\n        (-> empty_result)\n      ) :: element() | empty_result\n      when empty_result: any()",
      ],
      documentation:
        "Returns the maximal element in the `enumerable` according\nto Erlang's term ordering.\n\nBy default, the comparison is done with the `>=` sorter function.\nIf multiple elements are considered maximal, the first one that\nwas found is returned. If you want the last element considered\nmaximal to be returned, the sorter function should not return true\nfor equal elements.\n\nIf the enumerable is empty, the provided `empty_fallback` is called.\nThe default `empty_fallback` raises `Enum.EmptyError`.\n\n## Examples\n\n    iex> Enum.max([1, 2, 3])\n    3\n\nThe fact this function uses Erlang's term ordering means that the comparison\nis structural and not semantic. For example:\n\n    iex> Enum.max([~D[2017-03-31], ~D[2017-04-01]])\n    ~D[2017-03-31]\n\nIn the example above, `max/2` returned March 31st instead of April 1st\nbecause the structural comparison compares the day before the year.\nFor this reason, most structs provide a \"compare\" function, such as\n`Date.compare/2`, which receives two structs and returns `:lt` (less-than),\n`:eq` (equal to), and `:gt` (greater-than). If you pass a module as the\nsorting function, Elixir will automatically use the `compare/2` function\nof said module:\n\n    iex> Enum.max([~D[2017-03-31], ~D[2017-04-01]], Date)\n    ~D[2017-04-01]\n\nFinally, if you don't want to raise on empty enumerables, you can pass\nthe empty fallback:\n\n    iex> Enum.max([], &>=/2, fn -> 0 end)\n    0\n\n",
    },
    {
      name: "map_reduce/3",
      type: "function",
      specs: [
        "@spec map_reduce(t(), acc(), (element(), acc() -> {element(), acc()})) ::\n        {list(), acc()}",
      ],
      documentation:
        "Invokes the given function to each element in the `enumerable` to reduce\nit to a single element, while keeping an accumulator.\n\nReturns a tuple where the first element is the mapped enumerable and\nthe second one is the final accumulator.\n\nThe function, `fun`, receives two arguments: the first one is the\nelement, and the second one is the accumulator. `fun` must return\na tuple with two elements in the form of `{result, accumulator}`.\n\nFor maps, the first tuple element must be a `{key, value}` tuple.\n\n## Examples\n\n    iex> Enum.map_reduce([1, 2, 3], 0, fn x, acc -> {x * 2, x + acc} end)\n    {[2, 4, 6], 6}\n\n",
    },
    {
      name: "map_join/3",
      type: "function",
      specs: [
        "@spec map_join(t(), String.t(), (element() -> String.Chars.t())) :: String.t()",
      ],
      documentation:
        'Maps and joins the given `enumerable` in one pass.\n\nIf `joiner` is not passed at all, it defaults to an empty string.\n\nAll elements returned from invoking the `mapper` must be convertible to\na string, otherwise an error is raised.\n\n## Examples\n\n    iex> Enum.map_join([1, 2, 3], &(&1 * 2))\n    "246"\n\n    iex> Enum.map_join([1, 2, 3], " = ", &(&1 * 2))\n    "2 = 4 = 6"\n\n',
    },
    {
      name: "map_intersperse/3",
      type: "function",
      specs: [
        "@spec map_intersperse(t(), element(), (element() -> any())) :: list()",
      ],
      documentation:
        "Maps and intersperses the given enumerable in one pass.\n\n## Examples\n\n    iex> Enum.map_intersperse([1, 2, 3], :a, &(&1 * 2))\n    [2, :a, 4, :a, 6]\n",
    },
    {
      name: "map_every/3",
      type: "function",
      specs: [
        "@spec map_every(t(), non_neg_integer(), (element() -> any())) :: list()",
      ],
      documentation:
        "Returns a list of results of invoking `fun` on every `nth`\nelement of `enumerable`, starting with the first element.\n\nThe first element is always passed to the given function, unless `nth` is `0`.\n\nThe second argument specifying every `nth` element must be a non-negative\ninteger.\n\nIf `nth` is `0`, then `enumerable` is directly converted to a list,\nwithout `fun` being ever applied.\n\n## Examples\n\n    iex> Enum.map_every(1..10, 2, fn x -> x + 1000 end)\n    [1001, 2, 1003, 4, 1005, 6, 1007, 8, 1009, 10]\n\n    iex> Enum.map_every(1..10, 3, fn x -> x + 1000 end)\n    [1001, 2, 3, 1004, 5, 6, 1007, 8, 9, 1010]\n\n    iex> Enum.map_every(1..5, 0, fn x -> x + 1000 end)\n    [1, 2, 3, 4, 5]\n\n    iex> Enum.map_every([1, 2, 3], 1, fn x -> x + 1000 end)\n    [1001, 1002, 1003]\n\n",
    },
    {
      name: "map/2",
      type: "function",
      specs: ["@spec map(t(), (element() -> any())) :: list()"],
      documentation:
        "Returns a list where each element is the result of invoking\n`fun` on each corresponding element of `enumerable`.\n\nFor maps, the function expects a key-value tuple.\n\n## Examples\n\n    iex> Enum.map([1, 2, 3], fn x -> x * 2 end)\n    [2, 4, 6]\n\n    iex> Enum.map([a: 1, b: 2], fn {k, v} -> {k, -v} end)\n    [a: -1, b: -2]\n\n",
    },
    {
      name: "join/2",
      type: "function",
      specs: ["@spec join(t(), binary()) :: binary()"],
      documentation:
        'Joins the given `enumerable` into a string using `joiner` as a\nseparator.\n\nIf `joiner` is not passed at all, it defaults to an empty string.\n\nAll elements in the `enumerable` must be convertible to a string\nor be a binary, otherwise an error is raised.\n\n## Examples\n\n    iex> Enum.join([1, 2, 3])\n    "123"\n\n    iex> Enum.join([1, 2, 3], " = ")\n    "1 = 2 = 3"\n\n    iex> Enum.join([["a", "b"], ["c", "d", "e", ["f", "g"]], "h", "i"], " ")\n    "ab cdefg h i"\n\n',
    },
    {
      name: "into/3",
      type: "function",
      specs: [
        "@spec into(Enumerable.t(), Collectable.t(), (term() -> term())) ::\n        Collectable.t()",
      ],
      documentation:
        "Inserts the given `enumerable` into a `collectable` according to the\ntransformation function.\n\n## Examples\n\n    iex> Enum.into([1, 2, 3], [], fn x -> x * 3 end)\n    [3, 6, 9]\n\n    iex> Enum.into(%{a: 1, b: 2}, %{c: 3}, fn {k, v} -> {k, v * 2} end)\n    %{a: 2, b: 4, c: 3}\n\n",
    },
    {
      name: "into/2",
      type: "function",
      specs: ["@spec into(Enumerable.t(), Collectable.t()) :: Collectable.t()"],
      documentation:
        "Inserts the given `enumerable` into a `collectable`.\n\nNote that passing a non-empty list as the `collectable` is deprecated.\nIf you're collecting into a non-empty keyword list, consider using\n`Keyword.merge(collectable, Enum.to_list(enumerable))`. If you're collecting\ninto a non-empty list, consider something like `Enum.to_list(enumerable) ++ collectable`.\n\n## Examples\n\n    iex> Enum.into([1, 2], [])\n    [1, 2]\n\n    iex> Enum.into([a: 1, b: 2], %{})\n    %{a: 1, b: 2}\n\n    iex> Enum.into(%{a: 1}, %{b: 2})\n    %{a: 1, b: 2}\n\n    iex> Enum.into([a: 1, a: 2], %{})\n    %{a: 2}\n\n    iex> Enum.into([a: 2], %{a: 1, b: 3})\n    %{a: 2, b: 3}\n\n",
    },
    {
      name: "intersperse/2",
      type: "function",
      specs: ["@spec intersperse(t(), element()) :: list()"],
      documentation:
        "Intersperses `separator` between each element of the enumeration.\n\n## Examples\n\n    iex> Enum.intersperse([1, 2, 3], 0)\n    [1, 0, 2, 0, 3]\n\n    iex> Enum.intersperse([1], 0)\n    [1]\n\n    iex> Enum.intersperse([], 0)\n    []\n\n",
    },
    {
      name: "group_by/3",
      type: "function",
      specs: [
        "@spec group_by(t(), (element() -> any()), (element() -> any())) :: map()",
      ],
      documentation:
        'Splits the `enumerable` into groups based on `key_fun`.\n\nThe result is a map where each key is given by `key_fun`\nand each value is a list of elements given by `value_fun`.\nThe order of elements within each list is preserved from the `enumerable`.\nHowever, like all maps, the resulting map is unordered.\n\n## Examples\n\n    iex> Enum.group_by(~w{ant buffalo cat dingo}, &String.length/1)\n    %{3 => ["ant", "cat"], 5 => ["dingo"], 7 => ["buffalo"]}\n\n    iex> Enum.group_by(~w{ant buffalo cat dingo}, &String.length/1, &String.first/1)\n    %{3 => ["a", "c"], 5 => ["d"], 7 => ["b"]}\n\nThe key can be any Elixir value. For example, you may use a tuple\nto group by multiple keys:\n\n    iex> collection = [\n    ...>   %{id: 1, lang: "Elixir", seq: 1},\n    ...>   %{id: 1, lang: "Java", seq: 1},\n    ...>   %{id: 1, lang: "Ruby", seq: 2},\n    ...>   %{id: 2, lang: "Python", seq: 1},\n    ...>   %{id: 2, lang: "C#", seq: 2},\n    ...>   %{id: 2, lang: "Haskell", seq: 2},\n    ...> ]\n    iex> Enum.group_by(collection, &{&1.id, &1.seq})\n    %{\n      {1, 1} => [%{id: 1, lang: "Elixir", seq: 1}, %{id: 1, lang: "Java", seq: 1}],\n      {1, 2} => [%{id: 1, lang: "Ruby", seq: 2}],\n      {2, 1} => [%{id: 2, lang: "Python", seq: 1}],\n      {2, 2} => [%{id: 2, lang: "C#", seq: 2}, %{id: 2, lang: "Haskell", seq: 2}]\n    }\n    iex> Enum.group_by(collection, &{&1.id, &1.seq}, &{&1.id, &1.lang})\n    %{\n      {1, 1} => [{1, "Elixir"}, {1, "Java"}],\n      {1, 2} => [{1, "Ruby"}],\n      {2, 1} => [{2, "Python"}],\n      {2, 2} => [{2, "C#"}, {2, "Haskell"}]\n    }\n\n',
    },
    {
      name: "frequencies_by/2",
      type: "function",
      specs: ["@spec frequencies_by(t(), (element() -> any())) :: map()"],
      documentation:
        'Returns a map with keys as unique elements given by `key_fun` and values\nas the count of every element.\n\n## Examples\n\n    iex> Enum.frequencies_by(~w{aa aA bb cc}, &String.downcase/1)\n    %{"aa" => 2, "bb" => 1, "cc" => 1}\n\n    iex> Enum.frequencies_by(~w{aaa aA bbb cc c}, &String.length/1)\n    %{3 => 2, 2 => 2, 1 => 1}\n\n',
    },
    {
      name: "frequencies/1",
      type: "function",
      specs: ["@spec frequencies(t()) :: map()"],
      documentation:
        'Returns a map with keys as unique elements of `enumerable` and values\nas the count of every element.\n\n## Examples\n\n    iex> Enum.frequencies(~w{ant buffalo ant ant buffalo dingo})\n    %{"ant" => 3, "buffalo" => 2, "dingo" => 1}\n\n',
    },
    {
      name: "flat_map_reduce/3",
      type: "function",
      specs: [
        "@spec flat_map_reduce(t(), acc(), fun) :: {[any()], acc()}\n      when fun: (element(), acc() -> {t(), acc()} | {:halt, acc()})",
      ],
      documentation:
        "Maps and reduces an `enumerable`, flattening the given results (only one level deep).\n\nIt expects an accumulator and a function that receives each enumerable\nelement, and must return a tuple containing a new enumerable (often a list)\nwith the new accumulator or a tuple with `:halt` as first element and\nthe accumulator as second.\n\n## Examples\n\n    iex> enumerable = 1..100\n    iex> n = 3\n    iex> Enum.flat_map_reduce(enumerable, 0, fn x, acc ->\n    ...>   if acc < n, do: {[x], acc + 1}, else: {:halt, acc}\n    ...> end)\n    {[1, 2, 3], 3}\n\n    iex> Enum.flat_map_reduce(1..5, 0, fn x, acc -> {[[x]], acc + x} end)\n    {[[1], [2], [3], [4], [5]], 15}\n\n",
    },
    {
      name: "flat_map/2",
      type: "function",
      specs: ["@spec flat_map(t(), (element() -> t())) :: list()"],
      documentation:
        "Maps the given `fun` over `enumerable` and flattens the result.\n\nThis function returns a new enumerable built by appending the result of invoking `fun`\non each element of `enumerable` together; conceptually, this is similar to a\ncombination of `map/2` and `concat/1`.\n\n## Examples\n\n    iex> Enum.flat_map([:a, :b, :c], fn x -> [x, x] end)\n    [:a, :a, :b, :b, :c, :c]\n\n    iex> Enum.flat_map([{1, 3}, {4, 6}], fn {x, y} -> x..y end)\n    [1, 2, 3, 4, 5, 6]\n\n    iex> Enum.flat_map([:a, :b, :c], fn x -> [[x]] end)\n    [[:a], [:b], [:c]]\n\n",
    },
    {
      name: "find_value/3",
      type: "function",
      specs: [
        "@spec find_value(t(), default(), (element() -> found_value)) ::\n        found_value | default()\n      when found_value: term()",
      ],
      documentation:
        'Similar to `find/3`, but returns the value of the function\ninvocation instead of the element itself.\n\nThe return value is considered to be found when the result is truthy\n(neither `nil` nor `false`).\n\n## Examples\n\n    iex> Enum.find_value([2, 3, 4], fn x ->\n    ...>   if x > 2, do: x * x\n    ...> end)\n    9\n\n    iex> Enum.find_value([2, 4, 6], fn x -> rem(x, 2) == 1 end)\n    nil\n\n    iex> Enum.find_value([2, 3, 4], fn x -> rem(x, 2) == 1 end)\n    true\n\n    iex> Enum.find_value([1, 2, 3], "no bools!", &is_boolean/1)\n    "no bools!"\n\n',
    },
    {
      name: "find_index/2",
      type: "function",
      specs: [
        "@spec find_index(t(), (element() -> any())) :: non_neg_integer() | nil",
      ],
      documentation:
        "Similar to `find/3`, but returns the index (zero-based)\nof the element instead of the element itself.\n\n## Examples\n\n    iex> Enum.find_index([2, 4, 6], fn x -> rem(x, 2) == 1 end)\n    nil\n\n    iex> Enum.find_index([2, 3, 4], fn x -> rem(x, 2) == 1 end)\n    1\n\n",
    },
    {
      name: "find/3",
      type: "function",
      specs: [
        "@spec find(t(), default(), (element() -> any())) :: element() | default()",
      ],
      documentation:
        "Returns the first element for which `fun` returns a truthy value.\nIf no such element is found, returns `default`.\n\n## Examples\n\n    iex> Enum.find([2, 3, 4], fn x -> rem(x, 2) == 1 end)\n    3\n\n    iex> Enum.find([2, 4, 6], fn x -> rem(x, 2) == 1 end)\n    nil\n    iex> Enum.find([2, 4, 6], 0, fn x -> rem(x, 2) == 1 end)\n    0\n\n",
    },
    {
      name: "filter/2",
      type: "function",
      specs: ["@spec filter(t(), (element() -> as_boolean(term()))) :: list()"],
      documentation:
        'Filters the `enumerable`, i.e. returns only those elements\nfor which `fun` returns a truthy value.\n\nSee also `reject/2` which discards all elements where the\nfunction returns a truthy value.\n\n## Examples\n\n    iex> Enum.filter([1, 2, 3], fn x -> rem(x, 2) == 0 end)\n    [2]\n    iex> Enum.filter(["apple", "pear", "banana"], fn fruit -> String.contains?(fruit, "a") end)\n    ["apple", "pear", "banana"]\n    iex> Enum.filter([4, 21, 24, 904], fn seconds -> seconds > 1000 end)\n    []\n\nKeep in mind that `filter` is not capable of filtering and\ntransforming an element at the same time. If you would like\nto do so, consider using `flat_map/2`. For example, if you\nwant to convert all strings that represent an integer and\ndiscard the invalid one in one pass:\n\n    strings = ["1234", "abc", "12ab"]\n\n    Enum.flat_map(strings, fn string ->\n      case Integer.parse(string) do\n        # transform to integer\n        {int, _rest} -> [int]\n        # skip the value\n        :error -> []\n      end\n    end)\n\n',
    },
    {
      name: "fetch!/2",
      type: "function",
      specs: ["@spec fetch!(t(), index()) :: element()"],
      documentation:
        "Finds the element at the given `index` (zero-based).\n\nRaises `OutOfBoundsError` if the given `index` is outside the range of\nthe `enumerable`.\n\n## Examples\n\n    iex> Enum.fetch!([2, 4, 6], 0)\n    2\n\n    iex> Enum.fetch!([2, 4, 6], 2)\n    6\n\n    iex> Enum.fetch!([2, 4, 6], 4)\n    ** (Enum.OutOfBoundsError) out of bounds error\n\n",
    },
    {
      name: "fetch/2",
      type: "function",
      specs: ["@spec fetch(t(), index()) :: {:ok, element()} | :error"],
      documentation:
        "Finds the element at the given `index` (zero-based).\n\nReturns `{:ok, element}` if found, otherwise `:error`.\n\nA negative `index` can be passed, which means the `enumerable` is\nenumerated once and the `index` is counted from the end (for example,\n`-1` fetches the last element).\n\n## Examples\n\n    iex> Enum.fetch([2, 4, 6], 0)\n    {:ok, 2}\n\n    iex> Enum.fetch([2, 4, 6], -3)\n    {:ok, 2}\n\n    iex> Enum.fetch([2, 4, 6], 2)\n    {:ok, 6}\n\n    iex> Enum.fetch([2, 4, 6], 4)\n    :error\n\n",
    },
    {
      name: "empty?/1",
      type: "function",
      specs: ["@spec empty?(t()) :: boolean()"],
      documentation:
        "Determines if the `enumerable` is empty.\n\nReturns `true` if `enumerable` is empty, otherwise `false`.\n\n## Examples\n\n    iex> Enum.empty?([])\n    true\n\n    iex> Enum.empty?([1, 2, 3])\n    false\n\n",
    },
    {
      name: "each/2",
      type: "function",
      specs: ["@spec each(t(), (element() -> any())) :: :ok"],
      documentation:
        'Invokes the given `fun` for each element in the `enumerable`.\n\nReturns `:ok`.\n\n## Examples\n\n    Enum.each(["some", "example"], fn x -> IO.puts(x) end)\n    "some"\n    "example"\n    #=> :ok\n\n',
    },
    {
      name: "drop_while/2",
      type: "function",
      specs: [
        "@spec drop_while(t(), (element() -> as_boolean(term()))) :: list()",
      ],
      documentation:
        "Drops elements at the beginning of the `enumerable` while `fun` returns a\ntruthy value.\n\n## Examples\n\n    iex> Enum.drop_while([1, 2, 3, 2, 1], fn x -> x < 3 end)\n    [3, 2, 1]\n\n",
    },
    {
      name: "drop_every/2",
      type: "function",
      specs: ["@spec drop_every(t(), non_neg_integer()) :: list()"],
      documentation:
        "Returns a list of every `nth` element in the `enumerable` dropped,\nstarting with the first element.\n\nThe first element is always dropped, unless `nth` is 0.\n\nThe second argument specifying every `nth` element must be a non-negative\ninteger.\n\n## Examples\n\n    iex> Enum.drop_every(1..10, 2)\n    [2, 4, 6, 8, 10]\n\n    iex> Enum.drop_every(1..10, 0)\n    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\n\n    iex> Enum.drop_every([1, 2, 3], 1)\n    []\n\n",
    },
    {
      name: "drop/2",
      type: "function",
      specs: ["@spec drop(t(), integer()) :: list()"],
      documentation:
        "Drops the `amount` of elements from the `enumerable`.\n\nIf a negative `amount` is given, the `amount` of last values will be dropped.\nThe `enumerable` will be enumerated once to retrieve the proper index and\nthe remaining calculation is performed from the end.\n\n## Examples\n\n    iex> Enum.drop([1, 2, 3], 2)\n    [3]\n\n    iex> Enum.drop([1, 2, 3], 10)\n    []\n\n    iex> Enum.drop([1, 2, 3], 0)\n    [1, 2, 3]\n\n    iex> Enum.drop([1, 2, 3], -1)\n    [1, 2]\n\n",
    },
    {
      name: "dedup_by/2",
      type: "function",
      specs: ["@spec dedup_by(t(), (element() -> term())) :: list()"],
      documentation:
        "Enumerates the `enumerable`, returning a list where all consecutive\nduplicate elements are collapsed to a single element.\n\nThe function `fun` maps every element to a term which is used to\ndetermine if two elements are duplicates.\n\n## Examples\n\n    iex> Enum.dedup_by([{1, :a}, {2, :b}, {2, :c}, {1, :a}], fn {x, _} -> x end)\n    [{1, :a}, {2, :b}, {1, :a}]\n\n    iex> Enum.dedup_by([5, 1, 2, 3, 2, 1], fn x -> x > 2 end)\n    [5, 1, 3, 2]\n\n",
    },
    {
      name: "dedup/1",
      type: "function",
      specs: ["@spec dedup(t()) :: list()"],
      documentation:
        "Enumerates the `enumerable`, returning a list where all consecutive\nduplicate elements are collapsed to a single element.\n\nElements are compared using `===/2`.\n\nIf you want to remove all duplicate elements, regardless of order,\nsee `uniq/1`.\n\n## Examples\n\n    iex> Enum.dedup([1, 2, 3, 3, 2, 1])\n    [1, 2, 3, 2, 1]\n\n    iex> Enum.dedup([1, 1, 2, 2.0, :three, :three])\n    [1, 2, 2.0, :three]\n\n",
    },
    {
      name: "count_until/3",
      type: "function",
      specs: [
        "@spec count_until(t(), (element() -> as_boolean(term())), pos_integer()) ::\n        non_neg_integer()",
      ],
      documentation:
        "Counts the elements in the enumerable for which `fun` returns a truthy value, stopping at `limit`.\n\nSee `count/2` and `count_until/2` for more information.\n\n## Examples\n\n    iex> Enum.count_until(1..20, fn x -> rem(x, 2) == 0 end, 7)\n    7\n    iex> Enum.count_until(1..20, fn x -> rem(x, 2) == 0 end, 11)\n    10\n",
    },
    {
      name: "count_until/2",
      type: "function",
      specs: ["@spec count_until(t(), pos_integer()) :: non_neg_integer()"],
      documentation:
        "Counts the enumerable stopping at `limit`.\n\nThis is useful for checking certain properties of the count of an enumerable\nwithout having to actually count the entire enumerable. For example, if you\nwanted to check that the count was exactly, at least, or more than a value.\n\nIf the enumerable implements `c:Enumerable.count/1`, the enumerable is\nnot traversed and we return the lower of the two numbers. To force\nenumeration, use `count_until/3` with `fn _ -> true end` as the second\nargument.\n\n## Examples\n\n    iex> Enum.count_until(1..20, 5)\n    5\n    iex> Enum.count_until(1..20, 50)\n    20\n    iex> Enum.count_until(1..10, 10) == 10 # At least 10\n    true\n    iex> Enum.count_until(1..11, 10 + 1) > 10 # More than 10\n    true\n    iex> Enum.count_until(1..5, 10) < 10 # Less than 10\n    true\n    iex> Enum.count_until(1..10, 10 + 1) == 10 # Exactly ten\n    true\n\n",
    },
    {
      name: "count/2",
      type: "function",
      specs: [
        "@spec count(t(), (element() -> as_boolean(term()))) :: non_neg_integer()",
      ],
      documentation:
        "Returns the count of elements in the `enumerable` for which `fun` returns\na truthy value.\n\n## Examples\n\n    iex> Enum.count([1, 2, 3, 4, 5], fn x -> rem(x, 2) == 0 end)\n    2\n\n",
    },
    {
      name: "count/1",
      type: "function",
      specs: ["@spec count(t()) :: non_neg_integer()"],
      documentation:
        "Returns the size of the `enumerable`.\n\n## Examples\n\n    iex> Enum.count([1, 2, 3])\n    3\n\n",
    },
    {
      name: "concat/2",
      type: "function",
      specs: ["@spec concat(t(), t()) :: t()"],
      documentation:
        "Concatenates the enumerable on the `right` with the enumerable on the\n`left`.\n\nThis function produces the same result as the `++/2` operator\nfor lists.\n\n## Examples\n\n    iex> Enum.concat(1..3, 4..6)\n    [1, 2, 3, 4, 5, 6]\n\n    iex> Enum.concat([1, 2, 3], [4, 5, 6])\n    [1, 2, 3, 4, 5, 6]\n\n",
    },
    {
      name: "concat/1",
      type: "function",
      specs: ["@spec concat(t()) :: t()"],
      documentation:
        "Given an enumerable of enumerables, concatenates the `enumerables` into\na single list.\n\n## Examples\n\n    iex> Enum.concat([1..3, 4..6, 7..9])\n    [1, 2, 3, 4, 5, 6, 7, 8, 9]\n\n    iex> Enum.concat([[1, [2], 3], [4], [5, 6]])\n    [1, [2], 3, 4, 5, 6]\n\n",
    },
    {
      name: "chunk_while/4",
      type: "function",
      specs: [
        "@spec chunk_while(\n        t(),\n        acc(),\n        (element(), acc() ->\n           {:cont, chunk, acc()} | {:cont, acc()} | {:halt, acc()}),\n        (acc() -> {:cont, chunk, acc()} | {:cont, acc()})\n      ) :: Enumerable.t()\n      when chunk: any()",
      ],
      documentation:
        "Chunks the `enumerable` with fine grained control when every chunk is emitted.\n\n`chunk_fun` receives the current element and the accumulator and must return:\n\n  * `{:cont, chunk, acc}` to emit a chunk and continue with the accumulator\n  * `{:cont, acc}` to not emit any chunk and continue with the accumulator\n  * `{:halt, acc}` to halt chunking over the `enumerable`.\n\n`after_fun` is invoked with the final accumulator when iteration is\nfinished (or `halt`ed) to handle any trailing elements that were returned\nas part of an accumulator, but were not emitted as a chunk by `chunk_fun`.\nIt must return:\n\n  * `{:cont, chunk, acc}` to emit a chunk. The chunk will be appended to the\n    list of already emitted chunks.\n  * `{:cont, acc}` to not emit a chunk\n\nThe `acc` in `after_fun` is required in order to mirror the tuple format\nfrom `chunk_fun` but it will be discarded since the traversal is complete.\n\nReturns a list of emitted chunks.\n\n## Examples\n\n    iex> chunk_fun = fn element, acc ->\n    ...>   if rem(element, 2) == 0 do\n    ...>     {:cont, Enum.reverse([element | acc]), []}\n    ...>   else\n    ...>     {:cont, [element | acc]}\n    ...>   end\n    ...> end\n    iex> after_fun = fn\n    ...>   [] -> {:cont, []}\n    ...>   acc -> {:cont, Enum.reverse(acc), []}\n    ...> end\n    iex> Enum.chunk_while(1..10, [], chunk_fun, after_fun)\n    [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]]\n    iex> Enum.chunk_while([1, 2, 3, 5, 7], [], chunk_fun, after_fun)\n    [[1, 2], [3, 5, 7]]\n\n",
    },
    {
      name: "chunk_every/4",
      type: "function",
      specs: [
        "@spec chunk_every(t(), pos_integer(), pos_integer(), t() | :discard) :: [list()]",
      ],
      documentation:
        "Returns list of lists containing `count` elements each, where\neach new chunk starts `step` elements into the `enumerable`.\n\n`step` is optional and, if not passed, defaults to `count`, i.e.\nchunks do not overlap. Chunking will stop as soon as the collection\nends or when we emit an incomplete chunk.\n\nIf the last chunk does not have `count` elements to fill the chunk,\nelements are taken from `leftover` to fill in the chunk. If `leftover`\ndoes not have enough elements to fill the chunk, then a partial chunk\nis returned with less than `count` elements.\n\nIf `:discard` is given in `leftover`, the last chunk is discarded\nunless it has exactly `count` elements.\n\n## Examples\n\n    iex> Enum.chunk_every([1, 2, 3, 4, 5, 6], 2)\n    [[1, 2], [3, 4], [5, 6]]\n\n    iex> Enum.chunk_every([1, 2, 3, 4, 5, 6], 3, 2, :discard)\n    [[1, 2, 3], [3, 4, 5]]\n\n    iex> Enum.chunk_every([1, 2, 3, 4, 5, 6], 3, 2, [7])\n    [[1, 2, 3], [3, 4, 5], [5, 6, 7]]\n\n    iex> Enum.chunk_every([1, 2, 3, 4], 3, 3, [])\n    [[1, 2, 3], [4]]\n\n    iex> Enum.chunk_every([1, 2, 3, 4], 10)\n    [[1, 2, 3, 4]]\n\n    iex> Enum.chunk_every([1, 2, 3, 4, 5], 2, 3, [])\n    [[1, 2], [4, 5]]\n\n    iex> Enum.chunk_every([1, 2, 3, 4], 3, 3, Stream.cycle([0]))\n    [[1, 2, 3], [4, 0, 0]]\n\n",
    },
    {
      name: "chunk_every/2",
      type: "function",
      specs: ["@spec chunk_every(t(), pos_integer()) :: [list()]"],
      documentation: "Shortcut to `chunk_every(enumerable, count, count)`.\n",
    },
    {
      name: "chunk_by/2",
      type: "function",
      specs: ["@spec chunk_by(t(), (element() -> any())) :: [list()]"],
      documentation:
        "Splits enumerable on every element for which `fun` returns a new\nvalue.\n\nReturns a list of lists.\n\n## Examples\n\n    iex> Enum.chunk_by([1, 2, 2, 3, 4, 4, 6, 7, 7], &(rem(&1, 2) == 1))\n    [[1], [2, 2], [3], [4, 4, 6], [7, 7]]\n\n",
    },
    {
      name: "at/3",
      type: "function",
      specs: ["@spec at(t(), index(), default()) :: element() | default()"],
      documentation:
        "Finds the element at the given `index` (zero-based).\n\nReturns `default` if `index` is out of bounds.\n\nA negative `index` can be passed, which means the `enumerable` is\nenumerated once and the `index` is counted from the end (for example,\n`-1` finds the last element).\n\n## Examples\n\n    iex> Enum.at([2, 4, 6], 0)\n    2\n\n    iex> Enum.at([2, 4, 6], 2)\n    6\n\n    iex> Enum.at([2, 4, 6], 4)\n    nil\n\n    iex> Enum.at([2, 4, 6], 4, :none)\n    :none\n\n",
    },
    {
      name: "any?/2",
      type: "function",
      specs: [
        "@spec any?(t(), (element() -> as_boolean(term()))) :: boolean()",
      ],
      documentation:
        "Returns `true` if `fun.(element)` is truthy for at least one element in `enumerable`.\n\nIterates over the `enumerable` and invokes `fun` on each element. When an invocation\nof `fun` returns a truthy value (neither `false` nor `nil`) iteration stops\nimmediately and `true` is returned. In all other cases `false` is returned.\n\n## Examples\n\n    iex> Enum.any?([2, 4, 6], fn x -> rem(x, 2) == 1 end)\n    false\n\n    iex> Enum.any?([2, 3, 4], fn x -> rem(x, 2) == 1 end)\n    true\n\n    iex> Enum.any?([], fn x -> x > 0 end)\n    false\n\n",
    },
    {
      name: "any?/1",
      type: "function",
      specs: ["@spec any?(t()) :: boolean()"],
      documentation:
        "Returns `true` if at least one element in `enumerable` is truthy.\n\nWhen an element has a truthy value (neither `false` nor `nil`) iteration stops\nimmediately and `true` is returned. In all other cases `false` is returned.\n\n## Examples\n\n    iex> Enum.any?([false, false, false])\n    false\n\n    iex> Enum.any?([false, true, false])\n    true\n\n    iex> Enum.any?([])\n    false\n\n",
    },
    {
      name: "all?/2",
      type: "function",
      specs: [
        "@spec all?(t(), (element() -> as_boolean(term()))) :: boolean()",
      ],
      documentation:
        "Returns `true` if `fun.(element)` is truthy for all elements in `enumerable`.\n\nIterates over `enumerable` and invokes `fun` on each element. If `fun` ever\nreturns a falsy value (`false` or `nil`), iteration stops immediately and\n`false` is returned. Otherwise, `true` is returned.\n\n## Examples\n\n    iex> Enum.all?([2, 4, 6], fn x -> rem(x, 2) == 0 end)\n    true\n\n    iex> Enum.all?([2, 3, 4], fn x -> rem(x, 2) == 0 end)\n    false\n\n    iex> Enum.all?([], fn _ -> nil end)\n    true\n\nAs the last example shows, `Enum.all?/2` returns `true` if `enumerable` is\nempty, regardless of `fun`. In an empty enumerable there is no element for\nwhich `fun` returns a falsy value, so the result must be `true`. This is a\nwell-defined logical argument for empty collections.\n\n",
    },
    {
      name: "all?/1",
      type: "function",
      specs: ["@spec all?(t()) :: boolean()"],
      documentation:
        "Returns `true` if all elements in `enumerable` are truthy.\n\nWhen an element has a falsy value (`false` or `nil`) iteration stops immediately\nand `false` is returned. In all other cases `true` is returned.\n\n## Examples\n\n    iex> Enum.all?([1, 2, 3])\n    true\n\n    iex> Enum.all?([1, nil, 3])\n    false\n\n    iex> Enum.all?([])\n    true\n\n",
    },
  ],
  name: "Enum",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "default/0",
      type: "type",
      specs: ["@type default() :: any()"],
      documentation: null,
    },
    {
      name: "index/0",
      type: "type",
      specs: ["@type index() :: integer()"],
      documentation: "Zero-based index. It can also be a negative integer.",
    },
    {
      name: "element/0",
      type: "type",
      specs: ["@type element() :: any()"],
      documentation: null,
    },
    {
      name: "acc/0",
      type: "type",
      specs: ["@type acc() :: any()"],
      documentation: null,
    },
    {
      name: "t/0",
      type: "type",
      specs: ["@type t() :: Enumerable.t()"],
      documentation: null,
    },
  ],
};
