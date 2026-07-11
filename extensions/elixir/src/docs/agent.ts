import type { ModuleDoc } from "../types";

export const Agent: ModuleDoc = {
  functions: [
    {
      name: "update/5",
      type: "function",
      specs: [
        "@spec update(agent(), module(), atom(), [term()], timeout()) :: :ok",
      ],
      documentation:
        "Updates the agent state via the given function.\n\nSame as `update/3` but a module, function, and arguments are expected\ninstead of an anonymous function. The state is added as first\nargument to the given list of arguments.\n\n## Examples\n\n    iex> {:ok, pid} = Agent.start_link(fn -> 42 end)\n    iex> Agent.update(pid, Kernel, :+, [12])\n    :ok\n    iex> Agent.get(pid, fn state -> state end)\n    54\n\n",
    },
    {
      name: "update/3",
      type: "function",
      specs: ["@spec update(agent(), (state() -> state()), timeout()) :: :ok"],
      documentation:
        "Updates the agent state via the given anonymous function.\n\nThe function `fun` is sent to the `agent` which invokes the function\npassing the agent state. The return value of `fun` becomes the new\nstate of the agent.\n\nThis function always returns `:ok`.\n\n`timeout` is an integer greater than zero which specifies how many\nmilliseconds are allowed before the agent executes the function and returns\nthe result value, or the atom `:infinity` to wait indefinitely. If no result\nis received within the specified time, the function call fails and the caller\nexits.\n\n## Examples\n\n    iex> {:ok, pid} = Agent.start_link(fn -> 42 end)\n    iex> Agent.update(pid, fn state -> state + 1 end)\n    :ok\n    iex> Agent.get(pid, fn state -> state end)\n    43\n\n",
    },
    {
      name: "stop/3",
      type: "function",
      specs: ["@spec stop(agent(), reason :: term(), timeout()) :: :ok"],
      documentation:
        "Synchronously stops the agent with the given `reason`.\n\nIt returns `:ok` if the agent terminates with the given\nreason. If the agent terminates with another reason, the call will\nexit.\n\nThis function keeps OTP semantics regarding error reporting.\nIf the reason is any other than `:normal`, `:shutdown` or\n`{:shutdown, _}`, an error report will be logged.\n\n## Examples\n\n    iex> {:ok, pid} = Agent.start_link(fn -> 42 end)\n    iex> Agent.stop(pid)\n    :ok\n\n",
    },
    {
      name: "start_link/4",
      type: "function",
      specs: [
        "@spec start_link(module(), atom(), [any()], GenServer.options()) :: on_start()",
      ],
      documentation:
        "Starts an agent linked to the current process.\n\nSame as `start_link/2` but a module, function, and arguments are expected\ninstead of an anonymous function; `fun` in `module` will be called with the\ngiven arguments `args` to initialize the state.\n",
    },
    {
      name: "start_link/2",
      type: "function",
      specs: [
        "@spec start_link((-> term()), GenServer.options()) :: on_start()",
      ],
      documentation:
        'Starts an agent linked to the current process with the given function.\n\nThis is often used to start the agent as part of a supervision tree.\n\nOnce the agent is spawned, the given function `fun` is invoked in the server\nprocess, and should return the initial agent state. Note that `start_link/2`\ndoes not return until the given function has returned.\n\n## Options\n\nThe `:name` option is used for registration as described in the module\ndocumentation.\n\nIf the `:timeout` option is present, the agent is allowed to spend at most\nthe given number of milliseconds on initialization or it will be terminated\nand the start function will return `{:error, :timeout}`.\n\nIf the `:debug` option is present, the corresponding function in the\n[`:sys` module](`:sys`) will be invoked.\n\nIf the `:spawn_opt` option is present, its value will be passed as options\nto the underlying process as in `Process.spawn/4`.\n\n## Return values\n\nIf the server is successfully created and initialized, the function returns\n`{:ok, pid}`, where `pid` is the PID of the server. If an agent with the\nspecified name already exists, the function returns\n`{:error, {:already_started, pid}}` with the PID of that process.\n\nIf the given function callback fails, the function returns `{:error, reason}`.\n\n## Examples\n\n    iex> {:ok, pid} = Agent.start_link(fn -> 42 end)\n    iex> Agent.get(pid, fn state -> state end)\n    42\n\n    iex> {:error, {exception, _stacktrace}} = Agent.start(fn -> raise "oops" end)\n    iex> exception\n    %RuntimeError{message: "oops"}\n\n',
    },
    {
      name: "start/4",
      type: "function",
      specs: [
        "@spec start(module(), atom(), [any()], GenServer.options()) :: on_start()",
      ],
      documentation:
        "Starts an agent without links with the given module, function, and arguments.\n\nSee `start_link/4` for more information.\n",
    },
    {
      name: "start/2",
      type: "function",
      specs: ["@spec start((-> term()), GenServer.options()) :: on_start()"],
      documentation:
        "Starts an agent process without links (outside of a supervision tree).\n\nSee `start_link/2` for more information.\n\n## Examples\n\n    iex> {:ok, pid} = Agent.start(fn -> 42 end)\n    iex> Agent.get(pid, fn state -> state end)\n    42\n\n",
    },
    {
      name: "get_and_update/5",
      type: "function",
      specs: [
        "@spec get_and_update(agent(), module(), atom(), [term()], timeout()) :: any()",
      ],
      documentation:
        "Gets and updates the agent state in one operation via the given function.\n\nSame as `get_and_update/3` but a module, function, and arguments are expected\ninstead of an anonymous function. The state is added as first\nargument to the given list of arguments.\n",
    },
    {
      name: "get_and_update/3",
      type: "function",
      specs: [
        "@spec get_and_update(agent(), (state() -> {a, state()}), timeout()) :: a\n      when a: var",
      ],
      documentation:
        'Gets and updates the agent state in one operation via the given anonymous\nfunction.\n\nThe function `fun` is sent to the `agent` which invokes the function\npassing the agent state. The function must return a tuple with two\nelements, the first being the value to return (that is, the "get" value)\nand the second one being the new state of the agent.\n\n`timeout` is an integer greater than zero which specifies how many\nmilliseconds are allowed before the agent executes the function and returns\nthe result value, or the atom `:infinity` to wait indefinitely. If no result\nis received within the specified time, the function call fails and the caller\nexits.\n\n## Examples\n\n    iex> {:ok, pid} = Agent.start_link(fn -> 42 end)\n    iex> Agent.get_and_update(pid, fn state -> {state, state + 1} end)\n    42\n    iex> Agent.get(pid, fn state -> state end)\n    43\n\n',
    },
    {
      name: "get/5",
      type: "function",
      specs: [
        "@spec get(agent(), module(), atom(), [term()], timeout()) :: any()",
      ],
      documentation:
        "Gets an agent value via the given function.\n\nSame as `get/3` but a module, function, and arguments are expected\ninstead of an anonymous function. The state is added as first\nargument to the given list of arguments.\n",
    },
    {
      name: "get/3",
      type: "function",
      specs: ["@spec get(agent(), (state() -> a), timeout()) :: a when a: var"],
      documentation:
        "Gets an agent value via the given anonymous function.\n\nThe function `fun` is sent to the `agent` which invokes the function\npassing the agent state. The result of the function invocation is\nreturned from this function.\n\n`timeout` is an integer greater than zero which specifies how many\nmilliseconds are allowed before the agent executes the function and returns\nthe result value, or the atom `:infinity` to wait indefinitely. If no result\nis received within the specified time, the function call fails and the caller\nexits.\n\n## Examples\n\n    iex> {:ok, pid} = Agent.start_link(fn -> 42 end)\n    iex> Agent.get(pid, fn state -> state end)\n    42\n\n",
    },
    {
      name: "child_spec/1",
      type: "function",
      specs: [],
      documentation:
        'Returns a specification to start an agent under a supervisor.\n\nSee the "Child specification" section in the `Supervisor` module for more detailed information.\n',
    },
    {
      name: "cast/4",
      type: "function",
      specs: ["@spec cast(agent(), module(), atom(), [term()]) :: :ok"],
      documentation:
        "Performs a cast (*fire and forget*) operation on the agent state.\n\nSame as `cast/2` but a module, function, and arguments are expected\ninstead of an anonymous function. The state is added as first\nargument to the given list of arguments.\n\n## Examples\n\n    iex> {:ok, pid} = Agent.start_link(fn -> 42 end)\n    iex> Agent.cast(pid, Kernel, :+, [12])\n    :ok\n    iex> Agent.get(pid, fn state -> state end)\n    54\n\n",
    },
    {
      name: "cast/2",
      type: "function",
      specs: ["@spec cast(agent(), (state() -> state())) :: :ok"],
      documentation:
        "Performs a cast (*fire and forget*) operation on the agent state.\n\nThe function `fun` is sent to the `agent` which invokes the function\npassing the agent state. The return value of `fun` becomes the new\nstate of the agent.\n\nNote that `cast` returns `:ok` immediately, regardless of whether `agent` (or\nthe node it should live on) exists.\n\n## Examples\n\n    iex> {:ok, pid} = Agent.start_link(fn -> 42 end)\n    iex> Agent.cast(pid, fn state -> state + 1 end)\n    :ok\n    iex> Agent.get(pid, fn state -> state end)\n    43\n\n",
    },
  ],
  name: "Agent",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "state/0",
      type: "type",
      specs: ["@type state() :: term()"],
      documentation: "The agent state",
    },
    {
      name: "agent/0",
      type: "type",
      specs: ["@type agent() :: pid() | {atom(), node()} | name()"],
      documentation: "The agent reference",
    },
    {
      name: "name/0",
      type: "type",
      specs: [
        "@type name() :: atom() | {:global, term()} | {:via, module(), term()}",
      ],
      documentation: "The agent name",
    },
    {
      name: "on_start/0",
      type: "type",
      specs: [
        "@type on_start() :: {:ok, pid()} | {:error, {:already_started, pid()} | term()}",
      ],
      documentation: "Return values of `start*` functions",
    },
  ],
};
