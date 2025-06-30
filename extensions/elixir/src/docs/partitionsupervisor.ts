import type { ModuleDoc } from "../types";

export const PartitionSupervisor: ModuleDoc = {
  functions: [
    {
      name: "which_children/1",
      type: "function",
      specs: [
        "@spec which_children(name()) :: [\n        {:undefined, pid() | :restarting, :worker | :supervisor,\n         [module()] | :dynamic}\n      ]",
      ],
      documentation:
        "Returns a list with information about all children.\n\nThis function returns a list of tuples containing:\n\n  * `id` - the partition number\n\n  * `child` - the PID of the corresponding child process or the\n    atom `:restarting` if the process is about to be restarted\n\n  * `type` - `:worker` or `:supervisor` as defined in the child\n    specification\n\n  * `modules` - as defined in the child specification\n\n",
    },
    {
      name: "stop/3",
      type: "function",
      specs: ["@spec stop(name(), reason :: term(), timeout()) :: :ok"],
      documentation:
        "Synchronously stops the given partition supervisor with the given `reason`.\n\nIt returns `:ok` if the supervisor terminates with the given\nreason. If it terminates with another reason, the call exits.\n\nThis function keeps OTP semantics regarding error reporting.\nIf the reason is any other than `:normal`, `:shutdown` or\n`{:shutdown, _}`, an error report is logged.\n",
    },
    {
      name: "start_link/1",
      type: "function",
      specs: ["@spec start_link(keyword()) :: Supervisor.on_start()"],
      documentation:
        "Starts a partition supervisor with the given options.\n\nThis function is typically not invoked directly, instead it is invoked\nwhen using a `PartitionSupervisor` as a child of another supervisor:\n\n    children = [\n      {PartitionSupervisor, child_spec: SomeChild, name: MyPartitionSupervisor}\n    ]\n\nIf the supervisor is successfully spawned, this function returns\n`{:ok, pid}`, where `pid` is the PID of the supervisor. If the given name\nfor the partition supervisor is already assigned to a process,\nthe function returns `{:error, {:already_started, pid}}`, where `pid`\nis the PID of that process.\n\nNote that a supervisor started with this function is linked to the parent\nprocess and exits not only on crashes but also if the parent process exits\nwith `:normal` reason.\n\n## Options\n\n  * `:name` - an atom or via tuple representing the name of the partition\n    supervisor (see `t:name/0`).\n\n  * `:child_spec` - the child spec to be used when starting the partitions.\n\n  * `:partitions` - a positive integer with the number of partitions.\n    Defaults to `System.schedulers_online()` (typically the number of cores).\n\n  * `:strategy` - the restart strategy option, defaults to `:one_for_one`.\n    You can learn more about strategies in the `Supervisor` module docs.\n\n  * `:max_restarts` - the maximum number of restarts allowed in\n    a time frame. Defaults to `3`.\n\n  * `:max_seconds` - the time frame in which `:max_restarts` applies.\n    Defaults to `5`.\n\n  * `:with_arguments` - a two-argument anonymous function that allows\n    the partition to be given to the child starting function. See the\n    `:with_arguments` section below.\n\n## `:with_arguments`\n\nSometimes you want each partition to know their partition assigned number.\nThis can be done with the `:with_arguments` option. This function receives\nthe value of the `:child_spec` option and an integer for the partition\nnumber. It must return a new list of arguments that will be used to start the\npartition process.\n\nFor example, most processes are started by calling `start_link(opts)`,\nwhere `opts` is a keyword list. You could inject the partition into the\noptions given to the child:\n\n    with_arguments: fn [opts], partition ->\n      [Keyword.put(opts, :partition, partition)]\n    end\n\n",
    },
    {
      name: "partitions/1",
      type: "function",
      specs: ["@spec partitions(name()) :: pos_integer()"],
      documentation:
        "Returns the number of partitions for the partition supervisor.\n",
    },
    {
      name: "count_children/1",
      type: "function",
      specs: [
        "@spec count_children(name()) :: %{\n        specs: non_neg_integer(),\n        active: non_neg_integer(),\n        supervisors: non_neg_integer(),\n        workers: non_neg_integer()\n      }",
      ],
      documentation:
        "Returns a map containing count values for the supervisor.\n\nThe map contains the following keys:\n\n  * `:specs` - the number of partitions (children processes)\n\n  * `:active` - the count of all actively running child processes managed by\n    this supervisor\n\n  * `:supervisors` - the count of all supervisors whether or not the child\n    process is still alive\n\n  * `:workers` - the count of all workers, whether or not the child process\n    is still alive\n\n",
    },
  ],
  name: "PartitionSupervisor",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "name/0",
      type: "type",
      specs: ["@type name() :: atom() | {:via, module(), term()}"],
      documentation: "The name of the `PartitionSupervisor`.\n",
    },
  ],
};
