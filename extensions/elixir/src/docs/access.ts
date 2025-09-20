import type { ModuleDoc } from "../types";

export const Access: ModuleDoc = {
  functions: [
    {
      name: "slice/1",
      type: "function",
      specs: [
        "@spec slice(Range.t()) :: access_fun(data :: list(), current_value :: list())",
      ],
      documentation:
        'Returns a function that accesses all items of a list that are within the provided range.\n\nThe range will be normalized following the same rules from `Enum.slice/2`.\n\nThe returned function is typically passed as an accessor to `Kernel.get_in/2`,\n`Kernel.get_and_update_in/3`, and friends.\n\n## Examples\n\n    iex> list = [%{name: "john", salary: 10}, %{name: "francine", salary: 30}, %{name: "vitor", salary: 25}]\n    iex> get_in(list, [Access.slice(1..2), :name])\n    ["francine", "vitor"]\n    iex> get_and_update_in(list, [Access.slice(1..3//2), :name], fn prev ->\n    ...>   {prev, String.upcase(prev)}\n    ...> end)\n    {["francine"], [%{name: "john", salary: 10}, %{name: "FRANCINE", salary: 30}, %{name: "vitor", salary: 25}]}\n\n`slice/1` can also be used to pop elements out of a list or\na key inside of a list:\n\n    iex> list = [%{name: "john", salary: 10}, %{name: "francine", salary: 30}, %{name: "vitor", salary: 25}]\n    iex> pop_in(list, [Access.slice(-2..-1)])\n    {[%{name: "francine", salary: 30}, %{name: "vitor", salary: 25}], [%{name: "john", salary: 10}]}\n    iex> pop_in(list, [Access.slice(-2..-1), :name])\n    {["francine", "vitor"], [%{name: "john", salary: 10}, %{salary: 30}, %{salary: 25}]}\n\nWhen no match is found, an empty list is returned and the update function is never called\n\n    iex> list = [%{name: "john", salary: 10}, %{name: "francine", salary: 30}, %{name: "vitor", salary: 25}]\n    iex> get_in(list, [Access.slice(5..10//2), :name])\n    []\n    iex> get_and_update_in(list, [Access.slice(5..10//2), :name], fn prev ->\n    ...>   {prev, String.upcase(prev)}\n    ...> end)\n    {[], [%{name: "john", salary: 10}, %{name: "francine", salary: 30}, %{name: "vitor", salary: 25}]}\n\nAn error is raised if the accessed structure is not a list:\n\n    iex> get_in(%{}, [Access.slice(2..10//3)])\n    ** (ArgumentError) Access.slice/1 expected a list, got: %{}\n\nAn error is raised if the step of the range is negative:\n\n    iex> get_in([], [Access.slice(2..10//-1)])\n    ** (ArgumentError) Access.slice/1 does not accept ranges with negative steps, got: 2..10//-1\n\n',
    },
    {
      name: "pop/2",
      type: "function",
      specs: [
        "@spec pop(data, key()) :: {value(), data} when data: container()",
      ],
      documentation:
        'Removes the entry with a given key from a container (a map, keyword\nlist, or struct that implements the `Access` behaviour).\n\nReturns a tuple containing the value associated with the key and the\nupdated container. `nil` is returned for the value if the key isn\'t\nin the container.\n\n## Examples\n\nWith a map:\n\n    iex> Access.pop(%{name: "Elixir", creator: "Valim"}, :name)\n    {"Elixir", %{creator: "Valim"}}\n\nA keyword list:\n\n    iex> Access.pop([name: "Elixir", creator: "Valim"], :name)\n    {"Elixir", [creator: "Valim"]}\n\nAn unknown key:\n\n    iex> Access.pop(%{name: "Elixir", creator: "Valim"}, :year)\n    {nil, %{creator: "Valim", name: "Elixir"}}\n\n',
    },
    {
      name: "key!/1",
      type: "function",
      specs: [
        "@spec key!(key()) ::\n        access_fun(data :: struct() | map(), current_value :: term())",
      ],
      documentation:
        'Returns a function that accesses the given key in a map/struct.\n\nThe returned function is typically passed as an accessor to `Kernel.get_in/2`,\n`Kernel.get_and_update_in/3`, and friends.\n\nSimilar to `key/2`, but the returned function raises if the key does not exist.\n\n## Examples\n\n    iex> map = %{user: %{name: "john"}}\n    iex> get_in(map, [Access.key!(:user), Access.key!(:name)])\n    "john"\n    iex> get_and_update_in(map, [Access.key!(:user), Access.key!(:name)], fn prev ->\n    ...>   {prev, String.upcase(prev)}\n    ...> end)\n    {"john", %{user: %{name: "JOHN"}}}\n    iex> pop_in(map, [Access.key!(:user), Access.key!(:name)])\n    {"john", %{user: %{}}}\n    iex> get_in(map, [Access.key!(:user), Access.key!(:unknown)])\n    ** (KeyError) key :unknown not found in: %{name: "john"}\n\nThe examples above could be partially written as:\n\n    iex> map = %{user: %{name: "john"}}\n    iex> map.user.name\n    "john"\n    iex> get_and_update_in(map.user.name, fn prev ->\n    ...>   {prev, String.upcase(prev)}\n    ...> end)\n    {"john", %{user: %{name: "JOHN"}}}\n\nHowever, it is not possible to remove fields using the dot notation,\nas it is implied those fields must also be present. In any case,\n`Access.key!/1` is useful when the key is not known in advance\nand must be accessed dynamically.\n\nAn error is raised if the accessed structure is not a map/struct:\n\n    iex> get_in([], [Access.key!(:foo)])\n    ** (RuntimeError) Access.key!/1 expected a map/struct, got: []\n\n',
    },
    {
      name: "key/2",
      type: "function",
      specs: [
        "@spec key(key(), term()) ::\n        access_fun(data :: struct() | map(), current_value :: term())",
      ],
      documentation:
        'Returns a function that accesses the given key in a map/struct.\n\nThe returned function is typically passed as an accessor to `Kernel.get_in/2`,\n`Kernel.get_and_update_in/3`, and friends.\n\nThe returned function uses the default value if the key does not exist.\nThis can be used to specify defaults and safely traverse missing keys:\n\n    iex> get_in(%{}, [Access.key(:user, %{}), Access.key(:name, "meg")])\n    "meg"\n\nSuch is also useful when using update functions, allowing us to introduce\nvalues as we traverse the data structure for updates:\n\n    iex> put_in(%{}, [Access.key(:user, %{}), Access.key(:name)], "Mary")\n    %{user: %{name: "Mary"}}\n\n## Examples\n\n    iex> map = %{user: %{name: "john"}}\n    iex> get_in(map, [Access.key(:unknown, %{}), Access.key(:name, "john")])\n    "john"\n    iex> get_and_update_in(map, [Access.key(:user), Access.key(:name)], fn prev ->\n    ...>   {prev, String.upcase(prev)}\n    ...> end)\n    {"john", %{user: %{name: "JOHN"}}}\n    iex> pop_in(map, [Access.key(:user), Access.key(:name)])\n    {"john", %{user: %{}}}\n\nAn error is raised if the accessed structure is not a map or a struct:\n\n    iex> get_in([], [Access.key(:foo)])\n    ** (BadMapError) expected a map, got: []\n\n',
    },
    {
      name: "get_and_update/3",
      type: "function",
      specs: [
        "@spec get_and_update(data, key(), (value() | nil ->\n                                     {current_value, new_value :: value()}\n                                     | :pop)) ::\n        {current_value, new_data :: data}\n      when data: container(), current_value: var",
      ],
      documentation:
        'Gets and updates the given key in a `container` (a map, a keyword list,\na struct that implements the `Access` behaviour).\n\nThe `fun` argument receives the value of `key` (or `nil` if `key` is not\npresent in `container`) and must return a two-element tuple `{current_value, new_value}`:\nthe "get" value `current_value` (the retrieved value, which can be operated on before\nbeing returned) and the new value to be stored under `key` (`new_value`).\n`fun` may also return `:pop`, which means the current value\nshould be removed from the container and returned.\n\nThe returned value is a two-element tuple with the "get" value returned by\n`fun` and a new container with the updated value under `key`.\n\n## Examples\n\n    iex> Access.get_and_update([a: 1], :a, fn current_value ->\n    ...>   {current_value, current_value + 1}\n    ...> end)\n    {1, [a: 2]}\n\n',
    },
    {
      name: "get/3",
      type: "function",
      specs: [
        "@spec get(container(), term(), term()) :: term()",
        "@spec get(nil_container(), any(), default) :: default when default: var",
      ],
      documentation:
        'Gets the value for the given key in a container (a map, keyword\nlist, or struct that implements the `Access` behaviour).\n\nReturns the value under `key` if there is such a key, or `default` if `key` is\nnot found.\n\n## Examples\n\n    iex> Access.get(%{name: "john"}, :name, "default name")\n    "john"\n    iex> Access.get(%{name: "john"}, :age, 25)\n    25\n\n    iex> Access.get([ordered: true], :timeout)\n    nil\n\n',
    },
    {
      name: "find/1",
      type: "function",
      specs: [
        "@spec find((term() -> as_boolean(term()))) ::\n        access_fun(data :: list(), current_value :: term())",
      ],
      documentation:
        'Returns a function that accesses the first element of a list that matches the provided predicate.\n\nThe returned function is typically passed as an accessor to `Kernel.get_in/2`,\n`Kernel.get_and_update_in/3`, and friends.\n\n## Examples\n\n    iex> list = [%{name: "john", salary: 10}, %{name: "francine", salary: 30}]\n    iex> get_in(list, [Access.find(&(&1.salary > 20)), :name])\n    "francine"\n    iex>  get_and_update_in(list, [Access.find(&(&1.salary <= 40)), :name], fn prev ->\n    ...> {prev, String.upcase(prev)}\n    ...>  end)\n    {"john", [%{name: "JOHN", salary: 10}, %{name: "francine", salary: 30}]}\n\n`find/1` can also be used to pop the first found element out of a list or\na key inside of a list:\n\n    iex> list = [%{name: "john", salary: 10}, %{name: "francine", salary: 30}]\n    iex> pop_in(list, [Access.find(&(&1.salary <= 40))])\n    {%{name: "john", salary: 10}, [%{name: "francine", salary: 30}]}\n\nWhen no match is found, nil is returned and the update function is never called\n\n    iex> list = [%{name: "john", salary: 10}, %{name: "francine", salary: 30}]\n    iex> get_in(list, [Access.find(&(&1.salary >= 50)), :name])\n    nil\n    iex> get_and_update_in(list, [Access.find(&(&1.salary >= 50)), :name], fn prev ->\n    ...>   {prev, String.upcase(prev)}\n    ...> end)\n    {nil, [%{name: "john", salary: 10}, %{name: "francine", salary: 30}]}\n\nAn error is raised if the predicate is not a function or is of the incorrect arity:\n\n    iex> get_in([], [Access.find(5)])\n    ** (FunctionClauseError) no function clause matching in Access.find/1\n\nAn error is raised if the accessed structure is not a list:\n\n    iex>  get_in(%{}, [Access.find(fn a -> a == 10 end)])\n    ** (RuntimeError) Access.find/1 expected a list, got: %{}\n',
    },
    {
      name: "filter/1",
      type: "function",
      specs: [
        "@spec filter((term() -> boolean())) ::\n        access_fun(data :: list(), current_value :: list())",
      ],
      documentation:
        'Returns a function that accesses all elements of a list that match the provided predicate.\n\nThe returned function is typically passed as an accessor to `Kernel.get_in/2`,\n`Kernel.get_and_update_in/3`, and friends.\n\n## Examples\n\n    iex> list = [%{name: "john", salary: 10}, %{name: "francine", salary: 30}]\n    iex> get_in(list, [Access.filter(&(&1.salary > 20)), :name])\n    ["francine"]\n    iex> get_and_update_in(list, [Access.filter(&(&1.salary <= 20)), :name], fn prev ->\n    ...>   {prev, String.upcase(prev)}\n    ...> end)\n    {["john"], [%{name: "JOHN", salary: 10}, %{name: "francine", salary: 30}]}\n\n`filter/1` can also be used to pop elements out of a list or\na key inside of a list:\n\n    iex> list = [%{name: "john", salary: 10}, %{name: "francine", salary: 30}]\n    iex> pop_in(list, [Access.filter(&(&1.salary >= 20))])\n    {[%{name: "francine", salary: 30}], [%{name: "john", salary: 10}]}\n    iex> pop_in(list, [Access.filter(&(&1.salary >= 20)), :name])\n    {["francine"], [%{name: "john", salary: 10}, %{salary: 30}]}\n\nWhen no match is found, an empty list is returned and the update function is never called\n\n    iex> list = [%{name: "john", salary: 10}, %{name: "francine", salary: 30}]\n    iex> get_in(list, [Access.filter(&(&1.salary >= 50)), :name])\n    []\n    iex> get_and_update_in(list, [Access.filter(&(&1.salary >= 50)), :name], fn prev ->\n    ...>   {prev, String.upcase(prev)}\n    ...> end)\n    {[], [%{name: "john", salary: 10}, %{name: "francine", salary: 30}]}\n\nAn error is raised if the predicate is not a function or is of the incorrect arity:\n\n    iex> get_in([], [Access.filter(5)])\n    ** (FunctionClauseError) no function clause matching in Access.filter/1\n\nAn error is raised if the accessed structure is not a list:\n\n    iex> get_in(%{}, [Access.filter(fn a -> a == 10 end)])\n    ** (RuntimeError) Access.filter/1 expected a list, got: %{}\n\n',
    },
    {
      name: "fetch!/2",
      type: "function",
      specs: ["@spec fetch!(container(), term()) :: term()"],
      documentation:
        'Same as `fetch/2` but returns the value directly,\nor raises a `KeyError` exception if `key` is not found.\n\n## Examples\n\n    iex> Access.fetch!(%{name: "meg", age: 26}, :name)\n    "meg"\n\n',
    },
    {
      name: "fetch/2",
      type: "function",
      specs: [
        "@spec fetch(container(), term()) :: {:ok, term()} | :error",
        "@spec fetch(nil_container(), any()) :: :error",
      ],
      documentation:
        'Fetches the value for the given key in a container (a map, keyword\nlist, or struct that implements the `Access` behaviour).\n\nReturns `{:ok, value}` where `value` is the value under `key` if there is such\na key, or `:error` if `key` is not found.\n\n## Examples\n\n    iex> Access.fetch(%{name: "meg", age: 26}, :name)\n    {:ok, "meg"}\n\n    iex> Access.fetch([ordered: true, on_timeout: :exit], :timeout)\n    :error\n\n',
    },
    {
      name: "elem/1",
      type: "function",
      specs: [
        "@spec elem(non_neg_integer()) ::\n        access_fun(data :: tuple(), current_value :: term())",
      ],
      documentation:
        'Returns a function that accesses the element at the given index in a tuple.\n\nThe returned function is typically passed as an accessor to `Kernel.get_in/2`,\n`Kernel.get_and_update_in/3`, and friends.\n\nThe returned function raises if `index` is out of bounds.\n\nNote that popping elements out of tuples is not possible and raises an\nerror.\n\n## Examples\n\n    iex> map = %{user: {"john", 27}}\n    iex> get_in(map, [:user, Access.elem(0)])\n    "john"\n    iex> get_and_update_in(map, [:user, Access.elem(0)], fn prev ->\n    ...>   {prev, String.upcase(prev)}\n    ...> end)\n    {"john", %{user: {"JOHN", 27}}}\n    iex> pop_in(map, [:user, Access.elem(0)])\n    ** (RuntimeError) cannot pop data from a tuple\n\nAn error is raised if the accessed structure is not a tuple:\n\n    iex> get_in(%{}, [Access.elem(0)])\n    ** (RuntimeError) Access.elem/1 expected a tuple, got: %{}\n\n',
    },
    {
      name: "at!/1",
      type: "function",
      specs: [
        "@spec at!(integer()) :: access_fun(data :: list(), current_value :: term())",
      ],
      documentation:
        "Same as `at/1` except that it raises `Enum.OutOfBoundsError`\nif the given index is out of bounds.\n\n## Examples\n\n    iex> get_in([:a, :b, :c], [Access.at!(2)])\n    :c\n    iex> get_in([:a, :b, :c], [Access.at!(3)])\n    ** (Enum.OutOfBoundsError) out of bounds error\n\n",
    },
    {
      name: "at/1",
      type: "function",
      specs: [
        "@spec at(integer()) :: access_fun(data :: list(), current_value :: term())",
      ],
      documentation:
        'Returns a function that accesses the element at `index` (zero based) of a list.\n\nKeep in mind that index lookups in lists take linear time: the larger the list,\nthe longer it will take to access its index. Therefore index-based operations\nare generally avoided in favor of other functions in the `Enum` module.\n\nThe returned function is typically passed as an accessor to `Kernel.get_in/2`,\n`Kernel.get_and_update_in/3`, and friends.\n\n## Examples\n\n    iex> list = [%{name: "john"}, %{name: "mary"}]\n    iex> get_in(list, [Access.at(1), :name])\n    "mary"\n    iex> get_in(list, [Access.at(-1), :name])\n    "mary"\n    iex> get_and_update_in(list, [Access.at(0), :name], fn prev ->\n    ...>   {prev, String.upcase(prev)}\n    ...> end)\n    {"john", [%{name: "JOHN"}, %{name: "mary"}]}\n    iex> get_and_update_in(list, [Access.at(-1), :name], fn prev ->\n    ...>   {prev, String.upcase(prev)}\n    ...> end)\n    {"mary", [%{name: "john"}, %{name: "MARY"}]}\n\n`at/1` can also be used to pop elements out of a list or\na key inside of a list:\n\n    iex> list = [%{name: "john"}, %{name: "mary"}]\n    iex> pop_in(list, [Access.at(0)])\n    {%{name: "john"}, [%{name: "mary"}]}\n    iex> pop_in(list, [Access.at(0), :name])\n    {"john", [%{}, %{name: "mary"}]}\n\nWhen the index is out of bounds, `nil` is returned and the update function is never called:\n\n    iex> list = [%{name: "john"}, %{name: "mary"}]\n    iex> get_in(list, [Access.at(10), :name])\n    nil\n    iex> get_and_update_in(list, [Access.at(10), :name], fn prev ->\n    ...>   {prev, String.upcase(prev)}\n    ...> end)\n    {nil, [%{name: "john"}, %{name: "mary"}]}\n\nAn error is raised if the accessed structure is not a list:\n\n    iex> get_in(%{}, [Access.at(1)])\n    ** (RuntimeError) Access.at/1 expected a list, got: %{}\n\n',
    },
    {
      name: "all/0",
      type: "function",
      specs: [
        "@spec all() :: access_fun(data :: list(), current_value :: list())",
      ],
      documentation:
        'Returns a function that accesses all the elements in a list.\n\nThe returned function is typically passed as an accessor to `Kernel.get_in/2`,\n`Kernel.get_and_update_in/3`, and friends.\n\n## Examples\n\n    iex> list = [%{name: "john"}, %{name: "mary"}]\n    iex> get_in(list, [Access.all(), :name])\n    ["john", "mary"]\n    iex> get_and_update_in(list, [Access.all(), :name], fn prev ->\n    ...>   {prev, String.upcase(prev)}\n    ...> end)\n    {["john", "mary"], [%{name: "JOHN"}, %{name: "MARY"}]}\n    iex> pop_in(list, [Access.all(), :name])\n    {["john", "mary"], [%{}, %{}]}\n\nHere is an example that traverses the list dropping even\nnumbers and multiplying odd numbers by 2:\n\n    iex> require Integer\n    iex> get_and_update_in([1, 2, 3, 4, 5], [Access.all()], fn num ->\n    ...>   if Integer.is_even(num), do: :pop, else: {num, num * 2}\n    ...> end)\n    {[1, 2, 3, 4, 5], [2, 6, 10]}\n\nAn error is raised if the accessed structure is not a list:\n\n    iex> get_in(%{}, [Access.all()])\n    ** (RuntimeError) Access.all/0 expected a list, got: %{}\n\n',
    },
  ],
  name: "Access",
  callbacks: [
    {
      name: "pop/2",
      type: "callback",
      specs: [
        "@callback pop(data, key()) :: {value(), data} when data: container()",
      ],
      documentation:
        'Invoked to "pop" the value under `key` out of the given data structure.\n\nWhen `key` exists in the given structure `data`, the implementation should\nreturn a `{value, new_data}` tuple where `value` is the value that was under\n`key` and `new_data` is `term` without `key`.\n\nWhen `key` is not present in the given structure, a tuple `{value, data}`\nshould be returned, where `value` is implementation-defined.\n\nSee the implementations for `Map.pop/3` or `Keyword.pop/3` for more examples.\n',
    },
    {
      name: "get_and_update/3",
      type: "callback",
      specs: [
        "@callback get_and_update(data, key(), (value() | nil ->\n                                         {current_value, new_value :: value()}\n                                         | :pop)) ::\n            {current_value, new_data :: data}\n          when data: container(), current_value: var",
      ],
      documentation:
        "Invoked in order to access the value under `key` and update it at the same time.\n\nThe implementation of this callback should invoke `fun` with the value under\n`key` in the passed structure `data`, or with `nil` if `key` is not present in it.\nThis function must return either `{current_value, new_value}` or `:pop`.\n\nIf the passed function returns `{current_value, new_value}`,\nthe return value of this callback should be `{current_value, new_data}`, where:\n\n  * `current_value` is the retrieved value (which can be operated on before being returned)\n\n  * `new_value` is the new value to be stored under `key`\n\n  * `new_data` is `data` after updating the value of `key` with `new_value`.\n\nIf the passed function returns `:pop`, the return value of this callback\nmust be `{value, new_data}` where `value` is the value under `key`\n(or `nil` if not present) and `new_data` is `data` without `key`.\n\nSee the implementations of `Map.get_and_update/3` or `Keyword.get_and_update/3`\nfor more examples.\n",
    },
    {
      name: "fetch/2",
      type: "callback",
      specs: [
        "@callback fetch(container(), term()) :: {:ok, term()} | :error",
        "@callback fetch(nil_container(), any()) :: :error",
      ],
      documentation:
        "Invoked in order to access the value stored under `key` in the given term `term`.\n\nThis function should return `{:ok, value}` where `value` is the value under\n`key` if the key exists in the term, or `:error` if the key does not exist in\nthe term.\n\nMany of the functions defined in the `Access` module internally call this\nfunction. This function is also used when the square-brackets access syntax\n(`structure[key]`) is used: the `fetch/2` callback implemented by the module\nthat defines the `structure` struct is invoked and if it returns `{:ok,\nvalue}` then `value` is returned, or if it returns `:error` then `nil` is\nreturned.\n\nSee the `Map.fetch/2` and `Keyword.fetch/2` implementations for examples of\nhow to implement this callback.\n",
    },
  ],
  macros: [],
  types: [
    {
      name: "access_fun/2",
      type: "type",
      specs: [
        "@type access_fun(data, current_value) ::\n        get_fun(data) | get_and_update_fun(data, current_value)",
      ],
      documentation: null,
    },
    {
      name: "get_and_update_fun/2",
      type: "type",
      specs: [
        "@type get_and_update_fun(data, current_value) :: (:get_and_update,\n                                                  data,\n                                                  (term() -> term()) ->\n                                                    {current_value,\n                                                     new_data :: container()}\n                                                    | :pop)",
      ],
      documentation: null,
    },
    {
      name: "get_fun/1",
      type: "type",
      specs: [
        "@type get_fun(data) :: (:get, data, (term() -> term()) ->\n                          new_data :: container())",
      ],
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
      specs: ["@type key() :: any()"],
      documentation: null,
    },
    {
      name: "t/0",
      type: "type",
      specs: ["@type t() :: container() | nil_container() | any()"],
      documentation: null,
    },
    {
      name: "nil_container/0",
      type: "type",
      specs: ["@type nil_container() :: nil"],
      documentation: null,
    },
    {
      name: "container/0",
      type: "type",
      specs: ["@type container() :: keyword() | struct() | map()"],
      documentation: null,
    },
  ],
};
