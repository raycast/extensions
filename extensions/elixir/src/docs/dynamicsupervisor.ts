import type { ModuleDoc } from "../types";

export const DynamicSupervisor: ModuleDoc = {
  functions: [
    {
      name: "which_children/1",
      type: "function",
      specs: [
        "@spec which_children(Supervisor.supervisor()) :: [\n        {:undefined, pid() | :restarting, :worker | :supervisor,\n         [module()] | :dynamic}\n      ]",
      ],
      documentation:
        "Returns a list with information about all children.\n\nNote that calling this function when supervising a large number\nof children under low memory conditions can cause an out of memory\nexception.\n\nThis function returns a list of tuples containing:\n\n  * `id` - it is always `:undefined` for dynamic supervisors\n\n  * `child` - the PID of the corresponding child process or the\n    atom `:restarting` if the process is about to be restarted\n\n  * `type` - `:worker` or `:supervisor` as defined in the child\n    specification\n\n  * `modules` - as defined in the child specification\n\n",
    },
    {
      name: "terminate_child/2",
      type: "function",
      specs: [
        "@spec terminate_child(Supervisor.supervisor(), pid()) ::\n        :ok | {:error, :not_found}",
      ],
      documentation:
        "Terminates the given child identified by `pid`.\n\nIf successful, this function returns `:ok`. If there is no process with\nthe given PID, this function returns `{:error, :not_found}`.\n",
    },
    {
      name: "stop/3",
      type: "function",
      specs: [
        "@spec stop(Supervisor.supervisor(), reason :: term(), timeout()) :: :ok",
      ],
      documentation:
        "Synchronously stops the given supervisor with the given `reason`.\n\nIt returns `:ok` if the supervisor terminates with the given\nreason. If it terminates with another reason, the call exits.\n\nThis function keeps OTP semantics regarding error reporting.\nIf the reason is any other than `:normal`, `:shutdown` or\n`{:shutdown, _}`, an error report is logged.\n",
    },
    {
      name: "start_link/3",
      type: "function",
      specs: [
        "@spec start_link(module(), term(), [option()]) :: Supervisor.on_start()",
      ],
      documentation:
        'Starts a module-based supervisor process with the given `module` and `init_arg`.\n\nTo start the supervisor, the `c:init/1` callback will be invoked in the given\n`module`, with `init_arg` as its argument. The `c:init/1` callback must return a\nsupervisor specification which can be created with the help of the `init/1`\nfunction.\n\nIf the `c:init/1` callback returns `:ignore`, this function returns\n`:ignore` as well and the supervisor terminates with reason `:normal`.\nIf it fails or returns an incorrect value, this function returns\n`{:error, term}` where `term` is a term with information about the\nerror, and the supervisor terminates with reason `term`.\n\nThe `:name` option can also be given in order to register a supervisor\nname, the supported values are described in the "Name registration"\nsection in the `GenServer` module docs.\n\nIf the supervisor is successfully spawned, this function returns\n`{:ok, pid}`, where `pid` is the PID of the supervisor. If the supervisor\nis given a name and a process with the specified name already exists,\nthe function returns `{:error, {:already_started, pid}}`, where `pid`\nis the PID of that process.\n\nNote that a supervisor started with this function is linked to the parent\nprocess and exits not only on crashes but also if the parent process exits\nwith `:normal` reason.\n',
    },
    {
      name: "start_link/1",
      type: "function",
      specs: [
        "@spec start_link([option() | init_option()]) :: Supervisor.on_start()",
      ],
      documentation:
        'Starts a supervisor with the given options.\n\nThis function is typically not invoked directly, instead it is invoked\nwhen using a `DynamicSupervisor` as a child of another supervisor:\n\n    children = [\n      {DynamicSupervisor, name: MySupervisor}\n    ]\n\nIf the supervisor is successfully spawned, this function returns\n`{:ok, pid}`, where `pid` is the PID of the supervisor. If the supervisor\nis given a name and a process with the specified name already exists,\nthe function returns `{:error, {:already_started, pid}}`, where `pid`\nis the PID of that process.\n\nNote that a supervisor started with this function is linked to the parent\nprocess and exits not only on crashes but also if the parent process exits\nwith `:normal` reason.\n\n## Options\n\n  * `:name` - registers the supervisor under the given name.\n    The supported values are described under the "Name registration"\n    section in the `GenServer` module docs.\n\n  * `:strategy` - the restart strategy option. The only supported\n    value is `:one_for_one` which means that no other child is\n    terminated if a child process terminates. You can learn more\n    about strategies in the `Supervisor` module docs.\n\n  * `:max_restarts` - the maximum number of restarts allowed in\n    a time frame. Defaults to `3`.\n\n  * `:max_seconds` - the time frame in which `:max_restarts` applies.\n    Defaults to `5`.\n\n  * `:max_children` - the maximum amount of children to be running\n    under this supervisor at the same time. When `:max_children` is\n    exceeded, `start_child/2` returns `{:error, :max_children}`. Defaults\n    to `:infinity`.\n\n  * `:extra_arguments` - arguments that are prepended to the arguments\n    specified in the child spec given to `start_child/2`. Defaults to\n    an empty list.\n\n',
    },
    {
      name: "start_child/2",
      type: "function",
      specs: [
        "@spec start_child(\n        Supervisor.supervisor(),\n        Supervisor.child_spec()\n        | {module(), term()}\n        | module()\n        | (old_erlang_child_spec :: :supervisor.child_spec())\n      ) :: on_start_child()",
      ],
      documentation:
        'Dynamically adds a child specification to `supervisor` and starts that child.\n\n`child_spec` should be a valid child specification as detailed in the\n"Child specification" section of the documentation for `Supervisor`. The child\nprocess will be started as defined in the child specification. Note that while\nthe `:id` field is still required in the spec, the value is ignored and\ntherefore does not need to be unique.\n\nIf the child process start function returns `{:ok, child}` or `{:ok, child,\ninfo}`, then child specification and PID are added to the supervisor and\nthis function returns the same value.\n\nIf the child process start function returns `:ignore`, then no child is added\nto the supervision tree and this function returns `:ignore` too.\n\nIf the child process start function returns an error tuple or an erroneous\nvalue, or if it fails, the child specification is discarded and this function\nreturns `{:error, error}` where `error` is the error or erroneous value\nreturned from child process start function, or failure reason if it fails.\n\nIf the supervisor already has N children in a way that N exceeds the amount\nof `:max_children` set on the supervisor initialization (see `init/1`), then\nthis function returns `{:error, :max_children}`.\n',
    },
    {
      name: "init/1",
      type: "function",
      specs: ["@spec init([init_option()]) :: {:ok, sup_flags()}"],
      documentation:
        'Receives a set of `options` that initializes a dynamic supervisor.\n\nThis is typically invoked at the end of the `c:init/1` callback of\nmodule-based supervisors. See the "Module-based supervisors" section\nin the module documentation for more information.\n\nIt accepts the same `options` as `start_link/1` (except for `:name`)\nand it returns a tuple containing the supervisor options.\n\n## Examples\n\n    def init(_arg) do\n      DynamicSupervisor.init(max_children: 1000)\n    end\n\n',
    },
    {
      name: "count_children/1",
      type: "function",
      specs: [
        "@spec count_children(Supervisor.supervisor()) :: %{\n        specs: non_neg_integer(),\n        active: non_neg_integer(),\n        supervisors: non_neg_integer(),\n        workers: non_neg_integer()\n      }",
      ],
      documentation:
        "Returns a map containing count values for the supervisor.\n\nThe map contains the following keys:\n\n  * `:specs` - the number of children processes\n\n  * `:active` - the count of all actively running child processes managed by\n    this supervisor\n\n  * `:supervisors` - the count of all supervisors whether or not the child\n    process is still alive\n\n  * `:workers` - the count of all workers, whether or not the child process\n    is still alive\n\n",
    },
    {
      name: "child_spec/1",
      type: "function",
      specs: [],
      documentation:
        "Returns a specification to start a dynamic supervisor under a supervisor.\n\nIt accepts the same options as `start_link/1`.\n\nSee `Supervisor` for more information about child specifications.\n",
    },
  ],
  name: "DynamicSupervisor",
  callbacks: [
    {
      name: "init/1",
      type: "callback",
      specs: ["@callback init([init_option()]) :: {:ok, sup_flags()}"],
      documentation:
        "Callback invoked to start the supervisor and during hot code upgrades.\n\nDevelopers typically invoke `DynamicSupervisor.init/1` at the end of\ntheir init callback to return the proper supervision flags.\n",
    },
  ],
  macros: [],
  types: [
    {
      name: "on_start_child/0",
      type: "type",
      specs: [
        "@type on_start_child() ::\n        {:ok, pid()}\n        | {:ok, pid(), info :: term()}\n        | :ignore\n        | {:error, {:already_started, pid()} | :max_children | term()}",
      ],
      documentation: "Return values of `start_child` functions",
    },
    {
      name: "strategy/0",
      type: "type",
      specs: ["@type strategy() :: :one_for_one"],
      documentation: "Supported strategies",
    },
    {
      name: "init_option/0",
      type: "type",
      specs: [
        "@type init_option() ::\n        {:strategy, strategy()}\n        | {:max_restarts, non_neg_integer()}\n        | {:max_seconds, pos_integer()}\n        | {:max_children, non_neg_integer() | :infinity}\n        | {:extra_arguments, [term()]}",
      ],
      documentation: "Options given to `start_link` and `init/1` functions",
    },
    {
      name: "option/0",
      type: "type",
      specs: ["@type option() :: GenServer.option()"],
      documentation: "Options given to `start_link` functions",
    },
    {
      name: "sup_flags/0",
      type: "type",
      specs: [
        "@type sup_flags() :: %{\n        strategy: strategy(),\n        intensity: non_neg_integer(),\n        period: pos_integer(),\n        max_children: non_neg_integer() | :infinity,\n        extra_arguments: [term()]\n      }",
      ],
      documentation: "The supervisor flags returned on init",
    },
  ],
};
