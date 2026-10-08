import type { ModuleDoc } from "../types";

export const Node: ModuleDoc = {
  functions: [
    {
      name: "stop/0",
      type: "function",
      specs: ["@spec stop() :: :ok | {:error, :not_allowed | :not_found}"],
      documentation:
        "Turns a distributed node into a non-distributed node.\n\nFor other nodes in the network, this is the same as the node going down.\nOnly possible when the node was started with `Node.start/3`, otherwise\nreturns `{:error, :not_allowed}`. Returns `{:error, :not_found}` if the\nlocal node is not alive.\n",
    },
    {
      name: "start/3",
      type: "function",
      specs: [
        "@spec start(node(), :longnames | :shortnames, non_neg_integer()) ::\n        {:ok, pid()} | {:error, term()}",
      ],
      documentation:
        "Turns a non-distributed node into a distributed node.\n\nThis functionality starts the `:net_kernel` and other related\nprocesses.\n\nThis function is rarely invoked in practice. Instead, nodes are\nnamed and started via the command line by using the `--sname` and\n`--name` flags. If you need to use this function to dynamically\nname a node, please make sure the `epmd` operating system process\nis running by calling `epmd -daemon`.\n\nInvoking this function when the distribution has already been started,\neither via the command line interface or dynamically, will return an\nerror.\n\n## Examples\n\n    {:ok, pid} = Node.start(:example, :shortnames, 15000)\n\n",
    },
    {
      name: "spawn_monitor/4",
      type: "function",
      specs: [
        "@spec spawn_monitor(t(), module(), atom(), [any()]) :: {pid(), reference()}",
      ],
      documentation:
        "Spawns the given module and function passing the given args on a node,\nmonitors it and returns its PID and monitoring reference.\n\nInlined by the compiler.\n",
    },
    {
      name: "spawn_monitor/2",
      type: "function",
      specs: ["@spec spawn_monitor(t(), (-> any())) :: {pid(), reference()}"],
      documentation:
        "Spawns the given function on a node, monitors it and returns its PID\nand monitoring reference.\n\nInlined by the compiler.\n",
    },
    {
      name: "spawn_link/4",
      type: "function",
      specs: ["@spec spawn_link(t(), module(), atom(), [any()]) :: pid()"],
      documentation:
        "Returns the PID of a new linked process started by the application of\n`module.function(args)` on `node`.\n\nA link is created between the calling process and the new process, atomically.\nIf `node` does not exist, a useless PID is returned (and due to the link, an exit\nsignal with exit reason `:noconnection` will be received).\n\nInlined by the compiler.\n",
    },
    {
      name: "spawn_link/2",
      type: "function",
      specs: ["@spec spawn_link(t(), (-> any())) :: pid()"],
      documentation:
        "Returns the PID of a new linked process started by the application of `fun` on `node`.\n\nA link is created between the calling process and the new process, atomically.\nIf `node` does not exist, a useless PID is returned (and due to the link, an exit\nsignal with exit reason `:noconnection` will be received).\n\nInlined by the compiler.\n",
    },
    {
      name: "spawn/5",
      type: "function",
      specs: [
        "@spec spawn(t(), module(), atom(), [any()], Process.spawn_opts()) ::\n        pid() | {pid(), reference()}",
      ],
      documentation:
        "Returns the PID of a new process started by the application of\n`module.function(args)` on `node`.\n\nIf `node` does not exist, a useless PID is returned.\n\nFor the list of available options, see `:erlang.spawn_opt/5`.\n\nInlined by the compiler.\n",
    },
    {
      name: "spawn/4",
      type: "function",
      specs: ["@spec spawn(t(), module(), atom(), [any()]) :: pid()"],
      documentation:
        "Returns the PID of a new process started by the application of\n`module.function(args)` on `node`.\n\nIf `node` does not exist, a useless PID is returned.\n\nFor the list of available options, see `:erlang.spawn/4`.\n\nInlined by the compiler.\n",
    },
    {
      name: "spawn/3",
      type: "function",
      specs: [
        "@spec spawn(t(), (-> any()), Process.spawn_opts()) ::\n        pid() | {pid(), reference()}",
      ],
      documentation:
        "Returns the PID of a new process started by the application of `fun`\non `node`.\n\nIf `node` does not exist, a useless PID is returned.\n\nFor the list of available options, see `:erlang.spawn_opt/3`.\n\nInlined by the compiler.\n",
    },
    {
      name: "spawn/2",
      type: "function",
      specs: ["@spec spawn(t(), (-> any())) :: pid()"],
      documentation:
        "Returns the PID of a new process started by the application of `fun`\non `node`. If `node` does not exist, a useless PID is returned.\n\nFor the list of available options, see `:erlang.spawn/2`.\n\nInlined by the compiler.\n",
    },
    {
      name: "set_cookie/2",
      type: "function",
      specs: ["@spec set_cookie(t(), atom()) :: true"],
      documentation:
        "Sets the magic cookie of `node` to the atom `cookie`.\n\nThe default node is `Node.self/0`, the local node. If `node` is the local node,\nthe function also sets the cookie of all other unknown nodes to `cookie`.\n\nThis function will raise `FunctionClauseError` if the given `node` is not alive.\n",
    },
    {
      name: "self/0",
      type: "function",
      specs: ["@spec self() :: t()"],
      documentation:
        "Returns the current node.\n\nIt returns the same as the built-in `node()`.\n",
    },
    {
      name: "ping/1",
      type: "function",
      specs: ["@spec ping(t()) :: :pong | :pang"],
      documentation:
        "Tries to set up a connection to node.\n\nReturns `:pang` if it fails, or `:pong` if it is successful.\n\n## Examples\n\n    iex> Node.ping(:unknown_node)\n    :pang\n\n",
    },
    {
      name: "monitor/3",
      type: "function",
      specs: [
        "@spec monitor(t(), boolean(), [:allow_passive_connect]) :: true",
      ],
      documentation:
        "Behaves as `monitor/2` except that it allows an extra\noption to be given, namely `:allow_passive_connect`.\n\nFor more information, see `:erlang.monitor_node/3`.\n\nFor monitoring status changes of all nodes, see `:net_kernel.monitor_nodes/2`.\n",
    },
    {
      name: "monitor/2",
      type: "function",
      specs: ["@spec monitor(t(), boolean()) :: true"],
      documentation:
        "Monitors the status of the node.\n\nIf `flag` is `true`, monitoring is turned on.\nIf `flag` is `false`, monitoring is turned off.\n\nFor more information, see `:erlang.monitor_node/2`.\n\nFor monitoring status changes of all nodes, see `:net_kernel.monitor_nodes/2`.\n",
    },
    {
      name: "list/1",
      type: "function",
      specs: ["@spec list(state() | [state()]) :: [t()]"],
      documentation:
        "Returns a list of nodes according to argument given.\n\nThe result returned when the argument is a list, is the list of nodes\nsatisfying the disjunction(s) of the list elements.\n\nFor more information, see `:erlang.nodes/1`.\n\nInlined by the compiler.\n",
    },
    {
      name: "list/0",
      type: "function",
      specs: ["@spec list() :: [t()]"],
      documentation:
        "Returns a list of all visible nodes in the system, excluding\nthe local node.\n\nSame as `list(:visible)`.\n\nInlined by the compiler.\n",
    },
    {
      name: "get_cookie/0",
      type: "function",
      specs: ["@spec get_cookie() :: atom()"],
      documentation:
        "Returns the magic cookie of the local node.\n\nReturns the cookie if the node is alive, otherwise `:nocookie`.\n",
    },
    {
      name: "disconnect/1",
      type: "function",
      specs: ["@spec disconnect(t()) :: boolean() | :ignored"],
      documentation:
        "Forces the disconnection of a node.\n\nThis will appear to the `node` as if the local node has crashed.\nThis function is mainly used in the Erlang network authentication\nprotocols. Returns `true` if disconnection succeeds, otherwise `false`.\nIf the local node is not alive, the function returns `:ignored`.\n\nFor more information, see `:erlang.disconnect_node/1`.\n",
    },
    {
      name: "connect/1",
      type: "function",
      specs: ["@spec connect(t()) :: boolean() | :ignored"],
      documentation:
        "Establishes a connection to `node`.\n\nReturns `true` if successful, `false` if not, and the atom\n`:ignored` if the local node is not alive.\n\nFor more information, see `:net_kernel.connect_node/1`.\n",
    },
    {
      name: "alive?/0",
      type: "function",
      specs: ["@spec alive?() :: boolean()"],
      documentation:
        "Returns `true` if the local node is alive.\n\nThat is, if the node can be part of a distributed system.\n",
    },
  ],
  name: "Node",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "state/0",
      type: "type",
      specs: [
        "@type state() :: :visible | :hidden | :connected | :this | :known",
      ],
      documentation: null,
    },
    {
      name: "t/0",
      type: "type",
      specs: ["@type t() :: node()"],
      documentation: null,
    },
  ],
};
