import type { ModuleDoc } from "../types";

export const Kernel: ModuleDoc = {
  functions: [
    {
      name: "update_in/3",
      type: "function",
      specs: [
        "@spec update_in(Access.t(), [term(), ...], (term() -> term())) :: Access.t()",
      ],
      documentation:
        'Updates a key in a nested structure.\n\nUses the `Access` module to traverse the structures\naccording to the given `keys`, unless the `key` is a\nfunction. If the key is a function, it will be invoked\nas specified in `get_and_update_in/3`.\n\n`data` is a nested structure (that is, a map, keyword\nlist, or struct that implements the `Access` behaviour).\nThe `fun` argument receives the value of `key` (or `nil`\nif `key` is not present) and the result replaces the value\nin the structure.\n\n## Examples\n\n    iex> users = %{"john" => %{age: 27}, "meg" => %{age: 23}}\n    iex> update_in(users, ["john", :age], &(&1 + 1))\n    %{"john" => %{age: 28}, "meg" => %{age: 23}}\n\nNote the current value given to the anonymous function may be `nil`.\nIf any of the intermediate values are nil, it will raise:\n\n    iex> users = %{"john" => %{age: 27}, "meg" => %{age: 23}}\n    iex> update_in(users, ["jane", :age], & &1 + 1)\n    ** (ArgumentError) could not put/update key :age on a nil value\n\n',
    },
    {
      name: "tuple_size/1",
      type: "function",
      specs: ["@spec tuple_size(tuple()) :: non_neg_integer()"],
      documentation:
        "Returns the size of a tuple.\n\nThis operation happens in constant time.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> tuple_size({:a, :b, :c})\n    3\n\n",
    },
    {
      name: "trunc/1",
      type: "function",
      specs: ["@spec trunc(number()) :: integer()"],
      documentation:
        "Returns the integer part of `number`.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> trunc(5.4)\n    5\n\n    iex> trunc(-5.99)\n    -5\n\n    iex> trunc(-5)\n    -5\n\n",
    },
    {
      name: "to_timeout/1",
      type: "function",
      specs: [
        "@spec to_timeout([{unit, non_neg_integer()}] | timeout() | Duration.t()) ::\n        timeout()\n      when unit: :week | :day | :hour | :minute | :second | :millisecond",
      ],
      documentation:
        "Constructs a millisecond timeout from the given components, duration, or timeout.\n\nThis function is useful for constructing timeouts to use in functions that\nexpect `t:timeout/0` values (such as `Process.send_after/4` and many others).\n\n## Argument\n\nThe `duration` argument can be one of a `Duration`, a `t:timeout/0`, or a list\nof components. Each of these is described below.\n\n### Passing `Duration`s\n\n`t:Duration.t/0` structs can be converted to timeouts. The given duration must have\n`year` and `month` fields set to `0`, since those cannot be reliably converted to\nmilliseconds (due to the varying number of days in a month and year).\n\nMicroseconds in durations are converted to milliseconds (through `System.convert_time_unit/3`).\n\n### Passing components\n\nThe `duration` argument can also be keyword list which can contain the following\nkeys, each appearing at most once with a non-negative integer value:\n\n  * `:week` - the number of weeks (a week is always 7 days)\n  * `:day` - the number of days (a day is always 24 hours)\n  * `:hour` - the number of hours\n  * `:minute` - the number of minutes\n  * `:second` - the number of seconds\n  * `:millisecond` - the number of milliseconds\n\nThe timeout is calculated as the sum of the components, each multiplied by\nthe corresponding factor.\n\n### Passing timeouts\n\nYou can also pass timeouts directly to this functions, that is, milliseconds or\nthe atom `:infinity`. In this case, this function just returns the given argument.\n\n## Examples\n\nWith a keyword list:\n\n    iex> to_timeout(hour: 1, minute: 30)\n    5400000\n\nWith a duration:\n\n    iex> to_timeout(%Duration{hour: 1, minute: 30})\n    5400000\n\nWith a timeout:\n\n    iex> to_timeout(5400000)\n    5400000\n    iex> to_timeout(:infinity)\n    :infinity\n\n",
    },
    {
      name: "tl/1",
      type: "function",
      specs: [
        "@spec tl(nonempty_maybe_improper_list(elem, last)) ::\n        maybe_improper_list(elem, last) | last\n      when elem: term(), last: term()",
      ],
      documentation:
        "Returns the tail of a list. Raises `ArgumentError` if the list is empty.\n\nThe tail of a list is the list without its first element.\n\nIt works with improper lists.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    tl([1, 2, 3, :go])\n    #=> [2, 3, :go]\n\n    tl([:one])\n    #=> []\n\n    tl([:a, :b | :improper_end])\n    #=> [:b | :improper_end]\n\n    tl([:a | %{b: 1}])\n    #=> %{b: 1}\n\nGiving it an empty list raises:\n\n    tl([])\n    ** (ArgumentError) argument error\n\n",
    },
    {
      name: "throw/1",
      type: "function",
      specs: ["@spec throw(term()) :: no_return()"],
      documentation:
        "A non-local return from a function.\n\nUsing `throw/1` is generally discouraged, as it allows a function\nto escape from its regular execution flow, which can make the code\nharder to read. Furthermore, all thrown values must be caught by\n`try/catch`. See `try/1` for more information.\n\nInlined by the compiler.\n",
    },
    {
      name: "struct!/2",
      type: "function",
      specs: ["@spec struct!(module() | struct(), Enumerable.t()) :: struct()"],
      documentation:
        "Similar to `struct/2` but checks for key validity.\n\nThe function `struct!/2` emulates the compile time behavior\nof structs. This means that:\n\n  * when building a struct, as in `struct!(SomeStruct, key: :value)`,\n    it is equivalent to `%SomeStruct{key: :value}` and therefore this\n    function will check if every given key-value belongs to the struct.\n    If the struct is enforcing any key via `@enforce_keys`, those will\n    be enforced as well;\n\n  * when updating a struct, as in `struct!(%SomeStruct{}, key: :value)`,\n    it is equivalent to `%SomeStruct{struct | key: :value}` and therefore this\n    function will check if every given key-value belongs to the struct.\n    However, updating structs does not enforce keys, as keys are enforced\n    only when building;\n\n",
    },
    {
      name: "struct/2",
      type: "function",
      specs: ["@spec struct(module() | struct(), Enumerable.t()) :: struct()"],
      documentation:
        'Creates and updates a struct.\n\nThe `struct` argument may be an atom (which defines `defstruct`)\nor a `struct` itself. The second argument is any `Enumerable` that\nemits two-element tuples (key-value pairs) during enumeration.\n\nKeys in the `Enumerable` that don\'t exist in the struct are automatically\ndiscarded. Note that keys must be atoms, as only atoms are allowed when\ndefining a struct. If there are duplicate keys in the `Enumerable`, the last\nentry will be taken (same behavior as `Map.new/1`).\n\nThis function is useful for dynamically creating and updating structs, as\nwell as for converting maps to structs; in the latter case, just inserting\nthe appropriate `:__struct__` field into the map may not be enough and\n`struct/2` should be used instead.\n\n## Examples\n\n    defmodule User do\n      defstruct name: "john"\n    end\n\n    struct(User)\n    #=> %User{name: "john"}\n\n    opts = [name: "meg"]\n    user = struct(User, opts)\n    #=> %User{name: "meg"}\n\n    struct(user, unknown: "value")\n    #=> %User{name: "meg"}\n\n    struct(User, %{name: "meg"})\n    #=> %User{name: "meg"}\n\n    # String keys are ignored\n    struct(User, %{"name" => "meg"})\n    #=> %User{name: "john"}\n\n',
    },
    {
      name: "spawn_monitor/3",
      type: "function",
      specs: [
        "@spec spawn_monitor(module(), atom(), list()) :: {pid(), reference()}",
      ],
      documentation:
        "Spawns the given module and function passing the given args,\nmonitors it and returns its PID and monitoring reference.\n\nTypically developers do not use the `spawn` functions, instead they use\nabstractions such as `Task`, `GenServer` and `Agent`, built on top of\n`spawn`, that spawns processes with more conveniences in terms of\nintrospection and debugging.\n\nCheck the `Process` module for more process-related functions.\n\nInlined by the compiler.\n\n## Examples\n\n    spawn_monitor(SomeModule, :function, [1, 2, 3])\n\n",
    },
    {
      name: "spawn_monitor/1",
      type: "function",
      specs: ["@spec spawn_monitor((-> any())) :: {pid(), reference()}"],
      documentation:
        "Spawns the given function, monitors it and returns its PID\nand monitoring reference.\n\nTypically developers do not use the `spawn` functions, instead they use\nabstractions such as `Task`, `GenServer` and `Agent`, built on top of\n`spawn`, that spawns processes with more conveniences in terms of\nintrospection and debugging.\n\nCheck the `Process` module for more process-related functions.\n\nThe anonymous function receives 0 arguments, and may return any value.\n\nInlined by the compiler.\n\n## Examples\n\n    current = self()\n    spawn_monitor(fn -> send(current, {self(), 1 + 2}) end)\n\n",
    },
    {
      name: "spawn_link/3",
      type: "function",
      specs: ["@spec spawn_link(module(), atom(), list()) :: pid()"],
      documentation:
        "Spawns the given function `fun` from the given `module` passing it the given\n`args`, links it to the current process, and returns its PID.\n\nTypically developers do not use the `spawn` functions, instead they use\nabstractions such as `Task`, `GenServer` and `Agent`, built on top of\n`spawn`, that spawns processes with more conveniences in terms of\nintrospection and debugging.\n\nCheck the `Process` module for more process-related functions. For more\ninformation on linking, check `Process.link/1`.\n\nInlined by the compiler.\n\n## Examples\n\n    spawn_link(SomeModule, :function, [1, 2, 3])\n\n",
    },
    {
      name: "spawn_link/1",
      type: "function",
      specs: ["@spec spawn_link((-> any())) :: pid()"],
      documentation:
        'Spawns the given function, links it to the current process, and returns its PID.\n\nTypically developers do not use the `spawn` functions, instead they use\nabstractions such as `Task`, `GenServer` and `Agent`, built on top of\n`spawn`, that spawns processes with more conveniences in terms of\nintrospection and debugging.\n\nCheck the `Process` module for more process-related functions. For more\ninformation on linking, check `Process.link/1`.\n\nThe anonymous function receives 0 arguments, and may return any value.\n\nInlined by the compiler.\n\n## Examples\n\n    current = self()\n    child = spawn_link(fn -> send(current, {self(), 1 + 2}) end)\n\n    receive do\n      {^child, 3} -> IO.puts("Received 3 back")\n    end\n\n',
    },
    {
      name: "spawn/3",
      type: "function",
      specs: ["@spec spawn(module(), atom(), list()) :: pid()"],
      documentation:
        "Spawns the given function `fun` from the given `module` passing it the given\n`args` and returns its PID.\n\nTypically developers do not use the `spawn` functions, instead they use\nabstractions such as `Task`, `GenServer` and `Agent`, built on top of\n`spawn`, that spawns processes with more conveniences in terms of\nintrospection and debugging.\n\nCheck the `Process` module for more process-related functions.\n\nInlined by the compiler.\n\n## Examples\n\n    spawn(SomeModule, :function, [1, 2, 3])\n\n",
    },
    {
      name: "spawn/1",
      type: "function",
      specs: ["@spec spawn((-> any())) :: pid()"],
      documentation:
        'Spawns the given function and returns its PID.\n\nTypically developers do not use the `spawn` functions, instead they use\nabstractions such as `Task`, `GenServer` and `Agent`, built on top of\n`spawn`, that spawns processes with more conveniences in terms of\nintrospection and debugging.\n\nCheck the `Process` module for more process-related functions.\n\nThe anonymous function receives 0 arguments, and may return any value.\n\nInlined by the compiler.\n\n## Examples\n\n    current = self()\n    child = spawn(fn -> send(current, {self(), 1 + 2}) end)\n\n    receive do\n      {^child, 3} -> IO.puts("Received 3 back")\n    end\n\n',
    },
    {
      name: "send/2",
      type: "function",
      specs: [
        "@spec send(dest :: Process.dest(), message) :: message when message: any()",
      ],
      documentation:
        "Sends a message to the given `dest` and returns the message.\n\n`dest` may be a remote or local PID, a local port, a locally\nregistered name, or a tuple in the form of `{registered_name, node}` for a\nregistered name at another node.\n\nFor additional documentation, see the [`!` operator Erlang\ndocumentation](https://www.erlang.org/doc/reference_manual/expressions#send).\n\nInlined by the compiler.\n\n## Examples\n\n    iex> send(self(), :hello)\n    :hello\n\n",
    },
    {
      name: "self/0",
      type: "function",
      specs: ["@spec self() :: pid()"],
      documentation:
        "Returns the PID (process identifier) of the calling process.\n\nAllowed in guard clauses. Inlined by the compiler.\n",
    },
    {
      name: "round/1",
      type: "function",
      specs: ["@spec round(number()) :: integer()"],
      documentation:
        "Rounds a number to the nearest integer.\n\nIf the number is equidistant to the two nearest integers, rounds away from zero.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> round(5.6)\n    6\n\n    iex> round(5.2)\n    5\n\n    iex> round(-9.9)\n    -10\n\n    iex> round(-9)\n    -9\n\n    iex> round(2.5)\n    3\n\n    iex> round(-2.5)\n    -3\n\n",
    },
    {
      name: "rem/2",
      type: "function",
      specs: [
        "@spec rem(integer(), neg_integer() | pos_integer()) :: integer()",
      ],
      documentation:
        "Computes the remainder of an integer division.\n\n`rem/2` uses truncated division, which means that\nthe result will always have the sign of the `dividend`.\n\nRaises an `ArithmeticError` exception if one of the arguments is not an\ninteger, or when the `divisor` is `0`.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> rem(5, 2)\n    1\n    iex> rem(6, -4)\n    2\n\n",
    },
    {
      name: "put_in/3",
      type: "function",
      specs: ["@spec put_in(Access.t(), [term(), ...], term()) :: Access.t()"],
      documentation:
        'Puts a value in a nested structure.\n\nUses the `Access` module to traverse the structures\naccording to the given `keys`, unless the `key` is a\nfunction. If the key is a function, it will be invoked\nas specified in `get_and_update_in/3`.\n\n## Examples\n\n    iex> users = %{"john" => %{age: 27}, "meg" => %{age: 23}}\n    iex> put_in(users, ["john", :age], 28)\n    %{"john" => %{age: 28}, "meg" => %{age: 23}}\n\nIf any of the intermediate values are nil, it will raise:\n\n    iex> users = %{"john" => %{age: 27}, "meg" => %{age: 23}}\n    iex> put_in(users, ["jane", :age], "oops")\n    ** (ArgumentError) could not put/update key :age on a nil value\n\n',
    },
    {
      name: "put_elem/3",
      type: "function",
      specs: ["@spec put_elem(tuple(), non_neg_integer(), term()) :: tuple()"],
      documentation:
        "Puts `value` at the given zero-based `index` in `tuple`.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> tuple = {:foo, :bar, 3}\n    iex> put_elem(tuple, 0, :baz)\n    {:baz, :bar, 3}\n\n",
    },
    {
      name: "pop_in/2",
      type: "function",
      specs: [
        "@spec pop_in(data, [Access.get_and_update_fun(term(), data) | term(), ...]) ::\n        {term(), data}\n      when data: Access.container()",
      ],
      documentation:
        'Pops a key from the given nested structure.\n\nUses the `Access` protocol to traverse the structures\naccording to the given `keys`, unless the `key` is a\nfunction. If the key is a function, it will be invoked\nas specified in `get_and_update_in/3`.\n\n## Examples\n\n    iex> users = %{"john" => %{age: 27}, "meg" => %{age: 23}}\n    iex> pop_in(users, ["john", :age])\n    {27, %{"john" => %{}, "meg" => %{age: 23}}}\n\nIn case any entry returns `nil`, its key will be removed\nand the deletion will be considered a success.\n\n    iex> users = %{"john" => %{age: 27}, "meg" => %{age: 23}}\n    iex> pop_in(users, ["jane", :age])\n    {nil, %{"john" => %{age: 27}, "meg" => %{age: 23}}}\n\n',
    },
    {
      name: "not/1",
      type: "function",
      specs: ["@spec not true :: false", "@spec not false :: true"],
      documentation:
        'Strictly boolean "not" operator.\n\n`value` must be a boolean; if it\'s not, an `ArgumentError` exception is raised.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> not false\n    true\n\n',
    },
    {
      name: "node/1",
      type: "function",
      specs: ["@spec node(pid() | reference() | port()) :: node()"],
      documentation:
        "Returns the node where the given argument is located.\nThe argument can be a PID, a reference, or a port.\nIf the local node is not alive, `:nonode@nohost` is returned.\n\nAllowed in guard tests. Inlined by the compiler.\n",
    },
    {
      name: "node/0",
      type: "function",
      specs: ["@spec node() :: node()"],
      documentation:
        "Returns an atom representing the name of the local node.\nIf the node is not alive, `:nonode@nohost` is returned instead.\n\nAllowed in guard tests. Inlined by the compiler.\n",
    },
    {
      name: "min/2",
      type: "function",
      specs: [
        "@spec min(first, second) :: first | second when first: term(), second: term()",
      ],
      documentation:
        'Returns the smallest of the two given terms according to\ntheir structural comparison.\n\nIf the terms compare equal, the first one is returned.\n\nThis performs a structural comparison where all Elixir\nterms can be compared with each other. See the ["Structural\ncomparison"](#module-structural-comparison) section\nfor more information.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> min(1, 2)\n    1\n    iex> min("foo", "bar")\n    "bar"\n\n',
    },
    {
      name: "max/2",
      type: "function",
      specs: [
        "@spec max(first, second) :: first | second when first: term(), second: term()",
      ],
      documentation:
        'Returns the biggest of the two given terms according to\ntheir structural comparison.\n\nIf the terms compare equal, the first one is returned.\n\nThis performs a structural comparison where all Elixir\nterms can be compared with each other. See the ["Structural\ncomparison"](#module-structural-comparison) section\nfor more information.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> max(1, 2)\n    2\n    iex> max("a", "b")\n    "b"\n\n',
    },
    {
      name: "map_size/1",
      type: "function",
      specs: ["@spec map_size(map()) :: non_neg_integer()"],
      documentation:
        'Returns the size of a map.\n\nThe size of a map is the number of key-value pairs that the map contains.\n\nThis operation happens in constant time.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> map_size(%{a: "foo", b: "bar"})\n    2\n\n',
    },
    {
      name: "make_ref/0",
      type: "function",
      specs: ["@spec make_ref() :: reference()"],
      documentation:
        "Returns an almost unique reference.\n\nThe returned reference will re-occur after approximately 2^82 calls;\ntherefore it is unique enough for practical purposes.\n\nInlined by the compiler.\n\n## Examples\n\n    make_ref()\n    #=> #Reference<0.0.0.135>\n\n",
    },
    {
      name: "macro_exported?/3",
      type: "function",
      specs: ["@spec macro_exported?(module(), atom(), arity()) :: boolean()"],
      documentation:
        "Returns `true` if `module` is loaded and contains a\npublic `macro` with the given `arity`, otherwise `false`.\n\nNote that this function does not load the module in case\nit is not loaded. Check `Code.ensure_loaded/1` for more\ninformation.\n\nIf `module` is an Erlang module (as opposed to an Elixir module), this\nfunction always returns `false`.\n\n## Examples\n\n    iex> macro_exported?(Kernel, :use, 2)\n    true\n\n    iex> macro_exported?(:erlang, :abs, 1)\n    false\n\n",
    },
    {
      name: "length/1",
      type: "function",
      specs: ["@spec length(list()) :: non_neg_integer()"],
      documentation:
        "Returns the length of `list`.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> length([1, 2, 3, 4, 5, 6, 7, 8, 9])\n    9\n\n",
    },
    {
      name: "is_tuple/1",
      type: "function",
      specs: ["@spec is_tuple(term()) :: boolean()"],
      documentation:
        "Returns `true` if `term` is a tuple, otherwise returns `false`.\n\nAllowed in guard tests. Inlined by the compiler.\n",
    },
    {
      name: "is_reference/1",
      type: "function",
      specs: ["@spec is_reference(term()) :: boolean()"],
      documentation:
        "Returns `true` if `term` is a reference, otherwise returns `false`.\n\nAllowed in guard tests. Inlined by the compiler.\n",
    },
    {
      name: "is_port/1",
      type: "function",
      specs: ["@spec is_port(term()) :: boolean()"],
      documentation:
        "Returns `true` if `term` is a port identifier, otherwise returns `false`.\n\nAllowed in guard tests. Inlined by the compiler.\n",
    },
    {
      name: "is_pid/1",
      type: "function",
      specs: ["@spec is_pid(term()) :: boolean()"],
      documentation:
        "Returns `true` if `term` is a PID (process identifier), otherwise returns `false`.\n\nAllowed in guard tests. Inlined by the compiler.\n",
    },
    {
      name: "is_number/1",
      type: "function",
      specs: ["@spec is_number(term()) :: boolean()"],
      documentation:
        "Returns `true` if `term` is either an integer or a floating-point number;\notherwise returns `false`.\n\nAllowed in guard tests. Inlined by the compiler.\n",
    },
    {
      name: "is_map_key/2",
      type: "function",
      specs: ["@spec is_map_key(map(), term()) :: boolean()"],
      documentation:
        'Returns `true` if `key` is a key in `map`, otherwise returns `false`.\n\nIt raises `BadMapError` if the first element is not a map.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> is_map_key(%{a: "foo", b: "bar"}, :a)\n    true\n\n    iex> is_map_key(%{a: "foo", b: "bar"}, :c)\n    false\n',
    },
    {
      name: "is_map/1",
      type: "function",
      specs: ["@spec is_map(term()) :: boolean()"],
      documentation:
        "Returns `true` if `term` is a map, otherwise returns `false`.\n\nAllowed in guard tests. Inlined by the compiler.\n\n> #### Structs are maps {: .info}\n>\n> Structs are also maps, and many of Elixir data structures are implemented\n> using structs: `Range`s, `Regex`es, `Date`s...\n>\n>     iex> is_map(1..10)\n>     true\n>     iex> is_map(~D[2024-04-18])\n>     true\n>\n> If you mean to specifically check for non-struct maps, use\n> `is_non_struct_map/1` instead.\n>\n>     iex> is_non_struct_map(1..10)\n>     false\n",
    },
    {
      name: "is_list/1",
      type: "function",
      specs: ["@spec is_list(term()) :: boolean()"],
      documentation:
        "Returns `true` if `term` is a list with zero or more elements, otherwise returns `false`.\n\nAllowed in guard tests. Inlined by the compiler.\n",
    },
    {
      name: "is_integer/1",
      type: "function",
      specs: ["@spec is_integer(term()) :: boolean()"],
      documentation:
        "Returns `true` if `term` is an integer, otherwise returns `false`.\n\nAllowed in guard tests. Inlined by the compiler.\n",
    },
    {
      name: "is_function/2",
      type: "function",
      specs: ["@spec is_function(term(), non_neg_integer()) :: boolean()"],
      documentation:
        "Returns `true` if `term` is a function that can be applied with `arity` number of arguments;\notherwise returns `false`.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> is_function(fn x -> x * 2 end, 1)\n    true\n    iex> is_function(fn x -> x * 2 end, 2)\n    false\n\n",
    },
    {
      name: "is_function/1",
      type: "function",
      specs: ["@spec is_function(term()) :: boolean()"],
      documentation:
        'Returns `true` if `term` is a function, otherwise returns `false`.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> is_function(fn x -> x + x end)\n    true\n\n    iex> is_function("not a function")\n    false\n\n',
    },
    {
      name: "is_float/1",
      type: "function",
      specs: ["@spec is_float(term()) :: boolean()"],
      documentation:
        "Returns `true` if `term` is a floating-point number, otherwise returns `false`.\n\nAllowed in guard tests. Inlined by the compiler.\n",
    },
    {
      name: "is_boolean/1",
      type: "function",
      specs: ["@spec is_boolean(term()) :: boolean()"],
      documentation:
        "Returns `true` if `term` is either the atom `true` or the atom `false` (i.e.,\na boolean), otherwise returns `false`.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> is_boolean(false)\n    true\n\n    iex> is_boolean(true)\n    true\n\n    iex> is_boolean(:test)\n    false\n\n",
    },
    {
      name: "is_bitstring/1",
      type: "function",
      specs: ["@spec is_bitstring(term()) :: boolean()"],
      documentation:
        'Returns `true` if `term` is a bitstring (including a binary), otherwise returns `false`.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> is_bitstring("foo")\n    true\n    iex> is_bitstring(<<1::3>>)\n    true\n\n',
    },
    {
      name: "is_binary/1",
      type: "function",
      specs: ["@spec is_binary(term()) :: boolean()"],
      documentation:
        'Returns `true` if `term` is a binary, otherwise returns `false`.\n\nA binary always contains a complete number of bytes.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> is_binary("foo")\n    true\n    iex> is_binary(<<1::3>>)\n    false\n\n',
    },
    {
      name: "is_atom/1",
      type: "function",
      specs: ["@spec is_atom(term()) :: boolean()"],
      documentation:
        'Returns `true` if `term` is an atom, otherwise returns `false`.\n\nNote `true`, `false`, and `nil` are atoms in Elixir, as well as\nmodule names. Therefore this function will return `true` to all\nof those values.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> is_atom(:name)\n    true\n\n    iex> is_atom(false)\n    true\n\n    iex> is_atom(AnAtom)\n    true\n\n    iex> is_atom("string")\n    false\n\n',
    },
    {
      name: "inspect/2",
      type: "function",
      specs: [
        "@spec inspect(\n        Inspect.t(),\n        keyword()\n      ) :: String.t()",
      ],
      documentation:
        'Inspects the given argument according to the `Inspect` protocol.\nThe second argument is a keyword list with options to control\ninspection.\n\n## Options\n\n`inspect/2` accepts a list of options that are internally\ntranslated to an `Inspect.Opts` struct. Check the docs for\n`Inspect.Opts` to see the supported options.\n\n## Examples\n\n    iex> inspect(:foo)\n    ":foo"\n\n    iex> inspect([1, 2, 3, 4, 5], limit: 3)\n    "[1, 2, 3, ...]"\n\n    iex> inspect([1, 2, 3], pretty: true, width: 0)\n    "[1,\\n 2,\\n 3]"\n\n    iex> inspect("olá" <> <<0>>)\n    "<<111, 108, 195, 161, 0>>"\n\n    iex> inspect("olá" <> <<0>>, binaries: :as_strings)\n    "\\"olá\\\\0\\""\n\n    iex> inspect("olá", binaries: :as_binaries)\n    "<<111, 108, 195, 161>>"\n\n    iex> inspect(~c"bar")\n    "~c\\"bar\\""\n\n    iex> inspect([0 | ~c"bar"])\n    "[0, 98, 97, 114]"\n\n    iex> inspect(100, base: :octal)\n    "0o144"\n\n    iex> inspect(100, base: :hex)\n    "0x64"\n\nNote that the `Inspect` protocol does not necessarily return a valid\nrepresentation of an Elixir term. In such cases, the inspected result\nmust start with `#`. For example, inspecting a function will return:\n\n    inspect(fn a, b -> a + b end)\n    #=> #Function<...>\n\nThe `Inspect` protocol can be derived to hide certain fields\nfrom structs, so they don\'t show up in logs, inspects and similar.\nSee the "Deriving" section of the documentation of the `Inspect`\nprotocol for more information.\n',
    },
    {
      name: "hd/1",
      type: "function",
      specs: [
        "@spec hd(nonempty_maybe_improper_list(elem, any())) :: elem when elem: term()",
      ],
      documentation:
        "Returns the head of a list. Raises `ArgumentError` if the list is empty.\n\nThe head of a list is its first element.\n\nIt works with improper lists.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    hd([1, 2, 3, 4])\n    #=> 1\n\n    hd([1 | 2])\n    #=> 1\n\nGiving it an empty list raises:\n\n    hd([])\n    ** (ArgumentError) argument error\n\n",
    },
    {
      name: "get_in/2",
      type: "function",
      specs: ["@spec get_in(Access.t(), [term(), ...]) :: term()"],
      documentation:
        'Gets a value from a nested structure with nil-safe handling.\n\nUses the `Access` module to traverse the structures\naccording to the given `keys`, unless the `key` is a\nfunction, which is detailed in a later section.\n\n## Examples\n\n    iex> users = %{"john" => %{age: 27}, "meg" => %{age: 23}}\n    iex> get_in(users, ["john", :age])\n    27\n    iex> # Equivalent to:\n    iex> users["john"][:age]\n    27\n\n`get_in/2` can also use the accessors in the `Access` module\nto traverse more complex data structures. For example, here we\nuse `Access.all/0` to traverse a list:\n\n    iex> users = [%{name: "john", age: 27}, %{name: "meg", age: 23}]\n    iex> get_in(users, [Access.all(), :age])\n    [27, 23]\n\nIn case any of the components returns `nil`, `nil` will be returned\nand `get_in/2` won\'t traverse any further:\n\n    iex> users = %{"john" => %{age: 27}, "meg" => %{age: 23}}\n    iex> get_in(users, ["unknown", :age])\n    nil\n    iex> # Equivalent to:\n    iex> users["unknown"][:age]\n    nil\n\n## Functions as keys\n\nIf a key given to `get_in/2` is a function, the function will be invoked\npassing three arguments:\n\n  * the operation (`:get`)\n  * the data to be accessed\n  * a function to be invoked next\n\nThis means `get_in/2` can be extended to provide custom lookups.\nThat\'s precisely how the `Access.all/0` key in the previous section\nbehaves. For example, we can manually implement such traversal as\nfollows:\n\n    iex> users = [%{name: "john", age: 27}, %{name: "meg", age: 23}]\n    iex> all = fn :get, data, next -> Enum.map(data, next) end\n    iex> get_in(users, [all, :age])\n    [27, 23]\n\nThe `Access` module ships with many convenience accessor functions.\nSee `Access.all/0`, `Access.key/2`, and others as examples.\n\n## Working with structs\n\nBy default, structs do not implement the `Access` behaviour required\nby this function. Therefore, you can\'t do this:\n\n    get_in(some_struct, [:some_key, :nested_key])\n\nThere are two alternatives. Given structs have predefined keys,\nwe can use the `struct.field` notation:\n\n    some_struct.some_key.nested_key\n\nHowever, the code above will fail if any of the values return `nil`.\nIf you also want to handle nil values, you can use `get_in/1`:\n\n    get_in(some_struct.some_key.nested_key)\n\nPattern-matching is another option for handling such cases,\nwhich can be especially useful if you want to match on several\nfields at once or provide custom return values:\n\n    case some_struct do\n      %{some_key: %{nested_key: value}} -> value\n      %{} -> nil\n    end\n\n',
    },
    {
      name: "get_and_update_in/3",
      type: "function",
      specs: [
        "@spec get_and_update_in(\n        structure,\n        keys,\n        (term() | nil -> {current_value, new_value} | :pop)\n      ) :: {current_value, new_structure :: structure}\n      when structure: Access.t(),\n           keys: [any(), ...],\n           current_value: Access.value(),\n           new_value: Access.value()",
      ],
      documentation:
        'Gets a value and updates a nested structure.\n\n`data` is a nested structure (that is, a map, keyword\nlist, or struct that implements the `Access` behaviour).\n\nThe `fun` argument receives the value of `key` (or `nil` if `key`\nis not present) and must return one of the following values:\n\n  * a two-element tuple `{current_value, new_value}`. In this case,\n    `current_value` is the retrieved value which can possibly be operated on before\n    being returned. `new_value` is the new value to be stored under `key`.\n\n  * `:pop`, which implies that the current value under `key`\n    should be removed from the structure and returned.\n\nThis function uses the `Access` module to traverse the structures\naccording to the given `keys`, unless the `key` is a function,\nwhich is detailed in a later section.\n\n## Examples\n\nThis function is useful when there is a need to retrieve the current\nvalue (or something calculated in function of the current value) and\nupdate it at the same time. For example, it could be used to read the\ncurrent age of a user while increasing it by one in one pass:\n\n    iex> users = %{"john" => %{age: 27}, "meg" => %{age: 23}}\n    iex> get_and_update_in(users, ["john", :age], &{&1, &1 + 1})\n    {27, %{"john" => %{age: 28}, "meg" => %{age: 23}}}\n\nNote the current value given to the anonymous function may be `nil`.\nIf any of the intermediate values are nil, it will raise:\n\n    iex> users = %{"john" => %{age: 27}, "meg" => %{age: 23}}\n    iex> get_and_update_in(users, ["jane", :age], &{&1, &1 + 1})\n    ** (ArgumentError) could not put/update key :age on a nil value\n\n## Functions as keys\n\nIf a key is a function, the function will be invoked passing three\narguments:\n\n  * the operation (`:get_and_update`)\n  * the data to be accessed\n  * a function to be invoked next\n\nThis means `get_and_update_in/3` can be extended to provide custom\nlookups. The downside is that functions cannot be stored as keys\nin the accessed data structures.\n\nWhen one of the keys is a function, the function is invoked.\nIn the example below, we use a function to get and increment all\nages inside a list:\n\n    iex> users = [%{name: "john", age: 27}, %{name: "meg", age: 23}]\n    iex> all = fn :get_and_update, data, next ->\n    ...>   data |> Enum.map(next) |> Enum.unzip()\n    ...> end\n    iex> get_and_update_in(users, [all, :age], &{&1, &1 + 1})\n    {[27, 23], [%{name: "john", age: 28}, %{name: "meg", age: 24}]}\n\nIf the previous value before invoking the function is `nil`,\nthe function *will* receive `nil` as a value and must handle it\naccordingly (be it by failing or providing a sane default).\n\nThe `Access` module ships with many convenience accessor functions,\nlike the `all` anonymous function defined above. See `Access.all/0`,\n`Access.key/2`, and others as examples.\n',
    },
    {
      name: "function_exported?/3",
      type: "function",
      specs: [
        "@spec function_exported?(module(), atom(), arity()) :: boolean()",
      ],
      documentation:
        "Returns `true` if `module` is loaded and contains a\npublic `function` with the given `arity`, otherwise `false`.\n\nNote that this function does not load the module in case\nit is not loaded. Check `Code.ensure_loaded/1` for more\ninformation.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> function_exported?(Enum, :map, 2)\n    true\n\n    iex> function_exported?(Enum, :map, 10)\n    false\n\n    iex> function_exported?(List, :to_string, 1)\n    true\n",
    },
    {
      name: "floor/1",
      type: "function",
      specs: ["@spec floor(number()) :: integer()"],
      documentation:
        "Returns the largest integer smaller than or equal to `number`.\n\nIf you want to perform floor operation on other decimal places,\nuse `Float.floor/2` instead.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> floor(10)\n    10\n\n    iex> floor(9.7)\n    9\n\n    iex> floor(-9.7)\n    -10\n\n",
    },
    {
      name: "exit/1",
      type: "function",
      specs: ["@spec exit(term()) :: no_return()"],
      documentation:
        'Stops the execution of the calling process with the given reason.\n\nSince evaluating this function causes the process to terminate,\nit has no return value.\n\nInlined by the compiler.\n\n## Examples\n\nWhen a process reaches its end, by default it exits with\nreason `:normal`. You can also call `exit/1` explicitly if you\nwant to terminate a process but not signal any failure:\n\n    exit(:normal)\n\nIn case something goes wrong, you can also use `exit/1` with\na different reason:\n\n    exit(:seems_bad)\n\nIf the exit reason is not `:normal`, all the processes linked to the process\nthat exited will crash (unless they are trapping exits).\n\n## OTP exits\n\nExits are used by the OTP to determine if a process exited abnormally\nor not. The following exits are considered "normal":\n\n  * `exit(:normal)`\n  * `exit(:shutdown)`\n  * `exit({:shutdown, term})`\n\nExiting with any other reason is considered abnormal and treated\nas a crash. This means the default supervisor behavior kicks in,\nerror reports are emitted, and so forth.\n\nThis behavior is relied on in many different places. For example,\n`ExUnit` uses `exit(:shutdown)` when exiting the test process to\nsignal linked processes, supervision trees and so on to politely\nshut down too.\n\n## CLI exits\n\nBuilding on top of the exit signals mentioned above, if the\nprocess started by the command line exits with any of the three\nreasons above, its exit is considered normal and the Operating\nSystem process will exit with status 0.\n\nIt is, however, possible to customize the operating system exit\nsignal by invoking:\n\n    exit({:shutdown, integer})\n\nThis will cause the operating system process to exit with the status given by\n`integer` while signaling all linked Erlang processes to politely\nshut down.\n\nAny other exit reason will cause the operating system process to exit with\nstatus `1` and linked Erlang processes to crash.\n',
    },
    {
      name: "elem/2",
      type: "function",
      specs: ["@spec elem(tuple(), non_neg_integer()) :: term()"],
      documentation:
        "Gets the element at the zero-based `index` in `tuple`.\n\nIt raises `ArgumentError` when index is negative or it is out of range of the tuple elements.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    tuple = {:foo, :bar, 3}\n    elem(tuple, 1)\n    #=> :bar\n\n    elem({}, 0)\n    ** (ArgumentError) argument error\n\n    elem({:foo, :bar}, 2)\n    ** (ArgumentError) argument error\n\n",
    },
    {
      name: "div/2",
      type: "function",
      specs: [
        "@spec div(integer(), neg_integer() | pos_integer()) :: integer()",
      ],
      documentation:
        "Performs an integer division.\n\nRaises an `ArithmeticError` exception if one of the arguments is not an\ninteger, or when the `divisor` is `0`.\n\n`div/2` performs *truncated* integer division. This means that\nthe result is always rounded towards zero.\n\nIf you want to perform floored integer division (rounding towards negative infinity),\nuse `Integer.floor_div/2` instead.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    div(5, 2)\n    #=> 2\n\n    div(6, -4)\n    #=> -1\n\n    div(-99, 2)\n    #=> -49\n\n    div(100, 0)\n    ** (ArithmeticError) bad argument in arithmetic expression\n\n",
    },
    {
      name: "ceil/1",
      type: "function",
      specs: ["@spec ceil(number()) :: integer()"],
      documentation:
        "Returns the smallest integer greater than or equal to `number`.\n\nIf you want to perform ceil operation on other decimal places,\nuse `Float.ceil/2` instead.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> ceil(10)\n    10\n\n    iex> ceil(10.1)\n    11\n\n    iex> ceil(-10.1)\n    -10\n\n",
    },
    {
      name: "byte_size/1",
      type: "function",
      specs: ["@spec byte_size(bitstring()) :: non_neg_integer()"],
      documentation:
        "Returns the number of bytes needed to contain `bitstring`.\n\nThat is, if the number of bits in `bitstring` is not divisible by 8, the\nresulting number of bytes will be rounded up (by excess). This operation\nhappens in constant time.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> byte_size(<<433::16, 3::3>>)\n    3\n\n    iex> byte_size(<<1, 2, 3>>)\n    3\n\n",
    },
    {
      name: "bit_size/1",
      type: "function",
      specs: ["@spec bit_size(bitstring()) :: non_neg_integer()"],
      documentation:
        "Returns an integer which is the size in bits of `bitstring`.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> bit_size(<<433::16, 3::3>>)\n    19\n\n    iex> bit_size(<<1, 2, 3>>)\n    24\n\n",
    },
    {
      name: "binary_slice/3",
      type: "function",
      specs: [],
      documentation:
        'Returns a binary starting at the offset `start` and of the given `size`.\n\nThis is similar to `binary_part/3` except that if `start + size`\nis greater than the binary size, it automatically clips it to\nthe binary size instead of raising. Opposite to `binary_part/3`,\nthis function is not allowed in guards.\n\nThis function works with bytes. For a slicing operation that\nconsiders characters, see `String.slice/3`.\n\n## Examples\n\n    iex> binary_slice("elixir", 0, 6)\n    "elixir"\n    iex> binary_slice("elixir", 0, 5)\n    "elixi"\n    iex> binary_slice("elixir", 1, 4)\n    "lixi"\n    iex> binary_slice("elixir", 0, 10)\n    "elixir"\n\nIf `start` is negative, it is normalized against the binary\nsize and clamped to 0:\n\n    iex> binary_slice("elixir", -3, 10)\n    "xir"\n    iex> binary_slice("elixir", -10, 10)\n    "elixir"\n\nIf the `size` is zero, an empty binary is returned:\n\n    iex> binary_slice("elixir", 1, 0)\n    ""\n\nIf `start` is greater than or equal to the binary size,\nan empty binary is returned:\n\n    iex> binary_slice("elixir", 10, 10)\n    ""\n\n',
    },
    {
      name: "binary_slice/2",
      type: "function",
      specs: [],
      documentation:
        'Returns a binary from the offset given by the start of the\nrange to the offset given by the end of the range.\n\nIf the start or end of the range are negative, they are converted\ninto positive indices based on the binary size. For example,\n`-1` means the last byte of the binary.\n\nThis is similar to `binary_part/3` except that it works with ranges\nand it is not allowed in guards.\n\nThis function works with bytes. For a slicing operation that\nconsiders characters, see `String.slice/2`.\n\n## Examples\n\n    iex> binary_slice("elixir", 0..5)\n    "elixir"\n    iex> binary_slice("elixir", 1..3)\n    "lix"\n    iex> binary_slice("elixir", 1..10)\n    "lixir"\n\n    iex> binary_slice("elixir", -4..-1)\n    "ixir"\n    iex> binary_slice("elixir", -4..6)\n    "ixir"\n    iex> binary_slice("elixir", -10..10)\n    "elixir"\n\nFor ranges where `start > stop`, you need to explicitly\nmark them as increasing:\n\n    iex> binary_slice("elixir", 2..-1//1)\n    "ixir"\n    iex> binary_slice("elixir", 1..-2//1)\n    "lixi"\n\nYou can use `../0` as a shortcut for `0..-1//1`, which returns\nthe whole binary as is:\n\n    iex> binary_slice("elixir", ..)\n    "elixir"\n\nThe step can be any positive number. For example, to\nget every 2 characters of the binary:\n\n    iex> binary_slice("elixir", 0..-1//2)\n    "eii"\n\nIf the first position is after the string ends or after\nthe last position of the range, it returns an empty string:\n\n    iex> binary_slice("elixir", 10..3//1)\n    ""\n    iex> binary_slice("elixir", -10..-7)\n    ""\n    iex> binary_slice("a", 1..1500)\n    ""\n\n',
    },
    {
      name: "binary_part/3",
      type: "function",
      specs: [
        "@spec binary_part(binary(), non_neg_integer(), integer()) :: binary()",
      ],
      documentation:
        'Extracts the part of the binary at `start` with `size`.\n\nIf `start` or `size` reference in any way outside the binary,\nan `ArgumentError` exception is raised.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> binary_part("foo", 1, 2)\n    "oo"\n\nA negative `size` can be used to extract bytes that come *before* the byte\nat `start`:\n\n    iex> binary_part("Hello", 5, -3)\n    "llo"\n\nAn `ArgumentError` is raised when the `size` is outside of the binary:\n\n    binary_part("Hello", 0, 10)\n    ** (ArgumentError) argument error\n\n',
    },
    {
      name: "apply/3",
      type: "function",
      specs: [
        "@spec apply(module(), function_name :: atom(), [any()]) :: any()",
      ],
      documentation:
        "Invokes the given function from `module` with the list of\narguments `args`.\n\n`apply/3` is used to invoke functions where the module, function\nname or arguments are defined dynamically at runtime. For this\nreason, you can't invoke macros using `apply/3`, only functions.\n\nIf the number of arguments and the function name are known at compile time,\nprefer `module.function(arg_1, arg_2, ..., arg_n)` as it is clearer than\n`apply(module, :function, [arg_1, arg_2, ..., arg_n])`.\n\n`apply/3` cannot be used to call private functions.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> apply(Enum, :reverse, [[1, 2, 3]])\n    [3, 2, 1]\n\n",
    },
    {
      name: "apply/2",
      type: "function",
      specs: ["@spec apply((... -> any()), [any()]) :: any()"],
      documentation:
        "Invokes the given anonymous function `fun` with the list of\narguments `args`.\n\nIf the number of arguments is known at compile time, prefer\n`fun.(arg_1, arg_2, ..., arg_n)` as it is clearer than\n`apply(fun, [arg_1, arg_2, ..., arg_n])`.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> apply(fn x -> x * 2 end, [2])\n    4\n\n",
    },
    {
      name: "abs/1",
      type: "function",
      specs: ["@spec abs(number()) :: number()"],
      documentation:
        "Returns an integer or float which is the arithmetical absolute value of `number`.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> abs(-3.33)\n    3.33\n\n    iex> abs(-3)\n    3\n\n",
    },
    {
      name: ">=/2",
      type: "function",
      specs: ["@spec term() >= term() :: boolean()"],
      documentation:
        'Greater-than or equal to operator.\n\nReturns `true` if `left` is more than or equal to `right`.\n\nThis performs a structural comparison where all Elixir\nterms can be compared with each other. See the ["Structural\ncomparison"](#module-structural-comparison) section\nfor more information.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> 1 >= 2\n    false\n\n',
    },
    {
      name: ">/2",
      type: "function",
      specs: ["@spec term() > term() :: boolean()"],
      documentation:
        'Greater-than operator.\n\nReturns `true` if `left` is more than `right`.\n\nThis performs a structural comparison where all Elixir\nterms can be compared with each other. See the ["Structural\ncomparison"](#module-structural-comparison) section\nfor more information.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> 1 > 2\n    false\n\n',
    },
    {
      name: "=~/2",
      type: "function",
      specs: ["@spec String.t() =~ (String.t() | Regex.t()) :: boolean()"],
      documentation:
        'Text-based match operator. Matches the term on the `left`\nagainst the regular expression or string on the `right`.\n\nIf `right` is a regular expression, returns `true` if `left` matches right.\n\nIf `right` is a string, returns `true` if `left` contains `right`.\n\n## Examples\n\n    iex> "abcd" =~ ~r/c(d)/\n    true\n\n    iex> "abcd" =~ ~r/e/\n    false\n\n    iex> "abcd" =~ ~r//\n    true\n\n    iex> "abcd" =~ "bc"\n    true\n\n    iex> "abcd" =~ "ad"\n    false\n\n    iex> "abcd" =~ "abcd"\n    true\n\n    iex> "abcd" =~ ""\n    true\n\nFor more information about regular expressions, please check the `Regex` module.\n',
    },
    {
      name: "===/2",
      type: "function",
      specs: ["@spec term() === term() :: boolean()"],
      documentation:
        'Strictly equal to operator.\n\nReturns `true` if the two terms are exactly equal.\n\nThe terms are only considered to be exactly equal if they\nhave the same value and are of the same type. For example,\n`1 == 1.0` returns `true`, but since they are of different\ntypes, `1 === 1.0` returns `false`.\n\nThis performs a structural comparison where all Elixir\nterms can be compared with each other. See the ["Structural\ncomparison"](#module-structural-comparison) section\nfor more information.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> 1 === 2\n    false\n\n    iex> 1 === 1.0\n    false\n\n',
    },
    {
      name: "==/2",
      type: "function",
      specs: ["@spec term() == term() :: boolean()"],
      documentation:
        'Equal to operator. Returns `true` if the two terms are equal.\n\nThis operator considers 1 and 1.0 to be equal. For stricter\nsemantics, use `===/2` instead.\n\nThis performs a structural comparison where all Elixir\nterms can be compared with each other. See the ["Structural\ncomparison"](#module-structural-comparison) section\nfor more information.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> 1 == 2\n    false\n\n    iex> 1 == 1.0\n    true\n\n',
    },
    {
      name: "<=/2",
      type: "function",
      specs: ["@spec term() <= term() :: boolean()"],
      documentation:
        'Less-than or equal to operator.\n\nReturns `true` if `left` is less than or equal to `right`.\n\nThis performs a structural comparison where all Elixir\nterms can be compared with each other. See the ["Structural\ncomparison"](#module-structural-comparison) section\nfor more information.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> 1 <= 2\n    true\n\n',
    },
    {
      name: "</2",
      type: "function",
      specs: ["@spec term() < term() :: boolean()"],
      documentation:
        'Less-than operator.\n\nReturns `true` if `left` is less than `right`.\n\nThis performs a structural comparison where all Elixir\nterms can be compared with each other. See the ["Structural\ncomparison"](#module-structural-comparison) section\nfor more information.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> 1 < 2\n    true\n\n',
    },
    {
      name: "//2",
      type: "function",
      specs: ["@spec number() / number() :: float()"],
      documentation:
        "Arithmetic division operator.\n\nThe result is always a float. Use `div/2` and `rem/2` if you want\nan integer division or the remainder.\n\nRaises `ArithmeticError` if `right` is 0 or 0.0.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    1 / 2\n    #=> 0.5\n\n    -3.0 / 2.0\n    #=> -1.5\n\n    5 / 1\n    #=> 5.0\n\n    7 / 0\n    ** (ArithmeticError) bad argument in arithmetic expression\n\n",
    },
    {
      name: "--/2",
      type: "function",
      specs: ["@spec list() -- list() :: list()"],
      documentation:
        "List subtraction operator. Removes the first occurrence of an element\non the left list for each element on the right.\n\nThis function is optimized so the complexity of `a -- b` is proportional\nto `length(a) * log(length(b))`. See also the [Erlang efficiency\nguide](https://www.erlang.org/doc/efficiency_guide/retired_myths.html).\n\nInlined by the compiler.\n\n## Examples\n\n    iex> [1, 2, 3] -- [1, 2]\n    [3]\n\n    iex> [1, 2, 3, 2, 1] -- [1, 2, 2]\n    [3, 1]\n\nThe `--/2` operator is right associative, meaning:\n\n    iex> [1, 2, 3] -- [2] -- [3]\n    [1, 3]\n\nAs it is equivalent to:\n\n    iex> [1, 2, 3] -- ([2] -- [3])\n    [1, 3]\n\n",
    },
    {
      name: "-/2",
      type: "function",
      specs: [
        "@spec integer() - integer() :: integer()",
        "@spec float() - float() :: float()",
        "@spec integer() - float() :: float()",
        "@spec float() - integer() :: float()",
      ],
      documentation:
        "Arithmetic subtraction operator.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> 1 - 2\n    -1\n\n",
    },
    {
      name: "-/1",
      type: "function",
      specs: [
        "@spec -0 :: 0",
        "@spec -pos_integer() :: neg_integer()",
        "@spec -neg_integer() :: pos_integer()",
        "@spec -float() :: float()",
      ],
      documentation:
        "Arithmetic negative unary operator.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> -2\n    -2\n\n",
    },
    {
      name: "++/2",
      type: "function",
      specs: [
        "@spec [] ++ a :: a when a: term()",
        "@spec [...] ++ term() :: maybe_improper_list()",
      ],
      documentation:
        'List concatenation operator. Concatenates a proper list and a term, returning a list.\n\nThe complexity of `a ++ b` is proportional to `length(a)`, so avoid repeatedly\nappending to lists of arbitrary length, for example, `list ++ [element]`.\nInstead, consider prepending via `[element | rest]` and then reversing.\n\nIf the `right` operand is not a proper list, it returns an improper list.\nIf the `left` operand is not a proper list, it raises `ArgumentError`.\nIf the `left` operand is an empty list, it returns the `right` operand.\n\nInlined by the compiler.\n\n## Examples\n\n    iex> [1] ++ [2, 3]\n    [1, 2, 3]\n\n    iex> ~c"foo" ++ ~c"bar"\n    ~c"foobar"\n\n    # a non-list on the right will return an improper list\n    # with said element at the end\n    iex> [1, 2] ++ 3\n    [1, 2 | 3]\n    iex> [1, 2] ++ {3, 4}\n    [1, 2 | {3, 4}]\n\n    # improper list on the right will return an improper list\n    iex> [1] ++ [2 | 3]\n    [1, 2 | 3]\n\n    # empty list on the left will return the right operand\n    iex> [] ++ 1\n    1\n\nThe `++/2` operator is right associative, meaning:\n\n    iex> [1, 2, 3] -- [1] ++ [2]\n    [3]\n\nAs it is equivalent to:\n\n    iex> [1, 2, 3] -- ([1] ++ [2])\n    [3]\n\n',
    },
    {
      name: "+/2",
      type: "function",
      specs: [
        "@spec integer() + integer() :: integer()",
        "@spec float() + float() :: float()",
        "@spec integer() + float() :: float()",
        "@spec float() + integer() :: float()",
      ],
      documentation:
        "Arithmetic addition operator.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> 1 + 2\n    3\n\n",
    },
    {
      name: "+/1",
      type: "function",
      specs: ["@spec +integer() :: integer()", "@spec +float() :: float()"],
      documentation:
        "Arithmetic positive unary operator.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> +1\n    1\n\n",
    },
    {
      name: "**/2",
      type: "function",
      specs: [
        "@spec integer() ** non_neg_integer() :: integer()",
        "@spec integer() ** neg_integer() :: float()",
        "@spec float() ** float() :: float()",
        "@spec integer() ** float() :: float()",
        "@spec float() ** integer() :: float()",
      ],
      documentation:
        "Power operator.\n\nIt takes two numbers for input. If both are integers and the right-hand\nside (the `exponent`) is also greater than or equal to 0, then the result\nwill also be an integer. Otherwise it returns a float.\n\n## Examples\n\n    iex> 2 ** 2\n    4\n    iex> 2 ** -4\n    0.0625\n\n    iex> 2.0 ** 2\n    4.0\n    iex> 2 ** 2.0\n    4.0\n\n",
    },
    {
      name: "*/2",
      type: "function",
      specs: [
        "@spec integer() * integer() :: integer()",
        "@spec float() * float() :: float()",
        "@spec integer() * float() :: float()",
        "@spec float() * integer() :: float()",
      ],
      documentation:
        "Arithmetic multiplication operator.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> 1 * 2\n    2\n\n",
    },
    {
      name: "!==/2",
      type: "function",
      specs: ["@spec term() !== term() :: boolean()"],
      documentation:
        'Strictly not equal to operator.\n\nReturns `true` if the two terms are not exactly equal.\nSee `===/2` for a definition of what is considered "exactly equal".\n\nThis performs a structural comparison where all Elixir\nterms can be compared with each other. See the ["Structural\ncomparison"](#module-structural-comparison) section\nfor more information.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> 1 !== 2\n    true\n\n    iex> 1 !== 1.0\n    true\n\n',
    },
    {
      name: "!=/2",
      type: "function",
      specs: ["@spec term() != term() :: boolean()"],
      documentation:
        'Not equal to operator.\n\nReturns `true` if the two terms are not equal.\n\nThis operator considers 1 and 1.0 to be equal. For match\ncomparison, use `!==/2` instead.\n\nThis performs a structural comparison where all Elixir\nterms can be compared with each other. See the ["Structural\ncomparison"](#module-structural-comparison) section\nfor more information.\n\nAllowed in guard tests. Inlined by the compiler.\n\n## Examples\n\n    iex> 1 != 2\n    true\n\n    iex> 1 != 1.0\n    false\n\n',
    },
  ],
  name: "Kernel",
  callbacks: [],
  macros: [
    {
      name: "||/2",
      type: "macro",
      specs: [],
      documentation:
        'Boolean "or" operator.\n\nProvides a short-circuit operator that evaluates and returns the second\nexpression only if the first one does not evaluate to a truthy value (that is,\nit is either `nil` or `false`). Returns the first expression otherwise.\n\nNot allowed in guard clauses.\n\n## Examples\n\n    iex> Enum.empty?([1]) || Enum.empty?([1])\n    false\n\n    iex> List.first([]) || true\n    true\n\n    iex> Enum.empty?([1]) || 1\n    1\n\n    iex> Enum.empty?([]) || throw(:bad)\n    true\n\nNote that, unlike `or/2`, this operator accepts any expression\nas the first argument, not only booleans.\n',
    },
    {
      name: "|>/2",
      type: "macro",
      specs: [],
      documentation:
        'Pipe operator.\n\nThis operator introduces the expression on the left-hand side as\nthe first argument to the function call on the right-hand side.\n\n## Examples\n\n    iex> [1, [2], 3] |> List.flatten()\n    [1, 2, 3]\n\nThe example above is the same as calling `List.flatten([1, [2], 3])`.\n\nThe `|>/2` operator is mostly useful when there is a desire to execute a series\nof operations resembling a pipeline:\n\n    iex> [1, [2], 3] |> List.flatten() |> Enum.map(fn x -> x * 2 end)\n    [2, 4, 6]\n\nIn the example above, the list `[1, [2], 3]` is passed as the first argument\nto the `List.flatten/1` function, then the flattened list is passed as the\nfirst argument to the `Enum.map/2` function which doubles each element of the\nlist.\n\nIn other words, the expression above simply translates to:\n\n    Enum.map(List.flatten([1, [2], 3]), fn x -> x * 2 end)\n\n## Pitfalls\n\nThere are two common pitfalls when using the pipe operator.\n\nThe first one is related to operator precedence. For example,\nthe following expression:\n\n    String.graphemes "Hello" |> Enum.reverse\n\nTranslates to:\n\n    String.graphemes("Hello" |> Enum.reverse())\n\nwhich results in an error as the `Enumerable` protocol is not defined\nfor binaries. Adding explicit parentheses resolves the ambiguity:\n\n    String.graphemes("Hello") |> Enum.reverse()\n\nOr, even better:\n\n    "Hello" |> String.graphemes() |> Enum.reverse()\n\nThe second limitation is that Elixir always pipes to a function\ncall. Therefore, to pipe into an anonymous function, you need to\ninvoke it:\n\n    some_fun = &Regex.replace(~r/l/, &1, "L")\n    "Hello" |> some_fun.()\n\nAlternatively, you can use `then/2` for the same effect:\n\n    some_fun = &Regex.replace(~r/l/, &1, "L")\n    "Hello" |> then(some_fun)\n\n`then/2` is most commonly used when you want to pipe to a function\nbut the value is expected outside of the first argument, such as\nabove. By replacing `some_fun` by its value, we get:\n\n    "Hello" |> then(&Regex.replace(~r/l/, &1, "L"))\n\n',
    },
    {
      name: "var!/2",
      type: "macro",
      specs: [],
      documentation:
        "Marks that the given variable should not be hygienized.\n\nThis macro expects a variable and it is typically invoked\ninside `quote/2` to mark that a variable\nshould not be hygienized. See `quote/2` for more information.\n\n## Examples\n\n    iex> Kernel.var!(example) = 1\n    1\n    iex> Kernel.var!(example)\n    1\n\n",
    },
    {
      name: "use/2",
      type: "macro",
      specs: [],
      documentation:
        'Uses the given module in the current context.\n\nWhen calling:\n\n    use MyModule, some: :options\n\nElixir will invoke `MyModule.__using__/1` passing the second argument of\n`use` as its argument. Since `__using__/1` is typically a macro, all\nthe usual macro rules apply, and its return value should be quoted code\nthat is then inserted where `use/2` is called.\n\n> #### Code injection {: .warning}\n>\n> `use MyModule` works as a **code-injection point** in the caller.\n> Given the caller of `use MyModule` has little control over how the\n> code is injected, `use/2` should be used with care. If you can,\n> avoid use in favor of `import/2` or `alias/2` whenever possible.\n\n## Examples\n\nFor example, to write test cases using the `ExUnit` framework provided\nwith Elixir, a developer should `use` the `ExUnit.Case` module:\n\n    defmodule AssertionTest do\n      use ExUnit.Case, async: true\n\n      test "always pass" do\n        assert true\n      end\n    end\n\nIn this example, Elixir will call the `__using__/1` macro in the\n`ExUnit.Case` module with the keyword list `[async: true]` as its\nargument.\n\nIn other words, `use/2` translates to:\n\n    defmodule AssertionTest do\n      require ExUnit.Case\n      ExUnit.Case.__using__(async: true)\n\n      test "always pass" do\n        assert true\n      end\n    end\n\nwhere `ExUnit.Case` defines the `__using__/1` macro:\n\n    defmodule ExUnit.Case do\n      defmacro __using__(opts) do\n        # do something with opts\n        quote do\n          # return some code to inject in the caller\n        end\n      end\n    end\n\n## Best practices\n\n`__using__/1` is typically used when there is a need to set some state\n(via module attributes) or callbacks (like `@before_compile`, see the\ndocumentation for `Module` for more information) into the caller.\n\n`__using__/1` may also be used to alias, require, or import functionality\nfrom different modules:\n\n    defmodule MyModule do\n      defmacro __using__(_opts) do\n        quote do\n          import MyModule.Foo\n          import MyModule.Bar\n          import MyModule.Baz\n\n          alias MyModule.Repo\n        end\n      end\n    end\n\nHowever, do not provide `__using__/1` if all it does is to import,\nalias or require the module itself. For example, avoid this:\n\n    defmodule MyModule do\n      defmacro __using__(_opts) do\n        quote do\n          import MyModule\n        end\n      end\n    end\n\nIn such cases, developers should instead import or alias the module\ndirectly, so that they can customize those as they wish,\nwithout the indirection behind `use/2`. Developers must also avoid\ndefining functions inside `__using__/1`.\n\nGiven `use MyModule` can generate any code, it may not be easy for\ndevelopers to understand the impact of `use MyModule`.\n\nFor this reason, to provide guidance and clarity, we recommend developers\nto include an admonition block in their `@moduledoc` that explains how\n`use MyModule` impacts their code. As an example, the `GenServer` documentation\noutlines:\n\n> #### `use GenServer` {: .info}\n>\n> When you `use GenServer`, the `GenServer` module will\n> set `@behaviour GenServer` and define a `child_spec/1`\n> function, so your module can be used as a child\n> in a supervision tree.\n\nThis provides a quick summary of how using a module impacts the user code.\nKeep in mind to only list changes made to the public API of the module.\nFor example, if `use MyModule` sets an internal attribute called\n`@_my_module_info` and this attribute is never meant to be public,\nit must not be listed.\n\nFor convenience, the markup notation to generate the admonition block\nabove is:\n\n```\n> #### `use GenServer` {: .info}\n>\n> When you `use GenServer`, the GenServer module will\n> set `@behaviour GenServer` and define a `child_spec/1`\n> function, so your module can be used as a child\n> in a supervision tree.\n```\n',
    },
    {
      name: "update_in/2",
      type: "macro",
      specs: [],
      documentation:
        'Updates a nested structure via the given `path`.\n\nThis is similar to `update_in/3`, except the path is extracted via\na macro rather than passing a list. For example:\n\n    update_in(opts[:foo][:bar], &(&1 + 1))\n\nIs equivalent to:\n\n    update_in(opts, [:foo, :bar], &(&1 + 1))\n\nThis also works with nested structs and the `struct.path.to.value` way to specify\npaths:\n\n    update_in(struct.foo.bar, &(&1 + 1))\n\nNote that in order for this macro to work, the complete path must always\nbe visible by this macro. For more information about the supported path\nexpressions, please check `get_and_update_in/2` docs.\n\n## Examples\n\n    iex> users = %{"john" => %{age: 27}, "meg" => %{age: 23}}\n    iex> update_in(users["john"][:age], &(&1 + 1))\n    %{"john" => %{age: 28}, "meg" => %{age: 23}}\n\n    iex> users = %{"john" => %{age: 27}, "meg" => %{age: 23}}\n    iex> update_in(users["john"].age, &(&1 + 1))\n    %{"john" => %{age: 28}, "meg" => %{age: 23}}\n\n',
    },
    {
      name: "unless/2",
      type: "macro",
      specs: [],
      documentation:
        'Provides an `unless` macro.\n\nThis macro evaluates and returns the `do` block passed in as the second\nargument if `condition` evaluates to a falsy value (`false` or `nil`).\nOtherwise, it returns the value of the `else` block if present or `nil` if not.\n\nSee also `if/2`.\n\n## Examples\n\n    iex> unless(Enum.empty?([]), do: "Hello")\n    nil\n\n    iex> unless(Enum.empty?([1, 2, 3]), do: "Hello")\n    "Hello"\n\n    iex> unless Enum.sum([2, 2]) == 5 do\n    ...>   "Math still works"\n    ...> else\n    ...>   "Math is broken"\n    ...> end\n    "Math still works"\n\n',
    },
    {
      name: "to_string/1",
      type: "macro",
      specs: [],
      documentation:
        'Converts the argument to a string according to the\n`String.Chars` protocol.\n\nThis is the function invoked when there is string interpolation.\n\n## Examples\n\n    iex> to_string(:foo)\n    "foo"\n\n',
    },
    {
      name: "to_charlist/1",
      type: "macro",
      specs: [],
      documentation:
        'Converts the given term to a charlist according to the `List.Chars` protocol.\n\n## Examples\n\n    iex> to_charlist(:foo)\n    ~c"foo"\n\n',
    },
    {
      name: "then/2",
      type: "macro",
      specs: [],
      documentation:
        'Pipes the first argument, `value`, into the second argument, a function `fun`,\nand returns the result of calling `fun`.\n\nIn other words, it invokes the function `fun` with `value` as argument,\nand returns its result.\n\nThis is most commonly used in pipelines, using the `|>/2` operator, allowing you\nto pipe a value to a function outside of its first argument.\n\n### Examples\n\n    iex> 1 |> then(fn x -> x * 2 end)\n    2\n\n    iex> 1 |> then(fn x -> Enum.drop(["a", "b", "c"], x) end)\n    ["b", "c"]\n',
    },
    {
      name: "tap/2",
      type: "macro",
      specs: [],
      documentation:
        "Pipes the first argument, `value`, into the second argument, a function `fun`,\nand returns `value` itself.\n\nUseful for running synchronous side effects in a pipeline, using the `|>/2` operator.\n\n## Examples\n\n    iex> tap(1, fn x -> x + 1 end)\n    1\n\nMost commonly, this is used in pipelines, using the `|>/2` operator.\nFor example, let's suppose you want to inspect part of a data structure.\nYou could write:\n\n    %{a: 1}\n    |> Map.update!(:a, & &1 + 2)\n    |> tap(&IO.inspect(&1.a))\n    |> Map.update!(:a, & &1 * 2)\n\n",
    },
    {
      name: "sigil_w/2",
      type: "macro",
      specs: [],
      documentation:
        'Handles the sigil `~w` for list of words.\n\nIt returns a list of "words" split by whitespace. Character unescaping and\ninterpolation happens for each word.\n\n## Modifiers\n\n  * `s`: words in the list are strings (default)\n  * `a`: words in the list are atoms\n  * `c`: words in the list are charlists\n\n## Examples\n\n    iex> ~w(foo #{:bar} baz)\n    ["foo", "bar", "baz"]\n\n    iex> ~w(foo #{" bar baz "})\n    ["foo", "bar", "baz"]\n\n    iex> ~w(--source test/enum_test.exs)\n    ["--source", "test/enum_test.exs"]\n\n    iex> ~w(foo bar baz)a\n    [:foo, :bar, :baz]\n\n    iex> ~w(foo bar baz)c\n    [~c"foo", ~c"bar", ~c"baz"]\n\n',
    },
    {
      name: "sigil_s/2",
      type: "macro",
      specs: [],
      documentation:
        'Handles the sigil `~s` for strings.\n\nIt returns a string as if it was a double quoted string, unescaping characters\nand replacing interpolations.\n\n## Examples\n\n    iex> ~s(foo)\n    "foo"\n\n    iex> ~s(f#{:o}o)\n    "foo"\n\n    iex> ~s(f\\#{:o}o)\n    "f\\#{:o}o"\n\n',
    },
    {
      name: "sigil_r/2",
      type: "macro",
      specs: [],
      documentation:
        'Handles the sigil `~r` for regular expressions.\n\nIt returns a regular expression pattern, unescaping characters and replacing\ninterpolations.\n\nMore information on regular expressions can be found in the `Regex` module.\n\n## Examples\n\n    iex> Regex.match?(~r/foo/, "foo")\n    true\n\n    iex> Regex.match?(~r/a#{:b}c/, "abc")\n    true\n\nWhile the `~r` sigil allows parens and brackets to be used as delimiters,\nit is preferred to use `"` or `/` to avoid escaping conflicts with reserved\nregex characters.\n',
    },
    {
      name: "sigil_c/2",
      type: "macro",
      specs: [],
      documentation:
        'Handles the sigil `~c` for charlists.\n\nIt returns a charlist, unescaping characters and replacing interpolations.\n\nA charlist is a list of integers where all the integers are valid code points.\nThe three expressions below are equivalent:\n\n    ~c"foo"\n    [?f, ?o, ?o]\n    [102, 111, 111]\n\nIn practice, charlists are mostly used in specific scenarios such as\ninterfacing with older Erlang libraries that do not accept binaries as arguments.\n\n## Examples\n\n    iex> ~c(foo)\n    ~c"foo"\n\n    iex> ~c(f#{:o}o)\n    ~c"foo"\n\n    iex> ~c(f\\#{:o}o)\n    ~c"f\\#{:o}o"\n\nThe list is only printed as a `~c` sigil if all code points are within the\nASCII range:\n\n    iex> ~c"hełło"\n    [104, 101, 322, 322, 111]\n\n    iex> [104, 101, 108, 108, 111]\n    ~c"hello"\n\nSee `Inspect.Opts` for more information.\n',
    },
    {
      name: "sigil_W/2",
      type: "macro",
      specs: [],
      documentation:
        'Handles the sigil `~W` for list of words.\n\nIt returns a list of "words" split by whitespace without interpolations\nand without escape characters.\n\n## Modifiers\n\n  * `s`: words in the list are strings (default)\n  * `a`: words in the list are atoms\n  * `c`: words in the list are charlists\n\n## Examples\n\n    iex> ~W(foo #{bar} baz)\n    ["foo", "\\#{bar}", "baz"]\n\n',
    },
    {
      name: "sigil_U/2",
      type: "macro",
      specs: [],
      documentation:
        'Handles the sigil `~U` to create a UTC `DateTime`.\n\nBy default, this sigil uses the built-in `Calendar.ISO`, which\nrequires UTC date times to be written in the ISO8601 format:\n\n    ~U[yyyy-mm-dd hh:mm:ssZ]\n    ~U[yyyy-mm-dd hh:mm:ss.ssssssZ]\n    ~U[yyyy-mm-ddThh:mm:ss.ssssss+00:00]\n\nsuch as:\n\n    ~U[2015-01-13 13:00:07Z]\n    ~U[2015-01-13T13:00:07.123+00:00]\n\nIf you are using alternative calendars, any representation can\nbe used as long as you follow the representation by a single space\nand the calendar name:\n\n    ~U[SOME-REPRESENTATION My.Alternative.Calendar]\n\nThe given `datetime_string` must include "Z" or "00:00" offset\nwhich marks it as UTC, otherwise an error is raised.\n\nThe lower case `~u` variant does not exist as interpolation\nand escape characters are not useful for date time sigils.\n\nMore information on date times can be found in the `DateTime` module.\n\n## Examples\n\n    iex> ~U[2015-01-13 13:00:07Z]\n    ~U[2015-01-13 13:00:07Z]\n    iex> ~U[2015-01-13T13:00:07.001+00:00]\n    ~U[2015-01-13 13:00:07.001Z]\n\n',
    },
    {
      name: "sigil_T/2",
      type: "macro",
      specs: [],
      documentation:
        "Handles the sigil `~T` for times.\n\nBy default, this sigil uses the built-in `Calendar.ISO`, which\nrequires times to be written in the ISO8601 format:\n\n    ~T[hh:mm:ss]\n    ~T[hh:mm:ss.ssssss]\n\nsuch as:\n\n    ~T[13:00:07]\n    ~T[13:00:07.123]\n\nIf you are using alternative calendars, any representation can\nbe used as long as you follow the representation by a single space\nand the calendar name:\n\n    ~T[SOME-REPRESENTATION My.Alternative.Calendar]\n\nThe lower case `~t` variant does not exist as interpolation\nand escape characters are not useful for time sigils.\n\nMore information on times can be found in the `Time` module.\n\n## Examples\n\n    iex> ~T[13:00:07]\n    ~T[13:00:07]\n    iex> ~T[13:00:07.001]\n    ~T[13:00:07.001]\n\n",
    },
    {
      name: "sigil_S/2",
      type: "macro",
      specs: [],
      documentation:
        'Handles the sigil `~S` for strings.\n\nIt returns a string without interpolations and without escape\ncharacters.\n\n## Examples\n\n    iex> ~S(foo)\n    "foo"\n    iex> ~S(f#{o}o)\n    "f\\#{o}o"\n    iex> ~S(\\o/)\n    "\\\\o/"\n\n',
    },
    {
      name: "sigil_N/2",
      type: "macro",
      specs: [],
      documentation:
        "Handles the sigil `~N` for naive date times.\n\nBy default, this sigil uses the built-in `Calendar.ISO`, which\nrequires naive date times to be written in the ISO8601 format:\n\n    ~N[yyyy-mm-dd hh:mm:ss]\n    ~N[yyyy-mm-dd hh:mm:ss.ssssss]\n    ~N[yyyy-mm-ddThh:mm:ss.ssssss]\n\nsuch as:\n\n    ~N[2015-01-13 13:00:07]\n    ~N[2015-01-13T13:00:07.123]\n\nIf you are using alternative calendars, any representation can\nbe used as long as you follow the representation by a single space\nand the calendar name:\n\n    ~N[SOME-REPRESENTATION My.Alternative.Calendar]\n\nThe lower case `~n` variant does not exist as interpolation\nand escape characters are not useful for date time sigils.\n\nMore information on naive date times can be found in the\n`NaiveDateTime` module.\n\n## Examples\n\n    iex> ~N[2015-01-13 13:00:07]\n    ~N[2015-01-13 13:00:07]\n    iex> ~N[2015-01-13T13:00:07.001]\n    ~N[2015-01-13 13:00:07.001]\n\n",
    },
    {
      name: "sigil_D/2",
      type: "macro",
      specs: [],
      documentation:
        "Handles the sigil `~D` for dates.\n\nBy default, this sigil uses the built-in `Calendar.ISO`, which\nrequires dates to be written in the ISO8601 format:\n\n    ~D[yyyy-mm-dd]\n\nsuch as:\n\n    ~D[2015-01-13]\n\nIf you are using alternative calendars, any representation can\nbe used as long as you follow the representation by a single space\nand the calendar name:\n\n    ~D[SOME-REPRESENTATION My.Alternative.Calendar]\n\nThe lower case `~d` variant does not exist as interpolation\nand escape characters are not useful for date sigils.\n\nMore information on dates can be found in the `Date` module.\n\n## Examples\n\n    iex> ~D[2015-01-13]\n    ~D[2015-01-13]\n\n",
    },
    {
      name: "sigil_C/2",
      type: "macro",
      specs: [],
      documentation:
        'Handles the sigil `~C` for charlists.\n\nIt returns a charlist without interpolations and without escape\ncharacters.\n\nA charlist is a list of integers where all the integers are valid code points.\nThe three expressions below are equivalent:\n\n    ~C"foo\\n"\n    [?f, ?o, ?o, ?\\\\, ?n]\n    [102, 111, 111, 92, 110]\n\nIn practice, charlists are mostly used in specific scenarios such as\ninterfacing with older Erlang libraries that do not accept binaries as arguments.\n\n## Examples\n\n    iex> ~C(foo)\n    ~c"foo"\n\n    iex> ~C(f#{o}o)\n    ~c"f\\#{o}o"\n\n    iex> ~C(foo\\n)\n    ~c"foo\\\\n"\n\n',
    },
    {
      name: "reraise/3",
      type: "macro",
      specs: [],
      documentation:
        'Raises an exception preserving a previous stacktrace.\n\n`reraise/3` works like `reraise/2`, except it passes arguments to the\n`exception/1` function as explained in `raise/2`.\n\n## Examples\n\n    try do\n      raise "oops"\n    rescue\n      exception ->\n        reraise WrapperError, [exception: exception], __STACKTRACE__\n    end\n\n',
    },
    {
      name: "reraise/2",
      type: "macro",
      specs: [],
      documentation:
        'Raises an exception preserving a previous stacktrace.\n\nWorks like `raise/1` but does not generate a new stacktrace.\n\nNote that `__STACKTRACE__` can be used inside catch/rescue\nto retrieve the current stacktrace.\n\n## Examples\n\n    try do\n      raise "oops"\n    rescue\n      exception ->\n        reraise exception, __STACKTRACE__\n    end\n\n',
    },
    {
      name: "raise/2",
      type: "macro",
      specs: [],
      documentation:
        'Raises an exception.\n\nCalls the `exception/1` function on the given argument (which has to be a\nmodule name like `ArgumentError` or `RuntimeError`) passing `attributes`\nin order to retrieve the exception struct.\n\nAny module that contains a call to the `defexception/1` macro automatically\nimplements the `c:Exception.exception/1` callback expected by `raise/2`.\nFor more information, see `defexception/1`.\n\n## Examples\n\n    iex> raise(ArgumentError, "Sample")\n    ** (ArgumentError) Sample\n\n',
    },
    {
      name: "raise/1",
      type: "macro",
      specs: [],
      documentation:
        'Raises an exception.\n\nIf `message` is a string, it raises a `RuntimeError` exception with it.\n\nIf `message` is an atom, it just calls `raise/2` with the atom as the first\nargument and `[]` as the second one.\n\nIf `message` is an exception struct, it is raised as is.\n\nIf `message` is anything else, `raise` will fail with an `ArgumentError`\nexception.\n\n## Examples\n\n    iex> raise "oops"\n    ** (RuntimeError) oops\n\n    try do\n      1 + :foo\n    rescue\n      x in [ArithmeticError] ->\n        IO.puts("that was expected")\n        raise x\n    end\n\n',
    },
    {
      name: "put_in/2",
      type: "macro",
      specs: [],
      documentation:
        'Puts a value in a nested structure via the given `path`.\n\nThis is similar to `put_in/3`, except the path is extracted via\na macro rather than passing a list. For example:\n\n    put_in(opts[:foo][:bar], :baz)\n\nIs equivalent to:\n\n    put_in(opts, [:foo, :bar], :baz)\n\nThis also works with nested structs and the `struct.path.to.value` way to specify\npaths:\n\n    put_in(struct.foo.bar, :baz)\n\nNote that in order for this macro to work, the complete path must always\nbe visible by this macro. For more information about the supported path\nexpressions, please check `get_and_update_in/2` docs.\n\n## Examples\n\n    iex> users = %{"john" => %{age: 27}, "meg" => %{age: 23}}\n    iex> put_in(users["john"][:age], 28)\n    %{"john" => %{age: 28}, "meg" => %{age: 23}}\n\n    iex> users = %{"john" => %{age: 27}, "meg" => %{age: 23}}\n    iex> put_in(users["john"].age, 28)\n    %{"john" => %{age: 28}, "meg" => %{age: 23}}\n\n',
    },
    {
      name: "pop_in/1",
      type: "macro",
      specs: [],
      documentation:
        'Pops a key from the nested structure via the given `path`.\n\nThis is similar to `pop_in/2`, except the path is extracted via\na macro rather than passing a list. For example:\n\n    pop_in(opts[:foo][:bar])\n\nIs equivalent to:\n\n    pop_in(opts, [:foo, :bar])\n\nNote that in order for this macro to work, the complete path must always\nbe visible by this macro. For more information about the supported path\nexpressions, please check `get_and_update_in/2` docs.\n\n## Examples\n\n    iex> users = %{"john" => %{age: 27}, "meg" => %{age: 23}}\n    iex> pop_in(users["john"][:age])\n    {27, %{"john" => %{}, "meg" => %{age: 23}}}\n\n    iex> users = %{john: %{age: 27}, meg: %{age: 23}}\n    iex> pop_in(users.john[:age])\n    {27, %{john: %{}, meg: %{age: 23}}}\n\nIn case any entry returns `nil`, its key will be removed\nand the deletion will be considered a success.\n',
    },
    {
      name: "or/2",
      type: "macro",
      specs: [],
      documentation:
        'Strictly boolean "or" operator.\n\nIf `left` is `true`, returns `true`, otherwise returns `right`.\n\nRequires only the `left` operand to be a boolean since it short-circuits.\nIf the `left` operand is not a boolean, a `BadBooleanError` exception is\nraised.\n\nAllowed in guard tests.\n\n## Examples\n\n    iex> true or false\n    true\n\n    iex> false or 42\n    42\n\n    iex> 42 or false\n    ** (BadBooleanError) expected a boolean on left-side of "or", got: 42\n\n',
    },
    {
      name: "match?/2",
      type: "macro",
      specs: [],
      documentation:
        "A convenience macro that checks if the right side (an expression) matches the\nleft side (a pattern).\n\n## Examples\n\n    iex> match?(1, 1)\n    true\n\n    iex> match?({1, _}, {1, 2})\n    true\n\n    iex> map = %{a: 1, b: 2}\n    iex> match?(%{a: _}, map)\n    true\n\n    iex> a = 1\n    iex> match?(^a, 1)\n    true\n\n`match?/2` is very useful when filtering or finding a value in an enumerable:\n\n    iex> list = [a: 1, b: 2, a: 3]\n    iex> Enum.filter(list, &match?({:a, _}, &1))\n    [a: 1, a: 3]\n\nGuard clauses can also be given to the match:\n\n    iex> list = [a: 1, b: 2, a: 3]\n    iex> Enum.filter(list, &match?({:a, x} when x < 2, &1))\n    [a: 1]\n\nVariables assigned in the match will not be available outside of the\nfunction call (unlike regular pattern matching with the `=` operator):\n\n    iex> match?(_x, 1)\n    true\n    iex> binding()\n    []\n\n## Values vs patterns\n\nRemember the pin operator matches _values_, not _patterns_.\nPassing a variable as the pattern will always return `true` and will\nresult in a warning that the variable is unused:\n\n    # don't do this\n    pattern = %{a: :a}\n    match?(pattern, %{b: :b})\n\nSimilarly, moving an expression out the pattern may no longer preserve\nits semantics. For example:\n\n    match?([_ | _], [1, 2, 3])\n    #=> true\n\n    pattern = [_ | _]\n    match?(pattern, [1, 2, 3])\n    ** (CompileError) invalid use of _. _ can only be used inside patterns to ignore values and cannot be used in expressions. Make sure you are inside a pattern or change it accordingly\n\nAnother example is that a map as a pattern performs a subset match, but not\nonce assigned to a variable:\n\n    match?(%{x: 1}, %{x: 1, y: 2})\n    #=> true\n\n    attrs = %{x: 1}\n    match?(^attrs, %{x: 1, y: 2})\n    #=> false\n\nThe pin operator will check if the values are equal, using `===/2`, while\npatterns have their own rules when matching maps, lists, and so forth.\nSuch behavior is not specific to `match?/2`. The following code also\nthrows an exception:\n\n    attrs = %{x: 1}\n    ^attrs = %{x: 1, y: 2}\n    #=> (MatchError) no match of right hand side value: %{x: 1, y: 2}\n\n",
    },
    {
      name: "is_struct/2",
      type: "macro",
      specs: [],
      documentation:
        'Returns `true` if `term` is a struct of `name`, otherwise returns `false`.\n\n`is_struct/2` does not check that `name` exists and is a valid struct.\nIf you want such validations, you must pattern match on the struct\ninstead, such as `match?(%URI{}, arg)`.\n\nAllowed in guard tests.\n\n## Examples\n\n    iex> is_struct(URI.parse("/"), URI)\n    true\n\n    iex> is_struct(URI.parse("/"), Macro.Env)\n    false\n\n',
    },
    {
      name: "is_struct/1",
      type: "macro",
      specs: [],
      documentation:
        'Returns `true` if `term` is a struct, otherwise returns `false`.\n\nAllowed in guard tests.\n\n## Examples\n\n    iex> is_struct(URI.parse("/"))\n    true\n\n    iex> is_struct(%{})\n    false\n\n',
    },
    {
      name: "is_non_struct_map/1",
      type: "macro",
      specs: [],
      documentation:
        'Returns `true` if `term` is a map that is not a struct, otherwise\nreturns `false`.\n\nAllowed in guard tests.\n\n## Examples\n\n    iex> is_non_struct_map(%{})\n    true\n\n    iex> is_non_struct_map(URI.parse("/"))\n    false\n\n    iex> is_non_struct_map(nil)\n    false\n\n',
    },
    {
      name: "is_nil/1",
      type: "macro",
      specs: [],
      documentation:
        "Returns `true` if `term` is `nil`, `false` otherwise.\n\nAllowed in guard clauses.\n\n## Examples\n\n    iex> is_nil(1)\n    false\n\n    iex> is_nil(nil)\n    true\n\n",
    },
    {
      name: "is_exception/2",
      type: "macro",
      specs: [],
      documentation:
        "Returns `true` if `term` is an exception of `name`, otherwise returns `false`.\n\nAllowed in guard tests.\n\n## Examples\n\n    iex> is_exception(%RuntimeError{}, RuntimeError)\n    true\n\n    iex> is_exception(%RuntimeError{}, Macro.Env)\n    false\n\n",
    },
    {
      name: "is_exception/1",
      type: "macro",
      specs: [],
      documentation:
        "Returns `true` if `term` is an exception, otherwise returns `false`.\n\nAllowed in guard tests.\n\n## Examples\n\n    iex> is_exception(%RuntimeError{})\n    true\n\n    iex> is_exception(%{})\n    false\n\n",
    },
    {
      name: "in/2",
      type: "macro",
      specs: [],
      documentation:
        "Membership operator.\n\nChecks if the element on the left-hand side is a member of the\ncollection on the right-hand side.\n\n## Examples\n\n    iex> x = 1\n    iex> x in [1, 2, 3]\n    true\n\nThis operator (which is a macro) simply translates to a call to\n`Enum.member?/2`. The example above would translate to:\n\n    Enum.member?([1, 2, 3], x)\n\nElixir also supports `left not in right`, which evaluates to\n`not(left in right)`:\n\n    iex> x = 1\n    iex> x not in [1, 2, 3]\n    false\n\n## Guards\n\nThe `in/2` operator (as well as `not in`) can be used in guard clauses as\nlong as the right-hand side is a range or a list.\n\nIf the right-hand side is a list, Elixir will expand the operator to a valid\nguard expression which needs to check each value. For example:\n\n    when x in [1, 2, 3]\n\ntranslates to:\n\n    when x === 1 or x === 2 or x === 3\n\nHowever, this construct will be inefficient for large lists. In such cases, it\nis best to stop using guards and use a more appropriate data structure, such\nas `MapSet`.\n\nIf the right-hand side is a range, a more efficient comparison check will be\ndone. For example:\n\n    when x in 1..1000\n\ntranslates roughly to:\n\n    when x >= 1 and x <= 1000\n\n### AST considerations\n\n`left not in right` is parsed by the compiler into the AST:\n\n    {:not, _, [{:in, _, [left, right]}]}\n\nThis is the same AST as `not(left in right)`.\n\nAdditionally, `Macro.to_string/2` and `Code.format_string!/2`\nwill translate all occurrences of this AST to `left not in right`.\n",
    },
    {
      name: "if/2",
      type: "macro",
      specs: [],
      documentation:
        "Provides an `if/2` macro.\n\nThis macro expects the first argument to be a condition and the second\nargument to be a keyword list. Generally speaking, Elixir developers\nprefer to use pattern matching and guards in function definitions and\n`case/2`, as they are succinct and precise. However, not all conditions\ncan be expressed through patterns and guards, which makes `if/2` a viable\nalternative.\n\nSimilar to `case/2`, any assignment in the condition will be available\non both clauses, as well as after the `if` expression.\n\n## One-liner examples\n\n    if(foo, do: bar)\n\nIn the example above, `bar` will be returned if `foo` evaluates to\na truthy value (neither `false` nor `nil`). Otherwise, `nil` will be\nreturned.\n\nAn `else` option can be given to specify the opposite:\n\n    if(foo, do: bar, else: baz)\n\n## Blocks examples\n\nIt's also possible to pass a block to the `if/2` macro. The first\nexample above would be translated to:\n\n    if foo do\n      bar\n    end\n\nNote that `do`-`end` become delimiters. The second example would\ntranslate to:\n\n    if foo do\n      bar\n    else\n      baz\n    end\n\nIf you find yourself nesting conditionals inside conditionals,\nconsider using `cond/1`.\n",
    },
    {
      name: "get_in/1",
      type: "macro",
      specs: [],
      documentation:
        'Gets a key from the nested structure via the given `path`, with\nnil-safe handling.\n\nThis is similar to `get_in/2`, except the path is extracted via\na macro rather than passing a list. For example:\n\n    get_in(opts[:foo][:bar])\n\nIs equivalent to:\n\n    get_in(opts, [:foo, :bar])\n\nAdditionally, this macro can traverse structs:\n\n    get_in(struct.foo.bar)\n\nIn case any of the keys returns `nil`, then `nil` will be returned\nand `get_in/1` won\'t traverse any further.\n\nNote that in order for this macro to work, the complete path must always\nbe visible by this macro. For more information about the supported path\nexpressions, please check `get_and_update_in/2` docs.\n\n## Examples\n\n    iex> users = %{"john" => %{age: 27}, "meg" => %{age: 23}}\n    iex> get_in(users["john"].age)\n    27\n    iex> get_in(users["unknown"].age)\n    nil\n\n',
    },
    {
      name: "get_and_update_in/2",
      type: "macro",
      specs: [],
      documentation:
        'Gets a value and updates a nested data structure via the given `path`.\n\nThis is similar to `get_and_update_in/3`, except the path is extracted\nvia a macro rather than passing a list. For example:\n\n    get_and_update_in(opts[:foo][:bar], &{&1, &1 + 1})\n\nIs equivalent to:\n\n    get_and_update_in(opts, [:foo, :bar], &{&1, &1 + 1})\n\nThis also works with nested structs and the `struct.path.to.value` way to specify\npaths:\n\n    get_and_update_in(struct.foo.bar, &{&1, &1 + 1})\n\nNote that in order for this macro to work, the complete path must always\nbe visible by this macro. See the "Paths" section below.\n\n## Examples\n\n    iex> users = %{"john" => %{age: 27}, "meg" => %{age: 23}}\n    iex> get_and_update_in(users["john"].age, &{&1, &1 + 1})\n    {27, %{"john" => %{age: 28}, "meg" => %{age: 23}}}\n\n## Paths\n\nA path may start with a variable, local or remote call, and must be\nfollowed by one or more:\n\n  * `foo[bar]` - accesses the key `bar` in `foo`; in case `foo` is nil,\n    `nil` is returned\n\n  * `foo.bar` - accesses a map/struct field; in case the field is not\n    present, an error is raised\n\nHere are some valid paths:\n\n    users["john"][:age]\n    users["john"].age\n    User.all()["john"].age\n    all_users()["john"].age\n\nHere are some invalid ones:\n\n    # Does a remote call after the initial value\n    users["john"].do_something(arg1, arg2)\n\n    # Does not access any key or field\n    users\n\n',
    },
    {
      name: "destructure/2",
      type: "macro",
      specs: [],
      documentation:
        "Destructures two lists, assigning each term in the\nright one to the matching term in the left one.\n\nUnlike pattern matching via `=`, if the sizes of the left\nand right lists don't match, destructuring simply stops\ninstead of raising an error.\n\n## Examples\n\n    iex> destructure([x, y, z], [1, 2, 3, 4, 5])\n    iex> {x, y, z}\n    {1, 2, 3}\n\nIn the example above, even though the right list has more entries than the\nleft one, destructuring works fine. If the right list is smaller, the\nremaining elements are simply set to `nil`:\n\n    iex> destructure([x, y, z], [1])\n    iex> {x, y, z}\n    {1, nil, nil}\n\nThe left-hand side supports any expression you would use\non the left-hand side of a match:\n\n    x = 1\n    destructure([^x, y, z], [1, 2, 3])\n\nThe example above will only work if `x` matches the first value in the right\nlist. Otherwise, it will raise a `MatchError` (like the `=` operator would\ndo).\n",
    },
    {
      name: "defstruct/1",
      type: "macro",
      specs: [],
      documentation:
        'Defines a struct.\n\nA struct is a tagged map that allows developers to provide\ndefault values for keys, tags to be used in polymorphic\ndispatches and compile time assertions. For more information\nabout structs, please check `%/2`.\n\nIt is only possible to define a struct per module, as the\nstruct is tied to the module itself. Calling `defstruct/1`\nalso defines a `__struct__/0` function that returns the\nstruct itself.\n\n## Examples\n\n    defmodule User do\n      defstruct name: nil, age: nil\n    end\n\nStruct fields are evaluated at compile-time, which allows\nthem to be dynamic. In the example below, `10 + 11` is\nevaluated at compile-time and the age field is stored\nwith value `21`:\n\n    defmodule User do\n      defstruct name: nil, age: 10 + 11\n    end\n\nThe `fields` argument is usually a keyword list with field names\nas atom keys and default values as corresponding values. `defstruct/1`\nalso supports a list of atoms as its argument: in that case, the atoms\nin the list will be used as the struct\'s field names and they will all\ndefault to `nil`.\n\n    defmodule Post do\n      defstruct [:title, :content, :author]\n    end\n\nAdd documentation to a struct with the `@doc` attribute, like a function.\n\n    defmodule Post do\n      @doc "A post. The content should be valid Markdown."\n      defstruct [:title, :content, :author]\n    end\n\n## Deriving\n\nAlthough structs are maps, by default structs do not implement\nany of the protocols implemented for maps. For example, attempting\nto use a protocol with the `User` struct leads to an error:\n\n    john = %User{name: "John"}\n    MyProtocol.call(john)\n    ** (Protocol.UndefinedError) protocol MyProtocol not implemented for %User{...}\n\n`defstruct/1`, however, allows protocol implementations to be\n*derived*. This can be done by defining a `@derive` attribute as a\nlist before invoking `defstruct/1`:\n\n    defmodule User do\n      @derive MyProtocol\n      defstruct name: nil, age: nil\n    end\n\n    MyProtocol.call(john) # it works!\n\nA common example is to `@derive` the `Inspect` protocol to hide certain fields\nwhen the struct is printed:\n\n    defmodule User do\n      @derive {Inspect, only: :name}\n      defstruct name: nil, age: nil\n    end\n\nFor each protocol in `@derive`, Elixir will assert the protocol has\nbeen implemented for `Any`. If the `Any` implementation defines a\n`__deriving__/3` callback, the callback will be invoked and it should define\nthe implementation module. Otherwise an implementation that simply points to\nthe `Any` implementation is automatically derived. For more information on\nthe `__deriving__/3` callback, see `Protocol.derive/3`.\n\n## Enforcing keys\n\nWhen building a struct, Elixir will automatically guarantee all keys\nbelong to the struct:\n\n    %User{name: "john", unknown: :key}\n    ** (KeyError) key :unknown not found in: %User{age: 21, name: nil}\n\nElixir also allows developers to enforce that certain keys must always be\ngiven when building the struct:\n\n    defmodule User do\n      @enforce_keys [:name]\n      defstruct name: nil, age: 10 + 11\n    end\n\nNow trying to build a struct without the name key will fail:\n\n    %User{age: 21}\n    ** (ArgumentError) the following keys must also be given when building struct User: [:name]\n\nKeep in mind `@enforce_keys` is a simple compile-time guarantee\nto aid developers when building structs. It is not enforced on\nupdates and it does not provide any sort of value-validation.\n\n## Types\n\nIt is recommended to define types for structs. By convention, such a type\nis called `t`. To define a struct inside a type, the struct literal syntax\nis used:\n\n    defmodule User do\n      defstruct name: "John", age: 25\n      @type t :: %__MODULE__{name: String.t(), age: non_neg_integer}\n    end\n\nIt is recommended to only use the struct syntax when defining the struct\'s\ntype. When referring to another struct, it\'s better to use `User.t()` instead of\n`%User{}`.\n\nThe types of the struct fields that are not included in `%User{}` default to\n`term()` (see `t:term/0`).\n\nStructs whose internal structure is private to the local module (pattern\nmatching them or directly accessing their fields should not be allowed) should\nuse the `@opaque` attribute. Structs whose internal structure is public should\nuse `@type`.\n',
    },
    {
      name: "defprotocol/2",
      type: "macro",
      specs: [],
      documentation:
        "Defines a protocol.\n\nSee the `Protocol` module for more information.\n",
    },
    {
      name: "defp/2",
      type: "macro",
      specs: [],
      documentation:
        "Defines a private function with the given name and body.\n\nPrivate functions are only accessible from within the module in which they are\ndefined. Trying to access a private function from outside the module it's\ndefined in results in an `UndefinedFunctionError` exception.\n\nCheck `def/2` for more information.\n\n## Examples\n\n    defmodule Foo do\n      def bar do\n        sum(1, 2)\n      end\n\n      defp sum(a, b), do: a + b\n    end\n\n    Foo.bar()\n    #=> 3\n\n    Foo.sum(1, 2)\n    ** (UndefinedFunctionError) undefined function Foo.sum/2\n\n",
    },
    {
      name: "defoverridable/1",
      type: "macro",
      specs: [],
      documentation:
        "Makes the given definitions in the current module overridable.\n\nIf the user defines a new function or macro with the same name\nand arity, then the overridable ones are discarded. Otherwise, the\noriginal definitions are used.\n\nIt is possible for the overridden definition to have a different visibility\nthan the original: a public function can be overridden by a private\nfunction and vice-versa.\n\nMacros cannot be overridden as functions and vice-versa.\n\n## Example\n\n    defmodule DefaultMod do\n      defmacro __using__(_opts) do\n        quote do\n          def test(x, y) do\n            x + y\n          end\n\n          defoverridable test: 2\n        end\n      end\n    end\n\n    defmodule ChildMod do\n      use DefaultMod\n\n      def test(x, y) do\n        x * y + super(x, y)\n      end\n    end\n\nAs seen as in the example above, `super` can be used to call the default\nimplementation.\n\n> #### Disclaimer {: .tip}\n>\n> Use `defoverridable` with care. If you need to define multiple modules\n> with the same behaviour, it may be best to move the default implementation\n> to the caller, and check if a callback exists via `Code.ensure_loaded?/1` and\n> `function_exported?/3`.\n>\n> For example, in the example above, imagine there is a module that calls the\n> `test/2` function. This module could be defined as such:\n>\n>     defmodule CallsTest do\n>       def receives_module_and_calls_test(module, x, y) do\n>         if Code.ensure_loaded?(module) and function_exported?(module, :test, 2) do\n>           module.test(x, y)\n>         else\n>           x + y\n>         end\n>       end\n>     end\n\n## Example with behaviour\n\nYou can also pass a behaviour to `defoverridable` and it will mark all of the\ncallbacks in the behaviour as overridable:\n\n\n    defmodule Behaviour do\n      @callback test(number(), number()) :: number()\n    end\n\n    defmodule DefaultMod do\n      defmacro __using__(_opts) do\n        quote do\n          @behaviour Behaviour\n\n          def test(x, y) do\n            x + y\n          end\n\n          defoverridable Behaviour\n        end\n      end\n    end\n\n    defmodule ChildMod do\n      use DefaultMod\n\n      def test(x, y) do\n        x * y + super(x, y)\n      end\n    end\n\n",
    },
    {
      name: "defmodule/2",
      type: "macro",
      specs: [],
      documentation:
        'Defines a module given by name with the given contents.\n\nThis macro defines a module with the given `alias` as its name and with the\ngiven contents. It returns a tuple with four elements:\n\n  * `:module`\n  * the module name\n  * the binary contents of the module\n  * the result of evaluating the contents block\n\n## Examples\n\n    defmodule Number do\n      def one, do: 1\n      def two, do: 2\n    end\n    #=> {:module, Number, <<70, 79, 82, ...>>, {:two, 0}}\n\n    Number.one()\n    #=> 1\n\n    Number.two()\n    #=> 2\n\n## Module names and aliases\n\nModule names (and aliases) must start with an ASCII uppercase character which\nmay be followed by any ASCII letter, number, or underscore. Elixir\'s\n[Naming Conventions](naming-conventions.md) suggest for module names and aliases\nto be written in the `CamelCase` format.\n\nYou can also use atoms as the module name, although they must only contain ASCII\ncharacters.\n\n## Nesting\n\nNesting a module inside another module affects the name of the nested module:\n\n    defmodule Foo do\n      defmodule Bar do\n      end\n    end\n\nIn the example above, two modules - `Foo` and `Foo.Bar` - are created.\nWhen nesting, Elixir automatically creates an alias to the inner module,\nallowing the second module `Foo.Bar` to be accessed as `Bar` in the same\nlexical scope where it\'s defined (the `Foo` module). This only happens\nif the nested module is defined via an alias.\n\nIf the `Foo.Bar` module is moved somewhere else, the references to `Bar` in\nthe `Foo` module need to be updated to the fully-qualified name (`Foo.Bar`) or\nan alias has to be explicitly set in the `Foo` module with the help of\n`alias/2`.\n\n    defmodule Foo.Bar do\n      # code\n    end\n\n    defmodule Foo do\n      alias Foo.Bar\n      # code here can refer to "Foo.Bar" as just "Bar"\n    end\n\n## Dynamic names\n\nElixir module names can be dynamically generated. This is very\nuseful when working with macros. For instance, one could write:\n\n    defmodule Module.concat(["Foo", "Bar"]) do\n      # contents ...\n    end\n\nElixir will accept any module name as long as the expression passed as the\nfirst argument to `defmodule/2` evaluates to an atom.\nNote that, when a dynamic name is used, Elixir won\'t nest the name under\nthe current module nor automatically set up an alias.\n\n## Reserved module names\n\nIf you attempt to define a module that already exists, you will get a\nwarning saying that a module has been redefined.\n\nThere are some modules that Elixir does not currently implement but it\nmay be implement in the future. Those modules are reserved and defining\nthem will result in a compilation error:\n\n    defmodule Any do\n      # code\n    end\n    ** (CompileError) iex:1: module Any is reserved and cannot be defined\n\nElixir reserves the following module names: `Elixir`, `Any`, `BitString`,\n`PID`, and `Reference`.\n',
    },
    {
      name: "defmacrop/2",
      type: "macro",
      specs: [],
      documentation:
        "Defines a private macro with the given name and body.\n\nPrivate macros are only accessible from the same module in which they are\ndefined.\n\nPrivate macros must be defined before its usage.\n\nCheck `defmacro/2` for more information, and check `def/2` for rules on\nnaming and default arguments.\n\n",
    },
    {
      name: "defmacro/2",
      type: "macro",
      specs: [],
      documentation:
        'Defines a public macro with the given name and body.\n\nMacros must be defined before its usage.\n\nCheck `def/2` for rules on naming and default arguments.\n\n## Examples\n\n    defmodule MyLogic do\n      defmacro unless(expr, opts) do\n        quote do\n          if !unquote(expr), unquote(opts)\n        end\n      end\n    end\n\n    require MyLogic\n\n    MyLogic.unless false do\n      IO.puts("It works")\n    end\n\n',
    },
    {
      name: "defimpl/3",
      type: "macro",
      specs: [],
      documentation:
        "Defines an implementation for the given protocol.\n\nSee the `Protocol` module for more information.\n",
    },
    {
      name: "defguardp/1",
      type: "macro",
      specs: [],
      documentation:
        "Generates a private macro suitable for use in guard expressions.\n\nIt raises at compile time if the definition uses expressions that aren't\nallowed in guards, and otherwise creates a private macro that can be used\nboth inside or outside guards in the current module.\n\nSimilar to `defmacrop/2`, `defguardp/1` must be defined before its use\nin the current module.\n",
    },
    {
      name: "defguard/1",
      type: "macro",
      specs: [],
      documentation:
        'Generates a macro suitable for use in guard expressions.\n\nIt raises at compile time if the definition uses expressions that aren\'t\nallowed in guards, and otherwise creates a macro that can be used both inside\nor outside guards.\n\nNote the convention in Elixir is to prefix all guards that return a boolean\nwith the `is_` prefix, such as `is_list/1`. If, however, the function/macro\nreturns a boolean and is not allowed in guards, it should have no prefix and\nend with a question mark, such as `Keyword.keyword?/1`.\n\n## Example\n\n    defmodule Integer.Guards do\n      defguard is_even(value) when is_integer(value) and rem(value, 2) == 0\n    end\n\n    defmodule Collatz do\n      @moduledoc "Tools for working with the Collatz sequence."\n      import Integer.Guards\n\n      @doc "Determines the number of steps `n` takes to reach `1`."\n      # If this function never converges, please let me know what `n` you used.\n      def converge(n) when n > 0, do: step(n, 0)\n\n      defp step(1, step_count) do\n        step_count\n      end\n\n      defp step(n, step_count) when is_even(n) do\n        step(div(n, 2), step_count + 1)\n      end\n\n      defp step(n, step_count) do\n        step(3 * n + 1, step_count + 1)\n      end\n    end\n\n',
    },
    {
      name: "defexception/1",
      type: "macro",
      specs: [],
      documentation:
        'Defines an exception.\n\nExceptions are structs backed by a module that implements\nthe `Exception` behaviour. The `Exception` behaviour requires\ntwo functions to be implemented:\n\n  * [`exception/1`](`c:Exception.exception/1`) - receives the arguments given to `raise/2`\n    and returns the exception struct. The default implementation\n    accepts either a set of keyword arguments that is merged into\n    the struct or a string to be used as the exception\'s message.\n\n  * [`message/1`](`c:Exception.message/1`) - receives the exception struct and must return its\n    message. Most commonly exceptions have a message field which\n    by default is accessed by this function. However, if an exception\n    does not have a message field, this function must be explicitly\n    implemented.\n\nSince exceptions are structs, the API supported by `defstruct/1`\nis also available in `defexception/1`.\n\n## Raising exceptions\n\nThe most common way to raise an exception is via `raise/2`:\n\n    defmodule MyAppError do\n      defexception [:message]\n    end\n\n    value = [:hello]\n\n    raise MyAppError,\n      message: "did not get what was expected, got: #{inspect(value)}"\n\nIn many cases it is more convenient to pass the expected value to\n`raise/2` and generate the message in the `c:Exception.exception/1` callback:\n\n    defmodule MyAppError do\n      defexception [:message]\n\n      @impl true\n      def exception(value) do\n        msg = "did not get what was expected, got: #{inspect(value)}"\n        %MyAppError{message: msg}\n      end\n    end\n\n    raise MyAppError, value\n\nThe example above shows the preferred strategy for customizing\nexception messages.\n',
    },
    {
      name: "defdelegate/2",
      type: "macro",
      specs: [],
      documentation:
        "Defines a function that delegates to another module.\n\nFunctions defined with `defdelegate/2` are public and can be invoked from\noutside the module they're defined in, as if they were defined using `def/2`.\nTherefore, `defdelegate/2` is about extending the current module's public API.\nIf what you want is to invoke a function defined in another module without\nusing its full module name, then use `alias/2` to shorten the module name or use\n`import/2` to be able to invoke the function without the module name altogether.\n\nDelegation only works with functions; delegating macros is not supported.\n\nCheck `def/2` for rules on naming and default arguments.\n\n## Options\n\n  * `:to` - the module to dispatch to.\n\n  * `:as` - the function to call on the target given in `:to`.\n    This parameter is optional and defaults to the name being\n    delegated (`funs`).\n\n## Examples\n\n    defmodule MyList do\n      defdelegate reverse(list), to: Enum\n      defdelegate other_reverse(list), to: Enum, as: :reverse\n    end\n\n    MyList.reverse([1, 2, 3])\n    #=> [3, 2, 1]\n\n    MyList.other_reverse([1, 2, 3])\n    #=> [3, 2, 1]\n\n",
    },
    {
      name: "def/2",
      type: "macro",
      specs: [],
      documentation:
        'Defines a public function with the given name and body.\n\n## Examples\n\n    defmodule Foo do\n      def bar, do: :baz\n    end\n\n    Foo.bar()\n    #=> :baz\n\nA function that expects arguments can be defined as follows:\n\n    defmodule Foo do\n      def sum(a, b) do\n        a + b\n      end\n    end\n\nIn the example above, a `sum/2` function is defined; this function receives\ntwo arguments and returns their sum.\n\n## Default arguments\n\n`\\\\` is used to specify a default value for a parameter of a function. For\nexample:\n\n    defmodule MyMath do\n      def multiply_by(number, factor \\\\ 2) do\n        number * factor\n      end\n    end\n\n    MyMath.multiply_by(4, 3)\n    #=> 12\n\n    MyMath.multiply_by(4)\n    #=> 8\n\nThe compiler translates this into multiple functions with different arities,\nhere `MyMath.multiply_by/1` and `MyMath.multiply_by/2`, that represent cases when\narguments for parameters with default values are passed or not passed.\n\nWhen defining a function with default arguments as well as multiple\nexplicitly declared clauses, you must write a function head that declares the\ndefaults. For example:\n\n    defmodule MyString do\n      def join(string1, string2 \\\\ nil, separator \\\\ " ")\n\n      def join(string1, nil, _separator) do\n        string1\n      end\n\n      def join(string1, string2, separator) do\n        string1 <> separator <> string2\n      end\n    end\n\nNote that `\\\\` can\'t be used with anonymous functions because they\ncan only have a sole arity.\n\n### Keyword lists with default arguments\n\nFunctions containing many arguments can benefit from using `Keyword`\nlists to group and pass attributes as a single value.\n\n    defmodule MyConfiguration do\n      @default_opts [storage: "local"]\n\n      def configure(resource, opts \\\\ []) do\n        opts = Keyword.merge(@default_opts, opts)\n        storage = opts[:storage]\n        # ...\n      end\n    end\n\nThe difference between using `Map` and `Keyword` to store many\narguments is `Keyword`\'s keys:\n\n  * must be atoms\n  * can be given more than once\n  * ordered, as specified by the developer\n\n## Function names\n\nFunction and variable names in Elixir must start with an underscore or a\nUnicode letter that is not in uppercase or titlecase. They may continue\nusing a sequence of Unicode letters, numbers, and underscores. They may\nend in `?` or `!`. Elixir\'s [Naming Conventions](naming-conventions.md)\nsuggest for function and variable names to be written in the `snake_case`\nformat.\n\n## `rescue`/`catch`/`after`/`else`\n\nFunction bodies support `rescue`, `catch`, `after`, and `else` as `try/1`\ndoes (known as "implicit try"). For example, the following two functions are equivalent:\n\n    def convert(number) do\n      try do\n        String.to_integer(number)\n      rescue\n        e in ArgumentError -> {:error, e.message}\n      end\n    end\n\n    def convert(number) do\n      String.to_integer(number)\n    rescue\n      e in ArgumentError -> {:error, e.message}\n    end\n\n',
    },
    {
      name: "dbg/2",
      type: "macro",
      specs: [],
      documentation:
        'Debugs the given `code`.\n\n`dbg/2` can be used to debug the given `code` through a configurable debug function.\nIt returns the result of the given code.\n\n## Examples\n\nLet\'s take this call to `dbg/2`:\n\n    dbg(Atom.to_string(:debugging))\n    #=> "debugging"\n\nIt returns the string `"debugging"`, which is the result of the `Atom.to_string/1` call.\nAdditionally, the call above prints:\n\n    [my_file.ex:10: MyMod.my_fun/0]\n    Atom.to_string(:debugging) #=> "debugging"\n\nThe default debugging function prints additional debugging info when dealing with\npipelines. It prints the values at every "step" of the pipeline.\n\n    "Elixir is cool!"\n    |> String.trim_trailing("!")\n    |> String.split()\n    |> List.first()\n    |> dbg()\n    #=> "Elixir"\n\nThe code above prints:\n\n    [my_file.ex:10: MyMod.my_fun/0]\n    "Elixir is cool!" #=> "Elixir is cool!"\n    |> String.trim_trailing("!") #=> "Elixir is cool"\n    |> String.split() #=> ["Elixir", "is", "cool"]\n    |> List.first() #=> "Elixir"\n\nWith no arguments, `dbg()` debugs information about the current binding. See `binding/1`.\n\n## `dbg` inside IEx\n\nYou can enable IEx to replace `dbg` with its `IEx.pry/0` backend by calling:\n\n    $ iex --dbg pry\n\nIn such cases, `dbg` will start a `pry` session where you can interact with\nthe imports, aliases, and variables of the current environment at the location\nof the `dbg` call.\n\nIf you call `dbg` at the end of a pipeline (using `|>`) within IEx, you are able\nto go through each step of the pipeline one by one by entering "next" (or "n").\n\nNote `dbg` only supports stepping for pipelines (in other words, it can only\nstep through the code it sees). For general stepping, you can set breakpoints\nusing `IEx.break!/4`.\n\nFor more information, [see IEx documentation](https://hexdocs.pm/iex/IEx.html#module-dbg-and-breakpoints).\n\n## Configuring the debug function\n\nOne of the benefits of `dbg/2` is that its debugging logic is configurable,\nallowing tools to extend `dbg` with enhanced behaviour. This is done, for\nexample, by `IEx` which extends `dbg` with an interactive shell where you\ncan directly inspect and access values.\n\nThe debug function can be configured at compile time through the `:dbg_callback`\nkey of the `:elixir` application. The debug function must be a\n`{module, function, args}` tuple. The `function` function in `module` will be\ninvoked with three arguments *prepended* to `args`:\n\n  1. The AST of `code`\n  2. The AST of `options`\n  3. The `Macro.Env` environment of where `dbg/2` is invoked\n\nThe debug function is invoked at compile time and it must also return an AST.\nThe AST is expected to ultimately return the result of evaluating the debugged\nexpression.\n\nHere\'s a simple example:\n\n    defmodule MyMod do\n      def debug_fun(code, options, caller, device) do\n        quote do\n          result = unquote(code)\n          IO.inspect(unquote(device), result, label: unquote(Macro.to_string(code)))\n        end\n      end\n    end\n\nTo configure the debug function:\n\n    # In config/config.exs\n    config :elixir, :dbg_callback, {MyMod, :debug_fun, [:stdio]}\n\n### Default debug function\n\nBy default, the debug function we use is `Macro.dbg/3`. It just prints\ninformation about the code to standard output and returns the value\nreturned by evaluating `code`. `options` are used to control how terms\nare inspected. They are the same options accepted by `inspect/2`.\n',
    },
    {
      name: "binding/1",
      type: "macro",
      specs: [],
      documentation:
        "Returns the binding for the given context as a keyword list.\n\nIn the returned result, keys are variable names and values are the\ncorresponding variable values.\n\nIf the given `context` is `nil` (by default it is), the binding for the\ncurrent context is returned.\n\n## Examples\n\n    iex> x = 1\n    iex> binding()\n    [x: 1]\n    iex> x = 2\n    iex> binding()\n    [x: 2]\n\n    iex> binding(:foo)\n    []\n    iex> var!(x, :foo) = 1\n    1\n    iex> binding(:foo)\n    [x: 1]\n\n",
    },
    {
      name: "and/2",
      type: "macro",
      specs: [],
      documentation:
        'Strictly boolean "and" operator.\n\nIf `left` is `false`, returns `false`, otherwise returns `right`.\n\nRequires only the `left` operand to be a boolean since it short-circuits. If\nthe `left` operand is not a boolean, a `BadBooleanError` exception is raised.\n\nAllowed in guard tests.\n\n## Examples\n\n    iex> true and false\n    false\n\n    iex> true and "yay!"\n    "yay!"\n\n    iex> "yay!" and true\n    ** (BadBooleanError) expected a boolean on left-side of "and", got: "yay!"\n\n',
    },
    {
      name: "alias!/1",
      type: "macro",
      specs: [],
      documentation:
        "When used inside quoting, marks that the given alias should not\nbe hygienized. This means the alias will be expanded when\nthe macro is expanded.\n\nCheck `quote/2` for more information.\n",
    },
    {
      name: "@/1",
      type: "macro",
      specs: [],
      documentation:
        'Module attribute unary operator.\n\nReads and writes attributes in the current module.\n\nThe canonical example for attributes is annotating that a module\nimplements an OTP behaviour, such as `GenServer`:\n\n    defmodule MyServer do\n      @behaviour GenServer\n      # ... callbacks ...\n    end\n\nBy default Elixir supports all the module attributes supported by Erlang, but\ncustom attributes can be used as well:\n\n    defmodule MyServer do\n      @my_data 13\n      IO.inspect(@my_data)\n      #=> 13\n    end\n\nUnlike Erlang, such attributes are not stored in the module by default since\nit is common in Elixir to use custom attributes to store temporary data that\nwill be available at compile-time. Custom attributes may be configured to\nbehave closer to Erlang by using `Module.register_attribute/3`.\n\n> #### Prefixing module attributes {: .tip}\n>\n> Libraries and frameworks should consider prefixing any\n> module attributes that are private by underscore, such as `@_my_data`,\n> so code completion tools do not show them on suggestions and prompts.\n\nFinally, note that attributes can also be read inside functions:\n\n    defmodule MyServer do\n      @my_data 11\n      def first_data, do: @my_data\n      @my_data 13\n      def second_data, do: @my_data\n    end\n\n    MyServer.first_data()\n    #=> 11\n\n    MyServer.second_data()\n    #=> 13\n\nIt is important to note that reading an attribute takes a snapshot of\nits current value. In other words, the value is read at compilation\ntime and not at runtime. Check the `Module` module for other functions\nto manipulate module attributes.\n\n## Attention! Multiple references of the same attribute\n\nAs mentioned above, every time you read a module attribute, a snapshot\nof its current value is taken. Therefore, if you are storing large\nvalues inside module attributes (for example, embedding external files\nin module attributes), you should avoid referencing the same attribute\nmultiple times. For example, don\'t do this:\n\n    @files %{\n      example1: File.read!("lib/example1.data"),\n      example2: File.read!("lib/example2.data")\n    }\n\n    def example1, do: @files[:example1]\n    def example2, do: @files[:example2]\n\nIn the above, each reference to `@files` may end-up with a complete\nand individual copy of the whole `@files` module attribute. Instead,\nreference the module attribute once in a private function:\n\n    @files %{\n      example1: File.read!("lib/example1.data"),\n      example2: File.read!("lib/example2.data")\n    }\n\n    defp files(), do: @files\n    def example1, do: files()[:example1]\n    def example2, do: files()[:example2]\n\n',
    },
    {
      name: "<>/2",
      type: "macro",
      specs: [],
      documentation:
        'Binary concatenation operator. Concatenates two binaries.\n\nRaises an `ArgumentError` if one of the sides aren\'t binaries.\n\n## Examples\n\n    iex> "foo" <> "bar"\n    "foobar"\n\nThe `<>/2` operator can also be used in pattern matching (and guard clauses) as\nlong as the left argument is a literal binary:\n\n    iex> "foo" <> x = "foobar"\n    iex> x\n    "bar"\n\n`x <> "bar" = "foobar"` would result in an `ArgumentError` exception.\n\n',
    },
    {
      name: "..///3",
      type: "macro",
      specs: [],
      documentation:
        "Creates a range from `first` to `last` with `step`.\n\nSee the `Range` module for more information.\n\n## Examples\n\n    iex> 0 in 1..3//1\n    false\n    iex> 2 in 1..3//1\n    true\n    iex> 2 in 1..3//2\n    false\n\n    iex> Enum.to_list(1..3//1)\n    [1, 2, 3]\n    iex> Enum.to_list(1..3//2)\n    [1, 3]\n    iex> Enum.to_list(3..1//-1)\n    [3, 2, 1]\n    iex> Enum.to_list(1..0//1)\n    []\n\n",
    },
    {
      name: "../2",
      type: "macro",
      specs: [],
      documentation:
        "Creates a range from `first` to `last`.\n\nIf first is less than last, the range will be increasing from\nfirst to last. If first is equal to last, the range will contain\none element, which is the number itself.\n\nIf first is more than last, the range will be decreasing from first\nto last, albeit this behavior is deprecated. Instead prefer to\nexplicitly list the step with `first..last//-1`.\n\nSee the `Range` module for more information.\n\n## Examples\n\n    iex> 0 in 1..3\n    false\n    iex> 2 in 1..3\n    true\n\n    iex> Enum.to_list(1..3)\n    [1, 2, 3]\n\n",
    },
    {
      name: "../0",
      type: "macro",
      specs: [],
      documentation:
        'Creates the full-slice range `0..-1//1`.\n\nThis macro returns a range with the following properties:\n\n  * When enumerated, it is empty\n\n  * When used as a `slice`, it returns the sliced element as is\n\nSee `..///3` and the `Range` module for more information.\n\n## Examples\n\n    iex> Enum.to_list(..)\n    []\n\n    iex> String.slice("Hello world!", ..)\n    "Hello world!"\n\n',
    },
    {
      name: "&&/2",
      type: "macro",
      specs: [],
      documentation:
        'Boolean "and" operator.\n\nProvides a short-circuit operator that evaluates and returns\nthe second expression only if the first one evaluates to a truthy value\n(neither `false` nor `nil`). Returns the first expression\notherwise.\n\nNot allowed in guard clauses.\n\n## Examples\n\n    iex> Enum.empty?([]) && Enum.empty?([])\n    true\n\n    iex> List.first([]) && true\n    nil\n\n    iex> Enum.empty?([]) && List.first([1])\n    1\n\n    iex> false && throw(:bad)\n    false\n\nNote that, unlike `and/2`, this operator accepts any expression\nas the first argument, not only booleans.\n',
    },
    {
      name: "!/1",
      type: "macro",
      specs: [],
      documentation:
        'Boolean "not" operator.\n\nReceives any value (not just booleans) and returns `true` if `value`\nis `false` or `nil`; returns `false` otherwise.\n\nNot allowed in guard clauses.\n\n## Examples\n\n    iex> !Enum.empty?([])\n    false\n\n    iex> !List.first([])\n    true\n\n',
    },
  ],
  types: [],
};
