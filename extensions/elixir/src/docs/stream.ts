import type { ModuleDoc } from "../types";

export const Stream: ModuleDoc = {
  functions: [
    {
      name: "zip_with/3",
      type: "function",
      specs: [
        "@spec zip_with(Enumerable.t(), Enumerable.t(), (term(), term() -> term())) ::\n        Enumerable.t()",
      ],
      documentation:
        "Lazily zips corresponding elements from two enumerables into a new one, transforming them with\nthe `zip_fun` function as it goes.\n\nThe `zip_fun` will be called with the first element from `enumerable1` and the first\nelement from `enumerable2`, then with the second element from each, and so on until\neither one of the enumerables completes.\n\n## Examples\n\n    iex> concat = Stream.concat(1..3, 4..6)\n    iex> Stream.zip_with(concat, concat, fn a, b -> a + b end) |> Enum.to_list()\n    [2, 4, 6, 8, 10, 12]\n\n",
    },
    {
      name: "zip_with/2",
      type: "function",
      specs: [
        "@spec zip_with(enumerables, (Enumerable.t() -> term())) :: Enumerable.t()\n      when enumerables: [Enumerable.t()] | Enumerable.t()",
      ],
      documentation:
        "Lazily zips corresponding elements from a finite collection of enumerables into a new\nenumerable, transforming them with the `zip_fun` function as it goes.\n\nThe first element from each of the enums in `enumerables` will be put into a list which is then passed to\nthe one-arity `zip_fun` function. Then, the second elements from each of the enums are put into a list and passed to\n`zip_fun`, and so on until any one of the enums in `enumerables` completes.\n\nReturns a new enumerable with the results of calling `zip_fun`.\n\n## Examples\n\n    iex> concat = Stream.concat(1..3, 4..6)\n    iex> Stream.zip_with([concat, concat], fn [a, b] -> a + b end) |> Enum.to_list()\n    [2, 4, 6, 8, 10, 12]\n\n    iex> concat = Stream.concat(1..3, 4..6)\n    iex> Stream.zip_with([concat, concat, 1..3], fn [a, b, c] -> a + b + c end) |> Enum.to_list()\n    [3, 6, 9]\n\n",
    },
    {
      name: "zip/2",
      type: "function",
      specs: ["@spec zip(Enumerable.t(), Enumerable.t()) :: Enumerable.t()"],
      documentation:
        "Zips two enumerables together, lazily.\n\nBecause a list of two-element tuples with atoms as the first\ntuple element is a keyword list (`Keyword`), zipping a first `Stream`\nof atoms with a second `Stream` of any kind creates a `Stream`\nthat generates a keyword list.\n\nThe zipping finishes as soon as either enumerable completes.\n\n## Examples\n\n    iex> concat = Stream.concat(1..3, 4..6)\n    iex> cycle = Stream.cycle([:a, :b, :c])\n    iex> Stream.zip(concat, cycle) |> Enum.to_list()\n    [{1, :a}, {2, :b}, {3, :c}, {4, :a}, {5, :b}, {6, :c}]\n    iex> Stream.zip(cycle, concat) |> Enum.to_list()\n    [a: 1, b: 2, c: 3, a: 4, b: 5, c: 6]\n\n",
    },
    {
      name: "zip/1",
      type: "function",
      specs: [
        "@spec zip(enumerables) :: Enumerable.t()\n      when enumerables: [Enumerable.t()] | Enumerable.t()",
      ],
      documentation:
        'Zips corresponding elements from a finite collection of enumerables\ninto one stream of tuples.\n\nThe zipping finishes as soon as any enumerable in the given collection completes.\n\n## Examples\n\n    iex> concat = Stream.concat(1..3, 4..6)\n    iex> cycle = Stream.cycle(["foo", "bar", "baz"])\n    iex> Stream.zip([concat, [:a, :b, :c], cycle]) |> Enum.to_list()\n    [{1, :a, "foo"}, {2, :b, "bar"}, {3, :c, "baz"}]\n\n',
    },
    {
      name: "with_index/2",
      type: "function",
      specs: [
        "@spec with_index(Enumerable.t(), integer()) ::\n        Enumerable.t({element(), integer()})",
        "@spec with_index(Enumerable.t(), (element(), index() -> return_value)) ::\n        Enumerable.t(return_value)\n      when return_value: term()",
      ],
      documentation:
        "Creates a stream where each element in the enumerable will\nbe wrapped in a tuple alongside its index or according to a given function.\n\nMay receive a function or an integer offset.\n\nIf an `offset` is given, it will index from the given offset instead of from\nzero.\n\nIf a `function` is given, it will index by invoking the function for each\nelement and index (zero-based) of the enumerable.\n\n## Examples\n\n    iex> stream = Stream.with_index([1, 2, 3])\n    iex> Enum.to_list(stream)\n    [{1, 0}, {2, 1}, {3, 2}]\n\n    iex> stream = Stream.with_index([1, 2, 3], 3)\n    iex> Enum.to_list(stream)\n    [{1, 3}, {2, 4}, {3, 5}]\n\n    iex> stream = Stream.with_index([1, 2, 3], fn x, index -> x + index end)\n    iex> Enum.to_list(stream)\n    [1, 3, 5]\n\n",
    },
    {
      name: "uniq_by/2",
      type: "function",
      specs: [
        "@spec uniq_by(Enumerable.t(), (element() -> term())) :: Enumerable.t()",
      ],
      documentation:
        "Creates a stream that only emits elements if they are unique, by removing the\nelements for which function `fun` returned duplicate elements.\n\nThe function `fun` maps every element to a term which is used to\ndetermine if two elements are duplicates.\n\nKeep in mind that, in order to know if an element is unique\nor not, this function needs to store all unique values emitted\nby the stream. Therefore, if the stream is infinite, the number\nof elements stored will grow infinitely, never being garbage-collected.\n\n## Example\n\n    iex> Stream.uniq_by([{1, :x}, {2, :y}, {1, :z}], fn {x, _} -> x end) |> Enum.to_list()\n    [{1, :x}, {2, :y}]\n\n    iex> Stream.uniq_by([a: {:tea, 2}, b: {:tea, 2}, c: {:coffee, 1}], fn {_, y} -> y end) |> Enum.to_list()\n    [a: {:tea, 2}, c: {:coffee, 1}]\n\n",
    },
    {
      name: "uniq/1",
      type: "function",
      specs: ["@spec uniq(Enumerable.t()) :: Enumerable.t()"],
      documentation:
        "Creates a stream that only emits elements if they are unique.\n\nKeep in mind that, in order to know if an element is unique\nor not, this function needs to store all unique values emitted\nby the stream. Therefore, if the stream is infinite, the number\nof elements stored will grow infinitely, never being garbage-collected.\n\n## Examples\n\n    iex> Stream.uniq([1, 2, 3, 3, 2, 1]) |> Enum.to_list()\n    [1, 2, 3]\n\n",
    },
    {
      name: "unfold/2",
      type: "function",
      specs: [
        "@spec unfold(acc(), (acc() -> {element(), acc()} | nil)) :: Enumerable.t()",
      ],
      documentation:
        "Emits a sequence of values for the given accumulator.\n\nSuccessive values are generated by calling `next_fun` with the previous\naccumulator and it must return a tuple with the current value and next\naccumulator. The enumeration finishes if it returns `nil`.\n\n## Examples\n\nTo create a stream that counts down and stops before zero:\n\n    iex> Stream.unfold(5, fn\n    ...>   0 -> nil\n    ...>   n -> {n, n - 1}\n    ...> end) |> Enum.to_list()\n    [5, 4, 3, 2, 1]\n\nIf `next_fun` never returns `nil`, the returned stream is *infinite*:\n\n    iex> Stream.unfold(0, fn\n    ...>   n -> {n, n + 1}\n    ...> end) |> Enum.take(10)\n    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]\n\n    iex> Stream.unfold(1, fn\n    ...>   n -> {n, n * 2}\n    ...> end) |> Enum.take(10)\n    [1, 2, 4, 8, 16, 32, 64, 128, 256, 512]\n\n",
    },
    {
      name: "transform/5",
      type: "function",
      specs: [
        "@spec transform(Enumerable.t(), start_fun, reducer, last_fun, after_fun) ::\n        Enumerable.t()\n      when start_fun: (-> acc),\n           reducer: (element(), acc -> {Enumerable.t(), acc} | {:halt, acc}),\n           last_fun: (acc -> {Enumerable.t(), acc} | {:halt, acc}),\n           after_fun: (acc -> term()),\n           acc: any()",
      ],
      documentation:
        "Transforms an existing stream with function-based start, last, and after\ncallbacks.\n\nOnce transformation starts, `start_fun` is invoked to compute the initial\naccumulator. Then, for each element in the enumerable, the `reducer` function\nis invoked with the element and the accumulator, returning new elements and a\nnew accumulator, as in `transform/3`.\n\nOnce the collection is done, `last_fun` is invoked with the accumulator to\nemit any remaining items. Then `after_fun` is invoked, to close any resource,\nbut not emitting any new items. `last_fun` is only invoked if the given\nenumerable terminates successfully (either because it is done or it halted\nitself). `after_fun` is always invoked, therefore `after_fun` must be the\none used for closing resources.\n",
    },
    {
      name: "transform/4",
      type: "function",
      specs: [
        "@spec transform(Enumerable.t(), start_fun, reducer, after_fun) :: Enumerable.t()\n      when start_fun: (-> acc),\n           reducer: (element(), acc -> {Enumerable.t(), acc} | {:halt, acc}),\n           after_fun: (acc -> term()),\n           acc: any()",
      ],
      documentation:
        "Similar to `Stream.transform/5`, except `last_fun` is not supplied.\n\nThis function can be seen as a combination of `Stream.resource/3` with\n`Stream.transform/3`.\n",
    },
    {
      name: "transform/3",
      type: "function",
      specs: [
        "@spec transform(Enumerable.t(), acc, fun) :: Enumerable.t()\n      when fun: (element(), acc -> {Enumerable.t(), acc} | {:halt, acc}),\n           acc: any()",
      ],
      documentation:
        "Transforms an existing stream.\n\nIt expects an accumulator and a function that receives two arguments,\nthe stream element and the updated accumulator. It must return a tuple,\nwhere the first element is a new stream (often a list) or the atom `:halt`,\nand the second element is the accumulator to be used by the next element.\n\nNote: this function is equivalent to `Enum.flat_map_reduce/3`, except this\nfunction does not return the accumulator once the stream is processed.\n\n## Examples\n\n`Stream.transform/3` is useful as it can be used as the basis to implement\nmany of the functions defined in this module. For example, we can implement\n`Stream.take(enum, n)` as follows:\n\n    iex> enum = 1001..9999\n    iex> n = 3\n    iex> stream = Stream.transform(enum, 0, fn i, acc ->\n    ...>   if acc < n, do: {[i], acc + 1}, else: {:halt, acc}\n    ...> end)\n    iex> Enum.to_list(stream)\n    [1001, 1002, 1003]\n\n`Stream.transform/5` further generalizes this function to allow wrapping\naround resources.\n",
    },
    {
      name: "timer/1",
      type: "function",
      specs: ["@spec timer(timer()) :: Enumerable.t()"],
      documentation:
        "Creates a stream that emits a single value after `n` milliseconds.\n\nThe value emitted is `0`. This operation will block the caller by\nthe given time until the element is streamed.\n\n## Examples\n\n    iex> Stream.timer(10) |> Enum.to_list()\n    [0]\n\n",
    },
    {
      name: "take_while/2",
      type: "function",
      specs: [
        "@spec take_while(Enumerable.t(), (element() -> as_boolean(term()))) ::\n        Enumerable.t()",
      ],
      documentation:
        "Lazily takes elements of the enumerable while the given\nfunction returns a truthy value.\n\n## Examples\n\n    iex> stream = Stream.take_while(1..100, &(&1 <= 5))\n    iex> Enum.to_list(stream)\n    [1, 2, 3, 4, 5]\n\n",
    },
    {
      name: "take_every/2",
      type: "function",
      specs: [
        "@spec take_every(Enumerable.t(), non_neg_integer()) :: Enumerable.t()",
      ],
      documentation:
        "Creates a stream that takes every `nth` element from the enumerable.\n\nThe first element is always included, unless `nth` is 0.\n\n`nth` must be a non-negative integer.\n\n## Examples\n\n    iex> stream = Stream.take_every(1..10, 2)\n    iex> Enum.to_list(stream)\n    [1, 3, 5, 7, 9]\n\n    iex> stream = Stream.take_every([1, 2, 3, 4, 5], 1)\n    iex> Enum.to_list(stream)\n    [1, 2, 3, 4, 5]\n\n    iex> stream = Stream.take_every(1..1000, 0)\n    iex> Enum.to_list(stream)\n    []\n\n",
    },
    {
      name: "take/2",
      type: "function",
      specs: ["@spec take(Enumerable.t(), integer()) :: Enumerable.t()"],
      documentation:
        "Lazily takes the next `count` elements from the enumerable and stops\nenumeration.\n\nIf a negative `count` is given, the last `count` values will be taken.\nFor such, the collection is fully enumerated keeping up to `2 * count`\nelements in memory. Once the end of the collection is reached,\nthe last `count` elements will be executed. Therefore, using\na negative `count` on an infinite collection will never return.\n\n## Examples\n\n    iex> stream = Stream.take(1..100, 5)\n    iex> Enum.to_list(stream)\n    [1, 2, 3, 4, 5]\n\n    iex> stream = Stream.take(1..100, -5)\n    iex> Enum.to_list(stream)\n    [96, 97, 98, 99, 100]\n\n    iex> stream = Stream.cycle([1, 2, 3]) |> Stream.take(5)\n    iex> Enum.to_list(stream)\n    [1, 2, 3, 1, 2]\n\n",
    },
    {
      name: "scan/3",
      type: "function",
      specs: [
        "@spec scan(Enumerable.t(), acc(), (element(), acc() -> any())) :: Enumerable.t()",
      ],
      documentation:
        "Creates a stream that applies the given function to each\nelement, emits the result and uses the same result as the accumulator\nfor the next computation. Uses the given `acc` as the starting value.\n\n## Examples\n\n    iex> stream = Stream.scan(1..5, 0, &(&1 + &2))\n    iex> Enum.to_list(stream)\n    [1, 3, 6, 10, 15]\n\n",
    },
    {
      name: "scan/2",
      type: "function",
      specs: [
        "@spec scan(Enumerable.t(), (element(), acc() -> any())) :: Enumerable.t()",
      ],
      documentation:
        "Creates a stream that applies the given function to each\nelement, emits the result and uses the same result as the accumulator\nfor the next computation. Uses the first element in the enumerable\nas the starting value.\n\n## Examples\n\n    iex> stream = Stream.scan(1..5, &(&1 + &2))\n    iex> Enum.to_list(stream)\n    [1, 3, 6, 10, 15]\n\n",
    },
    {
      name: "run/1",
      type: "function",
      specs: ["@spec run(Enumerable.t()) :: :ok"],
      documentation:
        'Runs the given stream.\n\nThis is useful when a stream needs to be run, for side effects,\nand there is no interest in its return result.\n\n## Examples\n\nOpen up a file, replace all `#` by `%` and stream to another file\nwithout loading the whole file in memory:\n\n    File.stream!("/path/to/file")\n    |> Stream.map(&String.replace(&1, "#", "%"))\n    |> Stream.into(File.stream!("/path/to/other/file"))\n    |> Stream.run()\n\nNo computation will be done until we call one of the `Enum` functions\nor `run/1`.\n',
    },
    {
      name: "resource/3",
      type: "function",
      specs: [
        "@spec resource(\n        (-> acc()),\n        (acc() -> {[element()], acc()} | {:halt, acc()}),\n        (acc() -> term())\n      ) :: Enumerable.t()",
      ],
      documentation:
        'Emits a sequence of values for the given resource.\n\nSimilar to `transform/3` but the initial accumulated value is\ncomputed lazily via `start_fun` and executes an `after_fun` at\nthe end of enumeration (both in cases of success and failure).\n\nSuccessive values are generated by calling `next_fun` with the\nprevious accumulator (the initial value being the result returned\nby `start_fun`) and it must return a tuple containing a list\nof elements to be emitted and the next accumulator. The enumeration\nfinishes if it returns `{:halt, acc}`.\n\nAs the function name suggests, this function is useful to stream values from\nresources.\n\n## Examples\n\n    Stream.resource(\n      fn -> File.open!("sample") end,\n      fn file ->\n        case IO.read(file, :line) do\n          data when is_binary(data) -> {[data], file}\n          _ -> {:halt, file}\n        end\n      end,\n      fn file -> File.close(file) end\n    )\n\n    iex> Stream.resource(\n    ...>  fn ->\n    ...>    {:ok, pid} = StringIO.open("string")\n    ...>    pid\n    ...>  end,\n    ...>  fn pid ->\n    ...>    case IO.getn(pid, "", 1) do\n    ...>      :eof -> {:halt, pid}\n    ...>      char -> {[char], pid}\n    ...>    end\n    ...>  end,\n    ...>  fn pid -> StringIO.close(pid) end\n    ...> ) |> Enum.to_list()\n    ["s", "t", "r", "i", "n", "g"]\n\n',
    },
    {
      name: "repeatedly/1",
      type: "function",
      specs: ["@spec repeatedly((-> element())) :: Enumerable.t()"],
      documentation:
        "Returns a stream generated by calling `generator_fun` repeatedly.\n\n## Examples\n\n    # Although not necessary, let's seed the random algorithm\n    iex> :rand.seed(:exsss, {1, 2, 3})\n    iex> Stream.repeatedly(&:rand.uniform/0) |> Enum.take(3)\n    [0.5455598952593053, 0.6039309974353404, 0.6684893034823949]\n\n",
    },
    {
      name: "reject/2",
      type: "function",
      specs: [
        "@spec reject(Enumerable.t(), (element() -> as_boolean(term()))) ::\n        Enumerable.t()",
      ],
      documentation:
        "Creates a stream that will reject elements according to\nthe given function on enumeration.\n\n## Examples\n\n    iex> stream = Stream.reject([1, 2, 3], fn x -> rem(x, 2) == 0 end)\n    iex> Enum.to_list(stream)\n    [1, 3]\n\n",
    },
    {
      name: "map_every/3",
      type: "function",
      specs: [
        "@spec map_every(Enumerable.t(), non_neg_integer(), (element() -> any())) ::\n        Enumerable.t()",
      ],
      documentation:
        "Creates a stream that will apply the given function on\nevery `nth` element from the enumerable.\n\nThe first element is always passed to the given function.\n\n`nth` must be a non-negative integer.\n\n## Examples\n\n    iex> stream = Stream.map_every(1..10, 2, fn x -> x * 2 end)\n    iex> Enum.to_list(stream)\n    [2, 2, 6, 4, 10, 6, 14, 8, 18, 10]\n\n    iex> stream = Stream.map_every([1, 2, 3, 4, 5], 1, fn x -> x * 2 end)\n    iex> Enum.to_list(stream)\n    [2, 4, 6, 8, 10]\n\n    iex> stream = Stream.map_every(1..5, 0, fn x -> x * 2 end)\n    iex> Enum.to_list(stream)\n    [1, 2, 3, 4, 5]\n\n",
    },
    {
      name: "map/2",
      type: "function",
      specs: [
        "@spec map(Enumerable.t(), (element() -> any())) :: Enumerable.t()",
      ],
      documentation:
        "Creates a stream that will apply the given function on\nenumeration.\n\n## Examples\n\n    iex> stream = Stream.map([1, 2, 3], fn x -> x * 2 end)\n    iex> Enum.to_list(stream)\n    [2, 4, 6]\n\n",
    },
    {
      name: "iterate/2",
      type: "function",
      specs: [
        "@spec iterate(element(), (element() -> element())) :: Enumerable.t()",
      ],
      documentation:
        "Emits a sequence of values, starting with `start_value`.\n\nSuccessive values are generated by calling `next_fun`\non the previous value.\n\n## Examples\n\n    iex> Stream.iterate(1, &(&1 * 2)) |> Enum.take(5)\n    [1, 2, 4, 8, 16]\n\n",
    },
    {
      name: "into/3",
      type: "function",
      specs: [
        "@spec into(Enumerable.t(), Collectable.t(), (term() -> term())) ::\n        Enumerable.t()",
      ],
      documentation:
        "Injects the stream values into the given collectable as a side-effect.\n\nThis function is often used with `run/1` since any evaluation\nis delayed until the stream is executed. See `run/1` for an example.\n",
    },
    {
      name: "interval/1",
      type: "function",
      specs: ["@spec interval(timer()) :: Enumerable.t()"],
      documentation:
        "Creates a stream that emits a value after the given period `n`\nin milliseconds.\n\nThe values emitted are an increasing counter starting at `0`.\nThis operation will block the caller by the given interval\nevery time a new element is streamed.\n\nDo not use this function to generate a sequence of numbers.\nIf blocking the caller process is not necessary, use\n`Stream.iterate(0, & &1 + 1)` instead.\n\n## Examples\n\n    iex> Stream.interval(10) |> Enum.take(10)\n    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]\n\n",
    },
    {
      name: "intersperse/2",
      type: "function",
      specs: ["@spec intersperse(Enumerable.t(), any()) :: Enumerable.t()"],
      documentation:
        "Lazily intersperses `intersperse_element` between each element of the enumeration.\n\n## Examples\n\n    iex> Stream.intersperse([1, 2, 3], 0) |> Enum.to_list()\n    [1, 0, 2, 0, 3]\n\n    iex> Stream.intersperse([1], 0) |> Enum.to_list()\n    [1]\n\n    iex> Stream.intersperse([], 0) |> Enum.to_list()\n    []\n\n",
    },
    {
      name: "from_index/1",
      type: "function",
      specs: [
        "@spec from_index(integer()) :: Enumerable.t(integer())",
        "@spec from_index((integer() -> return_value)) :: Enumerable.t(return_value)\n      when return_value: term()",
      ],
      documentation:
        "Builds a stream from an index, either starting from offset, or given by function.\n\nMay receive a function or an integer offset.\n\nIf an `offset` is given, it will emit elements from offset.\n\nIf a `function` is given, it will invoke the function with\nelements from offset.\n\n## Examples\n\n    iex> Stream.from_index() |> Enum.take(3)\n    [0, 1, 2]\n\n    iex> Stream.from_index(1) |> Enum.take(3)\n    [1, 2, 3]\n\n    iex> Stream.from_index(fn x -> x * 10 end) |> Enum.take(3)\n    [0, 10, 20]\n\n",
    },
    {
      name: "flat_map/2",
      type: "function",
      specs: [
        "@spec flat_map(Enumerable.t(), (element() -> Enumerable.t())) :: Enumerable.t()",
      ],
      documentation:
        "Maps the given `fun` over `enumerable` and flattens the result.\n\nThis function returns a new stream built by appending the result of invoking `fun`\non each element of `enumerable` together.\n\n## Examples\n\n    iex> stream = Stream.flat_map([1, 2, 3], fn x -> [x, x * 2] end)\n    iex> Enum.to_list(stream)\n    [1, 2, 2, 4, 3, 6]\n\n    iex> stream = Stream.flat_map([1, 2, 3], fn x -> [[x]] end)\n    iex> Enum.to_list(stream)\n    [[1], [2], [3]]\n\n",
    },
    {
      name: "filter/2",
      type: "function",
      specs: [
        "@spec filter(Enumerable.t(), (element() -> as_boolean(term()))) ::\n        Enumerable.t()",
      ],
      documentation:
        "Creates a stream that filters elements according to\nthe given function on enumeration.\n\n## Examples\n\n    iex> stream = Stream.filter([1, 2, 3], fn x -> rem(x, 2) == 0 end)\n    iex> Enum.to_list(stream)\n    [2]\n\n",
    },
    {
      name: "each/2",
      type: "function",
      specs: [
        "@spec each(Enumerable.t(), (element() -> term())) :: Enumerable.t()",
      ],
      documentation:
        "Executes the given function for each element.\n\nThe values in the stream do not change, therefore this\nfunction is useful for adding side effects (like printing)\nto a stream. See `map/2` if producing a different stream\nis desired.\n\n## Examples\n\n    iex> stream = Stream.each([1, 2, 3], fn x -> send(self(), x) end)\n    iex> Enum.to_list(stream)\n    iex> receive do: (x when is_integer(x) -> x)\n    1\n    iex> receive do: (x when is_integer(x) -> x)\n    2\n    iex> receive do: (x when is_integer(x) -> x)\n    3\n\n",
    },
    {
      name: "duplicate/2",
      type: "function",
      specs: ["@spec duplicate(any(), non_neg_integer()) :: Enumerable.t()"],
      documentation:
        'Duplicates the given element `n` times in a stream.\n\n`n` is an integer greater than or equal to `0`.\n\nIf `n` is `0`, an empty stream is returned.\n\n## Examples\n\n    iex> stream = Stream.duplicate("hello", 0)\n    iex> Enum.to_list(stream)\n    []\n\n    iex> stream = Stream.duplicate("hi", 1)\n    iex> Enum.to_list(stream)\n    ["hi"]\n\n    iex> stream = Stream.duplicate("bye", 2)\n    iex> Enum.to_list(stream)\n    ["bye", "bye"]\n\n    iex> stream = Stream.duplicate([1, 2], 3)\n    iex> Enum.to_list(stream)\n    [[1, 2], [1, 2], [1, 2]]\n',
    },
    {
      name: "drop_while/2",
      type: "function",
      specs: [
        "@spec drop_while(Enumerable.t(), (element() -> as_boolean(term()))) ::\n        Enumerable.t()",
      ],
      documentation:
        "Lazily drops elements of the enumerable while the given\nfunction returns a truthy value.\n\n## Examples\n\n    iex> stream = Stream.drop_while(1..10, &(&1 <= 5))\n    iex> Enum.to_list(stream)\n    [6, 7, 8, 9, 10]\n\n",
    },
    {
      name: "drop_every/2",
      type: "function",
      specs: [
        "@spec drop_every(Enumerable.t(), non_neg_integer()) :: Enumerable.t()",
      ],
      documentation:
        "Creates a stream that drops every `nth` element from the enumerable.\n\nThe first element is always dropped, unless `nth` is 0.\n\n`nth` must be a non-negative integer.\n\n## Examples\n\n    iex> stream = Stream.drop_every(1..10, 2)\n    iex> Enum.to_list(stream)\n    [2, 4, 6, 8, 10]\n\n    iex> stream = Stream.drop_every(1..1000, 1)\n    iex> Enum.to_list(stream)\n    []\n\n    iex> stream = Stream.drop_every([1, 2, 3, 4, 5], 0)\n    iex> Enum.to_list(stream)\n    [1, 2, 3, 4, 5]\n\n",
    },
    {
      name: "drop/2",
      type: "function",
      specs: ["@spec drop(Enumerable.t(), integer()) :: Enumerable.t()"],
      documentation:
        "Lazily drops the next `n` elements from the enumerable.\n\nIf a negative `n` is given, it will drop the last `n` elements from\nthe collection. Note that the mechanism by which this is implemented\nwill delay the emission of any element until `n` additional elements have\nbeen emitted by the enum.\n\n## Examples\n\n    iex> stream = Stream.drop(1..10, 5)\n    iex> Enum.to_list(stream)\n    [6, 7, 8, 9, 10]\n\n    iex> stream = Stream.drop(1..10, -5)\n    iex> Enum.to_list(stream)\n    [1, 2, 3, 4, 5]\n\n",
    },
    {
      name: "dedup_by/2",
      type: "function",
      specs: [
        "@spec dedup_by(Enumerable.t(), (element() -> term())) :: Enumerable.t()",
      ],
      documentation:
        "Creates a stream that only emits elements if the result of calling `fun` on the element is\ndifferent from the (stored) result of calling `fun` on the last emitted element.\n\n## Examples\n\n    iex> Stream.dedup_by([{1, :x}, {2, :y}, {2, :z}, {1, :x}], fn {x, _} -> x end) |> Enum.to_list()\n    [{1, :x}, {2, :y}, {1, :x}]\n\n",
    },
    {
      name: "dedup/1",
      type: "function",
      specs: ["@spec dedup(Enumerable.t()) :: Enumerable.t()"],
      documentation:
        "Creates a stream that only emits elements if they are different from the last emitted element.\n\nThis function only ever needs to store the last emitted element.\n\nElements are compared using `===/2`.\n\n## Examples\n\n    iex> Stream.dedup([1, 2, 3, 3, 2, 1]) |> Enum.to_list()\n    [1, 2, 3, 2, 1]\n\n",
    },
    {
      name: "cycle/1",
      type: "function",
      specs: ["@spec cycle(Enumerable.t()) :: Enumerable.t()"],
      documentation:
        "Creates a stream that cycles through the given enumerable,\ninfinitely.\n\n## Examples\n\n    iex> stream = Stream.cycle([1, 2, 3])\n    iex> Enum.take(stream, 5)\n    [1, 2, 3, 1, 2]\n\n",
    },
    {
      name: "concat/2",
      type: "function",
      specs: ["@spec concat(Enumerable.t(), Enumerable.t()) :: Enumerable.t()"],
      documentation:
        "Creates a stream that enumerates the first argument, followed by the second.\n\n## Examples\n\n    iex> stream = Stream.concat(1..3, 4..6)\n    iex> Enum.to_list(stream)\n    [1, 2, 3, 4, 5, 6]\n\n    iex> stream1 = Stream.cycle([1, 2, 3])\n    iex> stream2 = Stream.cycle([4, 5, 6])\n    iex> stream = Stream.concat(stream1, stream2)\n    iex> Enum.take(stream, 6)\n    [1, 2, 3, 1, 2, 3]\n\n",
    },
    {
      name: "concat/1",
      type: "function",
      specs: ["@spec concat(Enumerable.t()) :: Enumerable.t()"],
      documentation:
        "Creates a stream that enumerates each enumerable in an enumerable.\n\n## Examples\n\n    iex> stream = Stream.concat([1..3, 4..6, 7..9])\n    iex> Enum.to_list(stream)\n    [1, 2, 3, 4, 5, 6, 7, 8, 9]\n\n",
    },
    {
      name: "chunk_while/4",
      type: "function",
      specs: [
        "@spec chunk_while(\n        Enumerable.t(),\n        acc(),\n        (element(), acc() ->\n           {:cont, chunk, acc()} | {:cont, acc()} | {:halt, acc()}),\n        (acc() -> {:cont, chunk, acc()} | {:cont, acc()})\n      ) :: Enumerable.t()\n      when chunk: any()",
      ],
      documentation:
        "Chunks the `enum` with fine grained control when every chunk is emitted.\n\n`chunk_fun` receives the current element and the accumulator and\nmust return `{:cont, element, acc}` to emit the given chunk and\ncontinue with accumulator or `{:cont, acc}` to not emit any chunk\nand continue with the return accumulator.\n\n`after_fun` is invoked when iteration is done and must also return\n`{:cont, element, acc}` or `{:cont, acc}`.\n\n## Examples\n\n    iex> chunk_fun = fn element, acc ->\n    ...>   if rem(element, 2) == 0 do\n    ...>     {:cont, Enum.reverse([element | acc]), []}\n    ...>   else\n    ...>     {:cont, [element | acc]}\n    ...>   end\n    ...> end\n    iex> after_fun = fn\n    ...>   [] -> {:cont, []}\n    ...>   acc -> {:cont, Enum.reverse(acc), []}\n    ...> end\n    iex> stream = Stream.chunk_while(1..10, [], chunk_fun, after_fun)\n    iex> Enum.to_list(stream)\n    [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]]\n\n",
    },
    {
      name: "chunk_every/4",
      type: "function",
      specs: [
        "@spec chunk_every(\n        Enumerable.t(),\n        pos_integer(),\n        pos_integer(),\n        Enumerable.t() | :discard\n      ) :: Enumerable.t()",
      ],
      documentation:
        "Streams the enumerable in chunks, containing `count` elements each,\nwhere each new chunk starts `step` elements into the enumerable.\n\n`step` is optional and, if not passed, defaults to `count`, i.e.\nchunks do not overlap. Chunking will stop as soon as the collection\nends or when we emit an incomplete chunk.\n\nIf the last chunk does not have `count` elements to fill the chunk,\nelements are taken from `leftover` to fill in the chunk. If `leftover`\ndoes not have enough elements to fill the chunk, then a partial chunk\nis returned with less than `count` elements.\n\nIf `:discard` is given in `leftover`, the last chunk is discarded\nunless it has exactly `count` elements.\n\n## Examples\n\n    iex> Stream.chunk_every([1, 2, 3, 4, 5, 6], 2) |> Enum.to_list()\n    [[1, 2], [3, 4], [5, 6]]\n\n    iex> Stream.chunk_every([1, 2, 3, 4, 5, 6], 3, 2, :discard) |> Enum.to_list()\n    [[1, 2, 3], [3, 4, 5]]\n\n    iex> Stream.chunk_every([1, 2, 3, 4, 5, 6], 3, 2, [7]) |> Enum.to_list()\n    [[1, 2, 3], [3, 4, 5], [5, 6, 7]]\n\n    iex> Stream.chunk_every([1, 2, 3, 4, 5, 6], 3, 3, []) |> Enum.to_list()\n    [[1, 2, 3], [4, 5, 6]]\n\n    iex> Stream.chunk_every([1, 2, 3, 4], 3, 3, Stream.cycle([0])) |> Enum.to_list()\n    [[1, 2, 3], [4, 0, 0]]\n\n",
    },
    {
      name: "chunk_every/2",
      type: "function",
      specs: [
        "@spec chunk_every(Enumerable.t(), pos_integer()) :: Enumerable.t()",
      ],
      documentation: "Shortcut to `chunk_every(enum, count, count)`.\n",
    },
    {
      name: "chunk_by/2",
      type: "function",
      specs: [
        "@spec chunk_by(Enumerable.t(), (element() -> any())) :: Enumerable.t()",
      ],
      documentation:
        "Chunks the `enum` by buffering elements for which `fun` returns the same value.\n\nElements are only emitted when `fun` returns a new value or the `enum` finishes.\n\n## Examples\n\n    iex> stream = Stream.chunk_by([1, 2, 2, 3, 4, 4, 6, 7, 7], &(rem(&1, 2) == 1))\n    iex> Enum.to_list(stream)\n    [[1], [2, 2], [3], [4, 4, 6], [7, 7]]\n\n",
    },
  ],
  name: "Stream",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "timer/0",
      type: "type",
      specs: ["@type timer() :: non_neg_integer() | :infinity"],
      documentation: null,
    },
    {
      name: "default/0",
      type: "type",
      specs: ["@type default() :: any()"],
      documentation: null,
    },
    {
      name: "index/0",
      type: "type",
      specs: ["@type index() :: non_neg_integer()"],
      documentation: "Zero-based index.",
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
  ],
};
