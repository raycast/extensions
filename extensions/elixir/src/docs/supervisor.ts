import type { ModuleDoc } from "../types";

export const Supervisor: ModuleDoc = {
  functions: [
    {
      name: "which_children/1",
      type: "function",
      specs: [
        "@spec which_children(supervisor()) :: [\n        {term() | :undefined, child() | :restarting, :worker | :supervisor,\n         [module()] | :dynamic}\n      ]",
      ],
      documentation:
        "Returns a list with information about all children of the given supervisor.\n\nNote that calling this function when supervising a large number of children\nunder low memory conditions can cause an out of memory exception.\n\nThis function returns a list of `{id, child, type, modules}` tuples, where:\n\n  * `id` - as defined in the child specification\n\n  * `child` - the PID of the corresponding child process, `:restarting` if the\n    process is about to be restarted, or `:undefined` if there is no such\n    process\n\n  * `type` - `:worker` or `:supervisor`, as specified by the child specification\n\n  * `modules` - as specified by the child specification\n\n",
    },
    {
      name: "terminate_child/2",
      type: "function",
      specs: [
        "@spec terminate_child(supervisor(), term()) :: :ok | {:error, :not_found}",
      ],
      documentation:
        "Terminates the given child identified by `child_id`.\n\nThe process is terminated, if there's one. The child specification is\nkept unless the child is temporary.\n\nA non-temporary child process may later be restarted by the supervisor.\nThe child process can also be restarted explicitly by calling `restart_child/2`.\nUse `delete_child/2` to remove the child specification.\n\nIf successful, this function returns `:ok`. If there is no child\nspecification for the given child ID, this function returns\n`{:error, :not_found}`.\n",
    },
    {
      name: "stop/3",
      type: "function",
      specs: ["@spec stop(supervisor(), reason :: term(), timeout()) :: :ok"],
      documentation:
        "Synchronously stops the given supervisor with the given `reason`.\n\nIt returns `:ok` if the supervisor terminates with the given\nreason. If it terminates with another reason, the call exits.\n\nThis function keeps OTP semantics regarding error reporting.\nIf the reason is any other than `:normal`, `:shutdown` or\n`{:shutdown, _}`, an error report is logged.\n",
    },
    {
      name: "start_link/3",
      type: "function",
      specs: ["@spec start_link(module(), term(), [option()]) :: on_start()"],
      documentation:
        'Starts a module-based supervisor process with the given `module` and `init_arg`.\n\nTo start the supervisor, the `c:init/1` callback will be invoked in the given\n`module`, with `init_arg` as its argument. The `c:init/1` callback must return a\nsupervisor specification which can be created with the help of the `init/2`\nfunction.\n\nIf the `c:init/1` callback returns `:ignore`, this function returns\n`:ignore` as well and the supervisor terminates with reason `:normal`.\nIf it fails or returns an incorrect value, this function returns\n`{:error, term}` where `term` is a term with information about the\nerror, and the supervisor terminates with reason `term`.\n\nThe `:name` option can also be given in order to register a supervisor\nname, the supported values are described in the "Name registration"\nsection in the `GenServer` module docs.\n',
    },
    {
      name: "start_link/2",
      type: "function",
      specs: [
        "@spec start_link(\n        [\n          child_spec()\n          | module_spec()\n          | (old_erlang_child_spec :: :supervisor.child_spec())\n        ],\n        [option() | init_option()]\n      ) ::\n        {:ok, pid()}\n        | {:error, {:already_started, pid()} | {:shutdown, term()} | term()}",
        "@spec start_link(module(), term()) :: on_start()",
      ],
      documentation:
        'Starts a supervisor with the given children.\n\n`children` is a list of the following forms:\n\n  * a child specification (see `t:child_spec/0`)\n\n  * a module, where the supervisor calls `module.child_spec([])`\n    to retrieve the child specification (see `t:module_spec/0`)\n\n  * a `{module, arg}` tuple, where the supervisor calls `module.child_spec(arg)`\n    to retrieve the child specification (see `t:module_spec/0`)\n\n  * a (old) Erlang-style child specification (see\n    [`:supervisor.child_spec()`](`t::supervisor.child_spec/0`))\n\nA strategy is required to be provided through the `:strategy` option. See\n"Supervisor strategies and options" for examples and other options.\n\nThe options can also be used to register a supervisor name.\nThe supported values are described under the "Name registration"\nsection in the `GenServer` module docs.\n\nIf the supervisor and all child processes are successfully spawned\n(if the start function of each child process returns `{:ok, child}`,\n`{:ok, child, info}`, or `:ignore`), this function returns\n`{:ok, pid}`, where `pid` is the PID of the supervisor. If the supervisor\nis given a name and a process with the specified name already exists,\nthe function returns `{:error, {:already_started, pid}}`, where `pid`\nis the PID of that process.\n\nIf the start function of any of the child processes fails or returns an error\ntuple or an erroneous value, the supervisor first terminates with reason\n`:shutdown` all the child processes that have already been started, and then\nterminates itself and returns `{:error, {:shutdown, reason}}`.\n\nNote that a supervisor started with this function is linked to the parent\nprocess and exits not only on crashes but also if the parent process exits\nwith `:normal` reason.\n',
    },
    {
      name: "start_child/2",
      type: "function",
      specs: [
        "@spec start_child(\n        supervisor(),\n        child_spec()\n        | module_spec()\n        | (old_erlang_child_spec :: :supervisor.child_spec())\n      ) :: on_start_child()",
      ],
      documentation:
        "Adds a child specification to `supervisor` and starts that child.\n\n`child_spec` should be a valid child specification. The child process will\nbe started as defined in the child specification.\n\nIf a child specification with the specified ID already exists, `child_spec` is\ndiscarded and this function returns an error with `:already_started` or\n`:already_present` if the corresponding child process is running or not,\nrespectively.\n\nIf the child process start function returns `{:ok, child}` or `{:ok, child,\ninfo}`, then child specification and PID are added to the supervisor and\nthis function returns the same value.\n\nIf the child process start function returns `:ignore`, the child specification\nis added to the supervisor, the PID is set to `:undefined` and this function\nreturns `{:ok, :undefined}`.\n\nIf the child process start function returns an error tuple or an erroneous\nvalue, or if it fails, the child specification is discarded and this function\nreturns `{:error, error}` where `error` is a term containing information about\nthe error and child specification.\n",
    },
    {
      name: "restart_child/2",
      type: "function",
      specs: [
        "@spec restart_child(supervisor(), term()) ::\n        {:ok, child()} | {:ok, child(), term()} | {:error, error}\n      when error: :not_found | :running | :restarting | term()",
      ],
      documentation:
        "Restarts a child process identified by `child_id`.\n\nThe child specification must exist and the corresponding child process must not\nbe running.\n\nNote that for temporary children, the child specification is automatically deleted\nwhen the child terminates, and thus it is not possible to restart such children.\n\nIf the child process start function returns `{:ok, child}` or `{:ok, child, info}`,\nthe PID is added to the supervisor and this function returns the same value.\n\nIf the child process start function returns `:ignore`, the PID remains set to\n`:undefined` and this function returns `{:ok, :undefined}`.\n\nThis function may return an error with an appropriate error tuple if the\n`child_id` is not found, or if the current process is running or being\nrestarted.\n\nIf the child process start function returns an error tuple or an erroneous value,\nor if it fails, this function returns `{:error, error}`.\n",
    },
    {
      name: "init/2",
      type: "function",
      specs: [
        "@spec init(\n        [\n          child_spec()\n          | module_spec()\n          | (old_erlang_child_spec :: :supervisor.child_spec())\n        ],\n        [init_option()]\n      ) ::\n        {:ok,\n         {sup_flags(),\n          [child_spec() | (old_erlang_child_spec :: :supervisor.child_spec())]}}",
      ],
      documentation:
        'Receives a list of child specifications to initialize and a set of `options`.\n\nThis is typically invoked at the end of the `c:init/1` callback of\nmodule-based supervisors. See the sections "Supervisor strategies and options" and\n"Module-based supervisors" in the module documentation for more information.\n\nThis function returns a tuple containing the supervisor\nflags and child specifications.\n\n## Examples\n\n    def init(_init_arg) do\n      children = [\n        {Counter, 0}\n      ]\n\n      Supervisor.init(children, strategy: :one_for_one)\n    end\n\n## Options\n\n  * `:strategy` - the supervision strategy option. It can be either\n    `:one_for_one`, `:rest_for_one`, or `:one_for_all`\n\n  * `:max_restarts` - the maximum number of restarts allowed in\n    a time frame. Defaults to `3`.\n\n  * `:max_seconds` - the time frame in seconds in which `:max_restarts`\n    applies. Defaults to `5`.\n\n  * `:auto_shutdown` - the automatic shutdown option. It can be either\n    `:never`, `:any_significant`, or `:all_significant`\n\nThe `:strategy` option is required and by default a maximum of 3 restarts\nis allowed within 5 seconds. Check the `Supervisor` module for a detailed\ndescription of the available strategies.\n',
    },
    {
      name: "delete_child/2",
      type: "function",
      specs: [
        "@spec delete_child(supervisor(), term()) :: :ok | {:error, error}\n      when error: :not_found | :running | :restarting",
      ],
      documentation:
        "Deletes the child specification identified by `child_id`.\n\nThe corresponding child process must not be running; use `terminate_child/2`\nto terminate it if it's running.\n\nIf successful, this function returns `:ok`. This function may return an error\nwith an appropriate error tuple if the `child_id` is not found, or if the\ncurrent process is running or being restarted.\n",
    },
    {
      name: "count_children/1",
      type: "function",
      specs: [
        "@spec count_children(supervisor()) :: %{\n        specs: non_neg_integer(),\n        active: non_neg_integer(),\n        supervisors: non_neg_integer(),\n        workers: non_neg_integer()\n      }",
      ],
      documentation:
        "Returns a map containing count values for the given supervisor.\n\nThe map contains the following keys:\n\n  * `:specs` - the total count of children, dead or alive\n\n  * `:active` - the count of all actively running child processes managed by\n    this supervisor\n\n  * `:supervisors` - the count of all supervisors whether or not these\n    child supervisors are still alive\n\n  * `:workers` - the count of all workers, whether or not these child workers\n    are still alive\n\n",
    },
    {
      name: "child_spec/2",
      type: "function",
      specs: [
        "@spec child_spec(\n        child_spec() | module_spec(),\n        keyword()\n      ) :: child_spec()",
      ],
      documentation:
        'Builds and overrides a child specification.\n\nSimilar to `start_link/2` and `init/2`, it expects a module, `{module, arg}`,\nor a [child specification](`t:child_spec/0`).\n\nIf a two-element tuple in the shape of `{module, arg}` is given,\nthe child specification is retrieved by calling `module.child_spec(arg)`.\n\nIf a module is given, the child specification is retrieved by calling\n`module.child_spec([])`.\n\nAfter the child specification is retrieved, the fields on `overrides`\nare directly applied to the child spec. If `overrides` has keys that\ndo not map to any child specification field, an error is raised.\n\nSee the "Child specification" section in the module documentation\nfor all of the available keys for overriding.\n\n## Examples\n\nThis function is often used to set an `:id` option when\nthe same module needs to be started multiple times in the\nsupervision tree:\n\n    Supervisor.child_spec({Agent, fn -> :ok end}, id: {Agent, 1})\n    #=> %{id: {Agent, 1},\n    #=>   start: {Agent, :start_link, [fn -> :ok end]}}\n\n',
    },
  ],
  name: "Supervisor",
  callbacks: [
    {
      name: "init/1",
      type: "callback",
      specs: [],
      documentation:
        "Callback invoked to start the supervisor and during hot code upgrades.\n\nDevelopers typically invoke `Supervisor.init/2` at the end of their\ninit callback to return the proper supervision flags.\n",
    },
  ],
  macros: [],
  types: [
    {
      name: "module_spec/0",
      type: "type",
      specs: ["@type module_spec() :: {module(), args :: term()} | module()"],
      documentation:
        "A module-based child spec.\n\nThis is a form of child spec that you can pass to functions such as `child_spec/2`,\n`start_child/2`, and `start_link/2`, in addition to the normalized `t:child_spec/0`.\n\nA module-based child spec can be:\n\n  * a **module** — the supervisor calls `module.child_spec([])` to retrieve the\n    child specification\n\n  * a **two-element tuple** in the shape of `{module, arg}` — the supervisor\n    calls `module.child_spec(arg)` to retrieve the child specification\n\n",
    },
    {
      name: "child_spec/0",
      type: "type",
      specs: [
        "@type child_spec() :: %{\n        :id => atom() | term(),\n        :start => {module(), function_name :: atom(), args :: [term()]},\n        optional(:restart) => restart(),\n        optional(:shutdown) => shutdown(),\n        optional(:type) => type(),\n        optional(:modules) => [module()] | :dynamic,\n        optional(:significant) => boolean()\n      }",
      ],
      documentation:
        "The supervisor child specification.\n\nIt defines how the supervisor should start, stop and restart each of its children.\n",
    },
    {
      name: "type/0",
      type: "type",
      specs: ["@type type() :: :worker | :supervisor"],
      documentation:
        "Type of a supervised child.\n\nWhether the supervised child is a worker or a supervisor.\n",
    },
    {
      name: "auto_shutdown/0",
      type: "type",
      specs: [
        "@type auto_shutdown() :: :never | :any_significant | :all_significant",
      ],
      documentation: "Supported automatic shutdown options.",
    },
    {
      name: "strategy/0",
      type: "type",
      specs: [
        "@type strategy() :: :one_for_one | :one_for_all | :rest_for_one",
      ],
      documentation: "Supported strategies.",
    },
    {
      name: "shutdown/0",
      type: "type",
      specs: ["@type shutdown() :: timeout() | :brutal_kill"],
      documentation: "Supported shutdown options.",
    },
    {
      name: "restart/0",
      type: "type",
      specs: ["@type restart() :: :permanent | :transient | :temporary"],
      documentation: "Supported restart options.",
    },
    {
      name: "init_option/0",
      type: "type",
      specs: [
        "@type init_option() ::\n        {:strategy, strategy()}\n        | {:max_restarts, non_neg_integer()}\n        | {:max_seconds, pos_integer()}\n        | {:auto_shutdown, auto_shutdown()}",
      ],
      documentation: "Options given to `start_link/2` and `c:init/1`.",
    },
    {
      name: "supervisor/0",
      type: "type",
      specs: ["@type supervisor() :: pid() | name() | {atom(), node()}"],
      documentation: "The supervisor reference.",
    },
    {
      name: "sup_flags/0",
      type: "type",
      specs: [
        "@type sup_flags() :: %{\n        strategy: strategy(),\n        intensity: non_neg_integer(),\n        period: pos_integer(),\n        auto_shutdown: auto_shutdown()\n      }",
      ],
      documentation: "The supervisor flags returned on init.",
    },
    {
      name: "option/0",
      type: "type",
      specs: ["@type option() :: {:name, name()}"],
      documentation:
        "Option values used by the `start_link/2` and `start_link/3` functions.",
    },
    {
      name: "name/0",
      type: "type",
      specs: [
        "@type name() :: atom() | {:global, term()} | {:via, module(), term()}",
      ],
      documentation: "The supervisor name.",
    },
    {
      name: "child/0",
      type: "type",
      specs: ["@type child() :: pid() | :undefined"],
      documentation:
        "A child process.\n\nIt can be a PID when the child process was started, or `:undefined` when\nthe child was created by a [dynamic supervisor](`DynamicSupervisor`).\n",
    },
    {
      name: "on_start_child/0",
      type: "type",
      specs: [
        "@type on_start_child() ::\n        {:ok, child()}\n        | {:ok, child(), info :: term()}\n        | {:error, {:already_started, child()} | :already_present | term()}",
      ],
      documentation: "Return values of `start_child/2`.",
    },
    {
      name: "on_start/0",
      type: "type",
      specs: [
        "@type on_start() ::\n        {:ok, pid()}\n        | :ignore\n        | {:error, {:already_started, pid()} | {:shutdown, term()} | term()}",
      ],
      documentation: "Return values of `start_link/2` and `start_link/3`.",
    },
  ],
};
