import type { ModuleDoc } from "../types";

export const Enumerable: ModuleDoc = {
  functions: [
    {
      name: "slice/1",
      type: "function",
      specs: [
        "@spec slice(t()) ::\n        {:ok, size :: non_neg_integer(), slicing_fun() | to_list_fun()}\n        | {:error, module()}",
      ],
      documentation:
        "Returns a function that slices the data structure contiguously.\n\nIt should return either:\n\n  * `{:ok, size, slicing_fun}` - if the `enumerable` has a known\n    bound and can access a position in the `enumerable` without\n    traversing all previous elements. The `slicing_fun` will receive\n    a `start` position, the `amount` of elements to fetch, and a\n    `step`.\n\n  * `{:ok, size, to_list_fun}` - if the `enumerable` has a known bound\n    and can access a position in the `enumerable` by first converting\n    it to a list via `to_list_fun`.\n\n  * `{:error, __MODULE__}` - the enumerable cannot be sliced efficiently\n    and a default algorithm built on top of `reduce/3` that runs in\n    linear time will be used.\n\n## Differences to `count/1`\n\nThe `size` value returned by this function is used for boundary checks,\ntherefore it is extremely important that this function only returns `:ok`\nif retrieving the `size` of the `enumerable` is cheap, fast, and takes\nconstant time. Otherwise the simplest of operations, such as\n`Enum.at(enumerable, 0)`, will become too expensive.\n\nOn the other hand, the `count/1` function in this protocol should be\nimplemented whenever you can count the number of elements in the collection\nwithout traversing it.\n",
    },
    {
      name: "reduce/3",
      type: "function",
      specs: ["@spec reduce(t(), acc(), reducer()) :: result()"],
      documentation:
        "Reduces the `enumerable` into an element.\n\nMost of the operations in `Enum` are implemented in terms of reduce.\nThis function should apply the given `t:reducer/0` function to each\nelement in the `enumerable` and proceed as expected by the returned\naccumulator.\n\nSee the documentation of the types `t:result/0` and `t:acc/0` for\nmore information.\n\n## Examples\n\nAs an example, here is the implementation of `reduce` for lists:\n\n    def reduce(_list, {:halt, acc}, _fun), do: {:halted, acc}\n    def reduce(list, {:suspend, acc}, fun), do: {:suspended, acc, &reduce(list, &1, fun)}\n    def reduce([], {:cont, acc}, _fun), do: {:done, acc}\n    def reduce([head | tail], {:cont, acc}, fun), do: reduce(tail, fun.(head, acc), fun)\n\n",
    },
    {
      name: "member?/2",
      type: "function",
      specs: [
        "@spec member?(t(), term()) :: {:ok, boolean()} | {:error, module()}",
      ],
      documentation:
        "Checks if an `element` exists within the `enumerable`.\n\nIt should return `{:ok, boolean}` if you can check the membership of a\ngiven element in `enumerable` with `===/2` without traversing the whole\nof it.\n\nOtherwise it should return `{:error, __MODULE__}` and a default algorithm\nbuilt on top of `reduce/3` that runs in linear time will be used.\n\nWhen called outside guards, the [`in`](`in/2`) and [`not in`](`in/2`)\noperators work by using this function.\n",
    },
    {
      name: "count/1",
      type: "function",
      specs: [
        "@spec count(t()) :: {:ok, non_neg_integer()} | {:error, module()}",
      ],
      documentation:
        "Retrieves the number of elements in the `enumerable`.\n\nIt should return `{:ok, count}` if you can count the number of elements\nin `enumerable` in a faster way than fully traversing it.\n\nOtherwise it should return `{:error, __MODULE__}` and a default algorithm\nbuilt on top of `reduce/3` that runs in linear time will be used.\n",
    },
  ],
  name: "Enumerable",
  callbacks: [
    {
      name: "slice/1",
      type: "callback",
      specs: [
        "@callback slice(t()) ::\n            {:ok, size :: non_neg_integer(), slicing_fun() | to_list_fun()}\n            | {:error, module()}",
      ],
      documentation:
        "Returns a function that slices the data structure contiguously.\n\nIt should return either:\n\n  * `{:ok, size, slicing_fun}` - if the `enumerable` has a known\n    bound and can access a position in the `enumerable` without\n    traversing all previous elements. The `slicing_fun` will receive\n    a `start` position, the `amount` of elements to fetch, and a\n    `step`.\n\n  * `{:ok, size, to_list_fun}` - if the `enumerable` has a known bound\n    and can access a position in the `enumerable` by first converting\n    it to a list via `to_list_fun`.\n\n  * `{:error, __MODULE__}` - the enumerable cannot be sliced efficiently\n    and a default algorithm built on top of `reduce/3` that runs in\n    linear time will be used.\n\n## Differences to `count/1`\n\nThe `size` value returned by this function is used for boundary checks,\ntherefore it is extremely important that this function only returns `:ok`\nif retrieving the `size` of the `enumerable` is cheap, fast, and takes\nconstant time. Otherwise the simplest of operations, such as\n`Enum.at(enumerable, 0)`, will become too expensive.\n\nOn the other hand, the `count/1` function in this protocol should be\nimplemented whenever you can count the number of elements in the collection\nwithout traversing it.\n",
    },
    {
      name: "reduce/3",
      type: "callback",
      specs: ["@callback reduce(t(), acc(), reducer()) :: result()"],
      documentation:
        "Reduces the `enumerable` into an element.\n\nMost of the operations in `Enum` are implemented in terms of reduce.\nThis function should apply the given `t:reducer/0` function to each\nelement in the `enumerable` and proceed as expected by the returned\naccumulator.\n\nSee the documentation of the types `t:result/0` and `t:acc/0` for\nmore information.\n\n## Examples\n\nAs an example, here is the implementation of `reduce` for lists:\n\n    def reduce(_list, {:halt, acc}, _fun), do: {:halted, acc}\n    def reduce(list, {:suspend, acc}, fun), do: {:suspended, acc, &reduce(list, &1, fun)}\n    def reduce([], {:cont, acc}, _fun), do: {:done, acc}\n    def reduce([head | tail], {:cont, acc}, fun), do: reduce(tail, fun.(head, acc), fun)\n\n",
    },
    {
      name: "member?/2",
      type: "callback",
      specs: [
        "@callback member?(t(), term()) :: {:ok, boolean()} | {:error, module()}",
      ],
      documentation:
        "Checks if an `element` exists within the `enumerable`.\n\nIt should return `{:ok, boolean}` if you can check the membership of a\ngiven element in `enumerable` with `===/2` without traversing the whole\nof it.\n\nOtherwise it should return `{:error, __MODULE__}` and a default algorithm\nbuilt on top of `reduce/3` that runs in linear time will be used.\n\nWhen called outside guards, the [`in`](`in/2`) and [`not in`](`in/2`)\noperators work by using this function.\n",
    },
    {
      name: "count/1",
      type: "callback",
      specs: [
        "@callback count(t()) :: {:ok, non_neg_integer()} | {:error, module()}",
      ],
      documentation:
        "Retrieves the number of elements in the `enumerable`.\n\nIt should return `{:ok, count}` if you can count the number of elements\nin `enumerable` in a faster way than fully traversing it.\n\nOtherwise it should return `{:error, __MODULE__}` and a default algorithm\nbuilt on top of `reduce/3` that runs in linear time will be used.\n",
    },
  ],
  macros: [],
  types: [
    {
      name: "t/0",
      type: "type",
      specs: ["@type t() :: term()", "@type t(_element) :: t()"],
      documentation: "All the types that implement this protocol.\n",
    },
    {
      name: "to_list_fun/0",
      type: "type",
      specs: ["@type to_list_fun() :: (t() -> [term()])"],
      documentation: "Receives an enumerable and returns a list.\n",
    },
    {
      name: "slicing_fun/0",
      type: "type",
      specs: [
        "@type slicing_fun() :: (start :: non_neg_integer(),\n                        length :: pos_integer(),\n                        step :: pos_integer() ->\n                          [term()])",
      ],
      documentation:
        "A slicing function that receives the initial position,\nthe number of elements in the slice, and the step.\n\nThe `start` position is a number `>= 0` and guaranteed to\nexist in the `enumerable`. The length is a number `>= 1`\nin a way that `start + length * step <= count`, where\n`count` is the maximum amount of elements in the enumerable.\n\nThe function should return a non empty list where\nthe amount of elements is equal to `length`.\n",
    },
    {
      name: "continuation/0",
      type: "type",
      specs: ["@type continuation() :: (acc() -> result())"],
      documentation:
        "A partially applied reduce function.\n\nThe continuation is the closure returned as a result when\nthe enumeration is suspended. When invoked, it expects\na new accumulator and it returns the result.\n\nA continuation can be trivially implemented as long as the reduce\nfunction is defined in a tail recursive fashion. If the function\nis tail recursive, all the state is passed as arguments, so\nthe continuation is the reducing function partially applied.\n",
    },
    {
      name: "result/0",
      type: "type",
      specs: [
        "@type result() ::\n        {:done, term()}\n        | {:halted, term()}\n        | {:suspended, term(), continuation()}",
      ],
      documentation:
        "The result of the reduce operation.\n\nIt may be *done* when the enumeration is finished by reaching\nits end, or *halted*/*suspended* when the enumeration was halted\nor suspended by the tagged accumulator.\n\nIn case the tagged `:halt` accumulator is given, the `:halted` tuple\nwith the accumulator must be returned. Functions like `Enum.take_while/2`\nuse `:halt` underneath and can be used to test halting enumerables.\n\nIn case the tagged `:suspend` accumulator is given, the caller must\nreturn the `:suspended` tuple with the accumulator and a continuation.\nThe caller is then responsible of managing the continuation and the\ncaller must always call the continuation, eventually halting or continuing\nuntil the end. `Enum.zip/2` uses suspension, so it can be used to test\nwhether your implementation handles suspension correctly. You can also use\n`Stream.zip/2` with `Enum.take_while/2` to test the combination of\n`:suspend` with `:halt`.\n",
    },
    {
      name: "reducer/0",
      type: "type",
      specs: [
        "@type reducer() :: (element :: term(), element_acc :: term() -> acc())",
      ],
      documentation:
        "The reducer function.\n\nShould be called with the `enumerable` element and the\naccumulator contents.\n\nReturns the accumulator for the next enumeration step.\n",
    },
    {
      name: "acc/0",
      type: "type",
      specs: [
        "@type acc() :: {:cont, term()} | {:halt, term()} | {:suspend, term()}",
      ],
      documentation:
        'The accumulator value for each step.\n\nIt must be a tagged tuple with one of the following "tags":\n\n  * `:cont`    - the enumeration should continue\n  * `:halt`    - the enumeration should halt immediately\n  * `:suspend` - the enumeration should be suspended immediately\n\nDepending on the accumulator value, the result returned by\n`Enumerable.reduce/3` will change. Please check the `t:result/0`\ntype documentation for more information.\n\nIn case a `t:reducer/0` function returns a `:suspend` accumulator,\nit must be explicitly handled by the caller and never leak.\n',
    },
    {
      name: "t/1",
      type: "type",
      specs: ["@type t() :: term()", "@type t(_element) :: t()"],
      documentation:
        "An enumerable of elements of type `element`.\n\nThis type is equivalent to `t:t/0` but is especially useful for documentation.\n\nFor example, imagine you define a function that expects an enumerable of\nintegers and returns an enumerable of strings:\n\n    @spec integers_to_strings(Enumerable.t(integer())) :: Enumerable.t(String.t())\n    def integers_to_strings(integers) do\n      Stream.map(integers, &Integer.to_string/1)\n    end\n\n",
    },
  ],
};
