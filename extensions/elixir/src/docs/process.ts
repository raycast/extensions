import type { ModuleDoc } from "../types";

export const Process: ModuleDoc = {
  functions: [
    {
      name: "whereis/1",
      type: "function",
      specs: ["@spec whereis(atom()) :: pid() | port() | nil"],
      documentation:
        "Returns the PID or port identifier registered under `name` or `nil` if the\nname is not registered.\n\nSee `:erlang.whereis/1` for more information.\n\n## Examples\n\n    Process.register(self(), :test)\n    Process.whereis(:test)\n    #=> #PID<0.84.0>\n    Process.whereis(:wrong_name)\n    #=> nil\n\n",
    },
    {
      name: "unregister/1",
      type: "function",
      specs: ["@spec unregister(atom()) :: true"],
      documentation:
        "Removes the registered `name`, associated with a PID\nor a port identifier.\n\nFails with `ArgumentError` if the name is not registered\nto any PID or port.\n\nInlined by the compiler.\n\n## Examples\n\n    Process.register(self(), :test)\n    #=> true\n    Process.unregister(:test)\n    #=> true\n    Process.unregister(:wrong_name)\n    ** (ArgumentError) argument error\n\n",
    },
    {
      name: "unlink/1",
      type: "function",
      specs: ["@spec unlink(pid() | port()) :: true"],
      documentation:
        "Removes the link between the calling process and the given item (process or\nport).\n\nIf there is no such link, this function does nothing. If `pid_or_port` does\nnot exist, this function does not produce any errors and simply does nothing.\n\nThe return value of this function is always `true`.\n\nSee `:erlang.unlink/1` for more information.\n\nInlined by the compiler.\n",
    },
    {
      name: "unalias/1",
      type: "function",
      specs: ["@spec unalias(alias()) :: boolean()"],
      documentation:
        "Explicitly deactivates a process alias.\n\nReturns `true` if `alias` was a currently-active alias for current processes,\nor `false` otherwise.\n\nSee [the module documentation](#module-aliases) for more information about aliases.\nSee also `:erlang.unalias/1`.\n\nInlined by the compiler.\n\n## Examples\n\n    alias = Process.alias()\n    Process.unalias(alias)\n    #=> true\n\n",
    },
    {
      name: "spawn/4",
      type: "function",
      specs: [
        "@spec spawn(module(), atom(), list(), spawn_opts()) ::\n        pid() | {pid(), reference()}",
      ],
      documentation:
        "Spawns the given function `fun` from module `mod`, passing the given `args`\naccording to the given options.\n\nThe result depends on the given options. In particular,\nif `:monitor` is given as an option, it will return a tuple\ncontaining the PID and the monitoring reference, otherwise\njust the spawned process PID.\n\nIt also accepts extra options, for the list of available options\ncheck `:erlang.spawn_opt/4`.\n\nInlined by the compiler.\n",
    },
    {
      name: "spawn/2",
      type: "function",
      specs: [
        "@spec spawn((-> any()), spawn_opts()) :: pid() | {pid(), reference()}",
      ],
      documentation:
        "Spawns the given function according to the given options.\n\nThe result depends on the given options. In particular,\nif `:monitor` is given as an option, it will return a tuple\ncontaining the PID and the monitoring reference, otherwise\njust the spawned process PID.\n\nMore options are available; for the comprehensive list of available options\ncheck `:erlang.spawn_opt/4`.\n\nInlined by the compiler.\n\n## Examples\n\n    Process.spawn(fn -> 1 + 2 end, [:monitor])\n    #=> {#PID<0.93.0>, #Reference<0.18808174.1939079169.202418>}\n    Process.spawn(fn -> 1 + 2 end, [:link])\n    #=> #PID<0.95.0>\n\n",
    },
    {
      name: "sleep/1",
      type: "function",
      specs: ["@spec sleep(timeout()) :: :ok"],
      documentation:
        "Sleeps the current process for the given `timeout`.\n\n`timeout` is either the number of milliseconds to sleep as an\ninteger or the atom `:infinity`. When `:infinity` is given,\nthe current process will sleep forever, and not\nconsume or reply to messages.\n\n**Use this function with extreme care**. For almost all situations\nwhere you would use `sleep/1` in Elixir, there is likely a\nmore correct, faster and precise way of achieving the same with\nmessage passing.\n\nFor example, if you are waiting for a process to perform some\naction, it is better to communicate the progress of such action\nwith messages.\n\nIn other words, **do not**:\n\n    Task.start_link(fn ->\n      do_something()\n      ...\n    end)\n\n    # Wait until work is done\n    Process.sleep(2000)\n\nBut **do**:\n\n    parent = self()\n\n    Task.start_link(fn ->\n      do_something()\n      send(parent, :work_is_done)\n      ...\n    end)\n\n    receive do\n      :work_is_done -> :ok\n    after\n      # Optional timeout\n      30_000 -> :timeout\n    end\n\nFor cases like the one above, `Task.async/1` and `Task.await/2` are\npreferred.\n\nSimilarly, if you are waiting for a process to terminate,\nmonitor that process instead of sleeping. **Do not**:\n\n    Task.start_link(fn ->\n      ...\n    end)\n\n    # Wait until task terminates\n    Process.sleep(2000)\n\nInstead **do**:\n\n    {:ok, pid} =\n      Task.start_link(fn ->\n        ...\n      end)\n\n    ref = Process.monitor(pid)\n\n    receive do\n      {:DOWN, ^ref, _, _, _} -> :task_is_down\n    after\n      # Optional timeout\n      30_000 -> :timeout\n    end\n\n",
    },
    {
      name: "set_label/1",
      type: "function",
      specs: ["@spec set_label(term()) :: :ok"],
      documentation:
        'Add a descriptive term to the current process.\n\nThe term does not need to be unique, and in Erlang/OTP 27+ will be shown in\nObserver and in crash logs.\nThis label may be useful for identifying a process as one of multiple in a\ngiven role, such as `:queue_worker` or `{:live_chat, user_id}`.\n\n## Examples\n\n    Process.set_label(:worker)\n    #=> :ok\n\n    Process.set_label({:any, "term"})\n    #=> :ok\n',
    },
    {
      name: "send_after/4",
      type: "function",
      specs: [
        "@spec send_after(pid() | atom(), term(), non_neg_integer(), [option]) ::\n        reference()\n      when option: {:abs, boolean()}",
      ],
      documentation:
        "Sends `msg` to `dest` after `time` milliseconds.\n\nIf `dest` is a PID, it must be the PID of a local process, dead or alive.\nIf `dest` is an atom, it must be the name of a registered process\nwhich is looked up at the time of delivery. No error is produced if the name does\nnot refer to a process.\n\nThe message is not sent immediately. Therefore, `dest` can receive other messages\nin-between even when `time` is `0`.\n\nThis function returns a timer reference, which can be read with `read_timer/1`\nor canceled with `cancel_timer/1`.\n\nThe timer will be automatically canceled if the given `dest` is a PID\nwhich is not alive or when the given PID exits. Note that timers will not be\nautomatically canceled when `dest` is an atom (as the atom resolution is done\non delivery).\n\nInlined by the compiler.\n\n## Options\n\n  * `:abs` - (boolean) when `false`, `time` is treated as relative to the\n  current monotonic time. When `true`, `time` is the absolute value of the\n  Erlang monotonic time at which `msg` should be delivered to `dest`.\n  To read more about Erlang monotonic time and other time-related concepts,\n  look at the documentation for the `System` module. Defaults to `false`.\n\n## Examples\n\n    timer_ref = Process.send_after(pid, :hi, 1000)\n\n",
    },
    {
      name: "send/3",
      type: "function",
      specs: [
        "@spec send(dest, msg, [option]) :: :ok | :noconnect | :nosuspend\n      when dest: dest(), msg: any(), option: :noconnect | :nosuspend",
      ],
      documentation:
        "Sends a message to the given `dest`.\n\n`dest` may be a remote or local PID, a local port, a locally\nregistered name, or a tuple in the form of `{registered_name, node}` for a\nregistered name at another node.\n\nInlined by the compiler.\n\n## Options\n\n  * `:noconnect` - when used, if sending the message would require an\n    auto-connection to another node the message is not sent and `:noconnect` is\n    returned.\n\n  * `:nosuspend` - when used, if sending the message would cause the sender to\n    be suspended the message is not sent and `:nosuspend` is returned.\n\nOtherwise the message is sent and `:ok` is returned.\n\n## Examples\n\n    iex> Process.send({:name, :node_that_does_not_exist}, :hi, [:noconnect])\n    :noconnect\n\n",
    },
    {
      name: "registered/0",
      type: "function",
      specs: ["@spec registered() :: [atom()]"],
      documentation:
        "Returns a list of names which have been registered using `register/2`.\n\nInlined by the compiler.\n\n## Examples\n\n    Process.register(self(), :test)\n    Process.registered()\n    #=> [:test, :elixir_config, :inet_db, ...]\n\n",
    },
    {
      name: "register/2",
      type: "function",
      specs: ["@spec register(pid() | port(), atom()) :: true"],
      documentation:
        "Registers the given `pid_or_port` under the given `name` on the local node.\n\n`name` must be an atom and can then be used instead of the\nPID/port identifier when sending messages with `Kernel.send/2`.\n\n`register/2` will fail with `ArgumentError` in any of the following cases:\n\n  * the PID/Port is not existing locally and alive\n  * the name is already registered\n  * the `pid_or_port` is already registered under a different `name`\n\nThe following names are reserved and cannot be assigned to\nprocesses nor ports:\n\n  * `nil`\n  * `false`\n  * `true`\n  * `:undefined`\n\n## Examples\n\n    Process.register(self(), :test)\n    #=> true\n    send(:test, :hello)\n    #=> :hello\n    send(:wrong_name, :hello)\n    ** (ArgumentError) argument error\n\n",
    },
    {
      name: "read_timer/1",
      type: "function",
      specs: ["@spec read_timer(reference()) :: non_neg_integer() | false"],
      documentation:
        "Reads a timer created by `send_after/3`.\n\nWhen the result is an integer, it represents the time in milliseconds\nleft until the timer will expire.\n\nWhen the result is `false`, a timer corresponding to `timer_ref` could not be\nfound. This can be either because the timer expired, because it has already\nbeen canceled, or because `timer_ref` never corresponded to a timer.\n\nEven if the timer had expired and the message was sent, this function does not\ntell you if the timeout message has arrived at its destination yet.\n\nInlined by the compiler.\n",
    },
    {
      name: "put/2",
      type: "function",
      specs: ["@spec put(term(), term()) :: term() | nil"],
      documentation:
        'Stores the given `key`-`value` pair in the process dictionary.\n\nThe return value of this function is the value that was previously stored\nunder `key`, or `nil` in case no value was stored under it.\n\n## Examples\n\n    # Assuming :locale was not set\n    iex> Process.put(:locale, "en")\n    nil\n    iex> Process.put(:locale, "fr")\n    "en"\n\n',
    },
    {
      name: "monitor/2",
      type: "function",
      specs: [
        "@spec monitor(pid() | {name, node()} | name, [:erlang.monitor_option()]) ::\n        reference()\n      when name: atom()",
      ],
      documentation:
        "Starts monitoring the given `item` from the calling process.\n\nThis function is similar to `monitor/1`, but accepts options to customize how\n`item` is monitored. See `:erlang.monitor/3` for documentation on those\noptions.\n\nInlined by the compiler.\n\n## Examples\n\n    pid =\n      spawn(fn ->\n        receive do\n          {:ping, source_alias} -> send(source_alias, :pong)\n        end\n      end)\n    #=> #PID<0.118.0>\n\n    ref_and_alias = Process.monitor(pid, alias: :reply_demonitor)\n    #=> #Reference<0.906660723.3006791681.40191>\n\n    send(pid, {:ping, ref_and_alias})\n\n    receive do: msg -> msg\n    #=> :pong\n\n    receive do: msg -> msg\n    #=> {:DOWN, #Reference<0.906660723.3006791681.40191>, :process, #PID<0.118.0>, :noproc}\n\n",
    },
    {
      name: "monitor/1",
      type: "function",
      specs: [
        "@spec monitor(pid() | {name, node()} | name) :: reference() when name: atom()",
      ],
      documentation:
        'Starts monitoring the given `item` from the calling process.\n\nOnce the monitored process dies, a message is delivered to the\nmonitoring process in the shape of:\n\n    {:DOWN, ref, :process, object, reason}\n\nwhere:\n\n  * `ref` is a monitor reference returned by this function;\n  * `object` is either a `pid` of the monitored process (if monitoring\n    a PID) or `{name, node}` (if monitoring a remote or local name);\n  * `reason` is the exit reason.\n\nIf the process is already dead when calling `Process.monitor/1`, a\n`:DOWN` message is delivered immediately.\n\nSee ["The need for monitoring"](genservers.md#the-need-for-monitoring)\nfor an example. See `:erlang.monitor/2` for more information.\n\nInlined by the compiler.\n\n## Examples\n\n    pid = spawn(fn -> 1 + 2 end)\n    #=> #PID<0.118.0>\n    Process.monitor(pid)\n    #=> #Reference<0.906660723.3006791681.40191>\n    Process.exit(pid, :kill)\n    #=> true\n    receive do\n      msg -> msg\n    end\n    #=> {:DOWN, #Reference<0.906660723.3006791681.40191>, :process, #PID<0.118.0>, :noproc}\n\n',
    },
    {
      name: "list/0",
      type: "function",
      specs: ["@spec list() :: [pid()]"],
      documentation:
        "Returns a list of PIDs corresponding to all the\nprocesses currently existing on the local node.\n\nNote that if a process is exiting, it is considered to exist but not be\nalive. This means that for such process, `alive?/1` will return `false` but\nits PID will be part of the list of PIDs returned by this function.\n\nSee `:erlang.processes/0` for more information.\n\nInlined by the compiler.\n\n## Examples\n\n    Process.list()\n    #=> [#PID<0.0.0>, #PID<0.1.0>, #PID<0.2.0>, #PID<0.3.0>, ...]\n\n",
    },
    {
      name: "link/1",
      type: "function",
      specs: ["@spec link(pid() | port()) :: true"],
      documentation:
        "Creates a link between the calling process and the given item (process or\nport).\n\nLinks are bidirectional. Linked processes can be unlinked by using `unlink/1`.\n\nIf such a link exists already, this function does nothing since there can only\nbe one link between two given processes. If a process tries to create a link\nto itself, nothing will happen.\n\nWhen two processes are linked, each one receives exit signals from the other\n(see also `exit/2`). Let's assume `pid1` and `pid2` are linked. If `pid2`\nexits with a reason other than `:normal` (which is also the exit reason used\nwhen a process finishes its job) and `pid1` is not trapping exits (see\n`flag/2`), then `pid1` will exit with the same reason as `pid2` and in turn\nemit an exit signal to all its other linked processes. The behavior when\n`pid1` is trapping exits is described in `exit/2`.\n\nSee `:erlang.link/1` for more information.\n\nInlined by the compiler.\n",
    },
    {
      name: "info/2",
      type: "function",
      specs: [
        "@spec info(pid(), process_info_item()) :: process_info_result_item() | nil",
        "@spec info(pid(), [process_info_item()]) :: [process_info_result_item()] | nil",
      ],
      documentation:
        "Returns information about the process identified by `pid`,\nor returns `nil` if the process is not alive.\n\nSee `:erlang.process_info/2` for more information.\n",
    },
    {
      name: "info/1",
      type: "function",
      specs: ["@spec info(pid()) :: keyword() | nil"],
      documentation:
        "Returns information about the process identified by `pid`, or returns `nil` if the process\nis not alive.\n\nUse this only for debugging information.\n\nSee `:erlang.process_info/1` for more information.\n",
    },
    {
      name: "hibernate/3",
      type: "function",
      specs: ["@spec hibernate(module(), atom(), list()) :: no_return()"],
      documentation:
        'Puts the calling process into a "hibernation" state.\n\nThe calling process is put into a waiting state\nwhere its memory allocation has been reduced as much as possible,\nwhich is useful if the process does not expect to receive any messages\nin the near future.\n\nSee `:erlang.hibernate/3` for more information.\n\nInlined by the compiler.\n',
    },
    {
      name: "group_leader/2",
      type: "function",
      specs: ["@spec group_leader(pid(), leader :: pid()) :: true"],
      documentation:
        "Sets the group leader of the given `pid` to `leader`.\n\nTypically, this is used when a process started from a certain shell should\nhave a group leader other than `:init`.\n\nInlined by the compiler.\n",
    },
    {
      name: "group_leader/0",
      type: "function",
      specs: ["@spec group_leader() :: pid()"],
      documentation:
        "Returns the PID of the group leader for the calling process.\n\nInlined by the compiler.\n\n## Examples\n\n    Process.group_leader()\n    #=> #PID<0.53.0>\n\n",
    },
    {
      name: "get_keys/1",
      type: "function",
      specs: ["@spec get_keys(term()) :: [term()]"],
      documentation:
        "Returns all keys in the process dictionary that have the given `value`.\n\nInlined by the compiler.\n",
    },
    {
      name: "get_keys/0",
      type: "function",
      specs: ["@spec get_keys() :: [term()]"],
      documentation:
        'Returns all keys in the process dictionary.\n\nInlined by the compiler.\n\n## Examples\n\n    # Assuming :locale was not set\n    iex> :locale in Process.get_keys()\n    false\n    iex> Process.put(:locale, "pt")\n    nil\n    iex> :locale in Process.get_keys()\n    true\n\n',
    },
    {
      name: "get/2",
      type: "function",
      specs: ["@spec get(term(), default :: term()) :: term()"],
      documentation:
        'Returns the value for the given `key` in the process dictionary,\nor `default` if `key` is not set.\n\n## Examples\n\n    # Assuming :locale was not set\n    iex> Process.get(:locale, "pt")\n    "pt"\n    iex> Process.put(:locale, "fr")\n    nil\n    iex> Process.get(:locale, "pt")\n    "fr"\n\n',
    },
    {
      name: "get/0",
      type: "function",
      specs: ["@spec get() :: [{term(), term()}]"],
      documentation:
        "Returns all key-value pairs in the process dictionary.\n\nInlined by the compiler.\n",
    },
    {
      name: "flag/3",
      type: "function",
      specs: ["@spec flag(pid(), :save_calls, 0..10000) :: 0..10000"],
      documentation:
        "Sets the given `flag` to `value` for the given process `pid`.\n\nReturns the old value of `flag`.\n\nIt raises `ArgumentError` if `pid` is not a local process.\n\nThe allowed values for `flag` are only a subset of those allowed in `flag/2`,\nnamely `:save_calls`.\n\nSee `:erlang.process_flag/3` for more information.\n\nInlined by the compiler.\n",
    },
    {
      name: "flag/2",
      type: "function",
      specs: [
        "@spec flag(:error_handler, module()) :: module()",
        "@spec flag(:max_heap_size, heap_size()) :: heap_size()",
        "@spec flag(:message_queue_data, :off_heap | :on_heap) :: :off_heap | :on_heap",
        "@spec flag(:min_bin_vheap_size, non_neg_integer()) :: non_neg_integer()",
        "@spec flag(:min_heap_size, non_neg_integer()) :: non_neg_integer()",
        "@spec flag(:priority, priority_level()) :: priority_level()",
        "@spec flag(:save_calls, 0..10000) :: 0..10000",
        "@spec flag(:sensitive, boolean()) :: boolean()",
        "@spec flag(:trap_exit, boolean()) :: boolean()",
      ],
      documentation:
        "Sets the given `flag` to `value` for the calling process.\n\nReturns the old value of `flag`.\n\nSee `:erlang.process_flag/2` for more information.\n\nInlined by the compiler.\n",
    },
    {
      name: "exit/2",
      type: "function",
      specs: ["@spec exit(pid(), term()) :: true"],
      documentation:
        "Sends an exit signal with the given `reason` to `pid`.\n\nThe following behavior applies if `reason` is any term except `:normal`\nor `:kill`:\n\n  1. If `pid` is not trapping exits, `pid` will exit with the given\n     `reason`.\n\n  2. If `pid` is trapping exits, the exit signal is transformed into a\n     message `{:EXIT, from, reason}` and delivered to the message queue\n     of `pid`.\n\nIf `reason` is the atom `:normal`, `pid` will not exit (unless `pid` is\nthe calling process, in which case it will exit with the reason `:normal`).\nIf it is trapping exits, the exit signal is transformed into a message\n`{:EXIT, from, :normal}` and delivered to its message queue.\n\nIf `reason` is the atom `:kill`, that is if `Process.exit(pid, :kill)` is called,\nan untrappable exit signal is sent to `pid` which will unconditionally exit\nwith reason `:killed`.\n\nInlined by the compiler.\n\n## Examples\n\n    Process.exit(pid, :kill)\n    #=> true\n\n",
    },
    {
      name: "demonitor/2",
      type: "function",
      specs: [
        "@spec demonitor(reference(), options :: [:flush | :info]) :: boolean()",
      ],
      documentation:
        "Demonitors the monitor identified by the given `reference`.\n\nIf `monitor_ref` is a reference which the calling process\nobtained by calling `monitor/1`, that monitoring is turned off.\nIf the monitoring is already turned off, nothing happens.\n\nSee `:erlang.demonitor/2` for more information.\n\nInlined by the compiler.\n\n## Examples\n\n    pid = spawn(fn -> 1 + 2 end)\n    ref = Process.monitor(pid)\n    Process.demonitor(ref)\n    #=> true\n\n",
    },
    {
      name: "delete/1",
      type: "function",
      specs: ["@spec delete(term()) :: term() | nil"],
      documentation:
        'Deletes the given `key` from the process dictionary.\n\nReturns the value that was under `key` in the process dictionary,\nor `nil` if `key` was not stored in the process dictionary.\n\n## Examples\n\n    iex> Process.put(:comments, ["comment", "other comment"])\n    iex> Process.delete(:comments)\n    ["comment", "other comment"]\n    iex> Process.delete(:comments)\n    nil\n\n',
    },
    {
      name: "cancel_timer/2",
      type: "function",
      specs: [
        "@spec cancel_timer(reference(), options) :: non_neg_integer() | false | :ok\n      when options: [async: boolean(), info: boolean()]",
      ],
      documentation:
        "Cancels a timer returned by `send_after/3`.\n\nWhen the result is an integer, it represents the time in milliseconds\nleft until the timer would have expired.\n\nWhen the result is `false`, a timer corresponding to `timer_ref` could not be\nfound. This can happen either because the timer expired, because it has\nalready been canceled, or because `timer_ref` never corresponded to a timer.\n\nEven if the timer had expired and the message was sent, this function does not\ntell you if the timeout message has arrived at its destination yet.\n\nInlined by the compiler.\n\n## Options\n\n  * `:async` - (boolean) when `false`, the request for cancellation is\n    synchronous. When `true`, the request for cancellation is asynchronous,\n    meaning that the request to cancel the timer is issued and `:ok` is\n    returned right away. Defaults to `false`.\n\n  * `:info` - (boolean) whether to return information about the timer being\n    cancelled. When the `:async` option is `false` and `:info` is `true`, then\n    either an integer or `false` (like described above) is returned. If\n    `:async` is `false` and `:info` is `false`, `:ok` is returned. If `:async`\n    is `true` and `:info` is `true`, a message in the form `{:cancel_timer,\n    timer_ref, result}` (where `result` is an integer or `false` like\n    described above) is sent to the caller of this function when the\n    cancellation has been performed. If `:async` is `true` and `:info` is\n    `false`, no message is sent. Defaults to `true`.\n\n",
    },
    {
      name: "alive?/1",
      type: "function",
      specs: ["@spec alive?(pid()) :: boolean()"],
      documentation:
        "Tells whether the given process is alive on the local node.\n\nIf the process identified by `pid` is alive (that is, it's not exiting and has\nnot exited yet) than this function returns `true`. Otherwise, it returns\n`false`.\n\n`pid` must refer to a process running on the local node or `ArgumentError` is raised.\n\nInlined by the compiler.\n",
    },
    {
      name: "alias/1",
      type: "function",
      specs: ["@spec alias([alias_opt()]) :: alias()"],
      documentation:
        "Creates a process alias.\n\nSee [the module documentation](#module-aliases) for more information about aliases.\nSee also `:erlang.alias/1`.\n\nInlined by the compiler.\n\n## Examples\n\n    alias = Process.alias([:reply])\n\n",
    },
    {
      name: "alias/0",
      type: "function",
      specs: ["@spec alias() :: alias()"],
      documentation:
        "Creates a process alias.\n\nThis is the same as calling `alias/1` as `alias([:explicit_unalias])`. See\nalso `:erlang.alias/0`.\n\nInlined by the compiler.\n\n## Examples\n\n    alias = Process.alias()\n\n",
    },
  ],
  name: "Process",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "alias/0",
      type: "type",
      specs: ["@type alias() :: reference()"],
      documentation:
        "An alias returned by `alias/0` or `alias/1`.\n\nSee [the module documentation](#module-aliases) for more information about aliases.\n",
    },
    {
      name: "alias_opt/0",
      type: "type",
      specs: ["@type alias_opt() :: :explicit_unalias | :reply"],
      documentation: null,
    },
    {
      name: "process_info_result_item/0",
      type: "type",
      specs: [
        "@type process_info_result_item() :: {process_info_item(), term()}",
      ],
      documentation: null,
    },
    {
      name: "process_info_item/0",
      type: "type",
      specs: ["@type process_info_item() :: atom() | {:dictionary, term()}"],
      documentation: null,
    },
    {
      name: "spawn_opts/0",
      type: "type",
      specs: ["@type spawn_opts() :: [spawn_opt()]"],
      documentation: null,
    },
    {
      name: "spawn_opt/0",
      type: "type",
      specs: [
        "@type spawn_opt() ::\n        :link\n        | :monitor\n        | {:monitor, :erlang.monitor_option()}\n        | {:priority, :low | :normal | :high}\n        | {:fullsweep_after, non_neg_integer()}\n        | {:min_heap_size, non_neg_integer()}\n        | {:min_bin_vheap_size, non_neg_integer()}\n        | {:max_heap_size, heap_size()}\n        | {:message_queue_data, :off_heap | :on_heap}",
      ],
      documentation: null,
    },
    {
      name: "dest/0",
      type: "type",
      specs: [
        "@type dest() ::\n        pid()\n        | port()\n        | (registered_name :: atom())\n        | {registered_name :: atom(), node()}",
      ],
      documentation:
        "A process destination.\n\nA remote or local PID, a local port, a locally registered name, or a tuple in\nthe form of `{registered_name, node}` for a registered name at another node.\n",
    },
  ],
};
