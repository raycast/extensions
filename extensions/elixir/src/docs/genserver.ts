import type { ModuleDoc } from "../types";

export const GenServer: ModuleDoc = {
  functions: [
    {
      name: "whereis/1",
      type: "function",
      specs: ["@spec whereis(server()) :: pid() | {atom(), node()} | nil"],
      documentation:
        "Returns the `pid` or `{name, node}` of a GenServer process, `nil` otherwise.\n\nTo be precise, `nil` is returned whenever a `pid` or `{name, node}` cannot\nbe returned. Note there is no guarantee the returned `pid` or `{name, node}`\nis alive, as a process could terminate immediately after it is looked up.\n\n## Examples\n\nFor example, to lookup a server process, monitor it and send a cast to it:\n\n    process = GenServer.whereis(server)\n    monitor = Process.monitor(process)\n    GenServer.cast(process, :hello)\n\n",
    },
    {
      name: "stop/3",
      type: "function",
      specs: ["@spec stop(server(), reason :: term(), timeout()) :: :ok"],
      documentation:
        "Synchronously stops the server with the given `reason`.\n\nThe `c:terminate/2` callback of the given `server` will be invoked before\nexiting. This function returns `:ok` if the server terminates with the\ngiven reason; if it terminates with another reason, the call exits.\n\nThis function keeps OTP semantics regarding error reporting.\nIf the reason is any other than `:normal`, `:shutdown` or\n`{:shutdown, _}`, an error report is logged.\n",
    },
    {
      name: "start_link/3",
      type: "function",
      specs: ["@spec start_link(module(), any(), options()) :: on_start()"],
      documentation:
        'Starts a `GenServer` process linked to the current process.\n\nThis is often used to start the `GenServer` as part of a supervision tree.\n\nOnce the server is started, the `c:init/1` function of the given `module` is\ncalled with `init_arg` as its argument to initialize the server. To ensure a\nsynchronized start-up procedure, this function does not return until `c:init/1`\nhas returned.\n\nNote that a `GenServer` started with `start_link/3` is linked to the\nparent process and will exit in case of crashes from the parent. The GenServer\nwill also exit due to the `:normal` reasons in case it is configured to trap\nexits in the `c:init/1` callback.\n\n## Options\n\n  * `:name` - used for name registration as described in the "Name\n    registration" section in the documentation for `GenServer`\n\n  * `:timeout` - if present, the server is allowed to spend the given number of\n    milliseconds initializing or it will be terminated and the start function\n    will return `{:error, :timeout}`\n\n  * `:debug` - if present, the corresponding function in the [`:sys` module](`:sys`) is invoked\n\n  * `:spawn_opt` - if present, its value is passed as options to the\n    underlying process as in `Process.spawn/4`\n\n  * `:hibernate_after` - if present, the GenServer process awaits any message for\n    the given number of milliseconds and if no message is received, the process goes\n    into hibernation automatically (by calling `:proc_lib.hibernate/3`).\n\n## Return values\n\nIf the server is successfully created and initialized, this function returns\n`{:ok, pid}`, where `pid` is the PID of the server. If a process with the\nspecified server name already exists, this function returns\n`{:error, {:already_started, pid}}` with the PID of that process.\n\nIf the `c:init/1` callback fails with `reason`, this function returns\n`{:error, reason}`. Otherwise, if it returns `{:stop, reason}`\nor `:ignore`, the process is terminated and this function returns\n`{:error, reason}` or `:ignore`, respectively.\n',
    },
    {
      name: "start/3",
      type: "function",
      specs: ["@spec start(module(), any(), options()) :: on_start()"],
      documentation:
        "Starts a `GenServer` process without links (outside of a supervision tree).\n\nSee `start_link/3` for more information.\n",
    },
    {
      name: "reply/2",
      type: "function",
      specs: ["@spec reply(from(), term()) :: :ok"],
      documentation:
        "Replies to a client.\n\nThis function can be used to explicitly send a reply to a client that called\n`call/3` or `multi_call/4` when the reply cannot be specified in the return\nvalue of `c:handle_call/3`.\n\n`client` must be the `from` argument (the second argument) accepted by\n`c:handle_call/3` callbacks. `reply` is an arbitrary term which will be given\nback to the client as the return value of the call.\n\nNote that `reply/2` can be called from any process, not just the GenServer\nthat originally received the call (as long as that GenServer communicated the\n`from` argument somehow).\n\nThis function always returns `:ok`.\n\n## Examples\n\n    def handle_call(:reply_in_one_second, from, state) do\n      Process.send_after(self(), {:reply, from}, 1_000)\n      {:noreply, state}\n    end\n\n    def handle_info({:reply, from}, state) do\n      GenServer.reply(from, :one_second_has_passed)\n      {:noreply, state}\n    end\n\n",
    },
    {
      name: "multi_call/4",
      type: "function",
      specs: [
        "@spec multi_call([node()], name :: atom(), term(), timeout()) ::\n        {replies :: [{node(), term()}], bad_nodes :: [node()]}",
      ],
      documentation:
        'Calls all servers locally registered as `name` at the specified `nodes`.\n\nFirst, the `request` is sent to every node in `nodes`; then, the caller waits\nfor the replies. This function returns a two-element tuple `{replies,\nbad_nodes}` where:\n\n  * `replies` - is a list of `{node, reply}` tuples where `node` is the node\n    that replied and `reply` is its reply\n  * `bad_nodes` - is a list of nodes that either did not exist or where a\n    server with the given `name` did not exist or did not reply\n\n`nodes` is a list of node names to which the request is sent. The default\nvalue is the list of all known nodes (including this node).\n\n## Examples\n\nAssuming the `Stack` GenServer mentioned in the docs for the `GenServer`\nmodule is registered as `Stack` in the `:"foo@my-machine"` and\n`:"bar@my-machine"` nodes:\n\n    GenServer.multi_call(Stack, :pop)\n    #=> {[{:"foo@my-machine", :hello}, {:"bar@my-machine", :world}], []}\n\n',
    },
    {
      name: "cast/2",
      type: "function",
      specs: ["@spec cast(server(), term()) :: :ok"],
      documentation:
        'Casts a request to the `server` without waiting for a response.\n\nThis function always returns `:ok` regardless of whether\nthe destination `server` (or node) exists. Therefore it\nis unknown whether the destination `server` successfully\nhandled the request.\n\n`server` can be any of the values described in the "Name registration"\nsection of the documentation for this module.\n',
    },
    {
      name: "call/3",
      type: "function",
      specs: ["@spec call(server(), term(), timeout()) :: term()"],
      documentation:
        'Makes a synchronous call to the `server` and waits for its reply.\n\nThe client sends the given `request` to the server and waits until a reply\narrives or a timeout occurs. `c:handle_call/3` will be called on the server\nto handle the request.\n\n`server` can be any of the values described in the "Name registration"\nsection of the documentation for this module.\n\n## Timeouts\n\n`timeout` is an integer greater than zero which specifies how many\nmilliseconds to wait for a reply, or the atom `:infinity` to wait\nindefinitely. The default value is `5000`. If no reply is received within\nthe specified time, the function call fails and the caller exits. If the\ncaller catches the failure and continues running, and the server is just late\nwith the reply, it may arrive at any time later into the caller\'s message\nqueue. The caller must in this case be prepared for this and discard any such\ngarbage messages that are two-element tuples with a reference as the first\nelement.\n',
    },
    {
      name: "abcast/3",
      type: "function",
      specs: ["@spec abcast([node()], name :: atom(), term()) :: :abcast"],
      documentation:
        "Casts all servers locally registered as `name` at the specified nodes.\n\nThis function returns immediately and ignores nodes that do not exist, or where the\nserver name does not exist.\n\nSee `multi_call/4` for more information.\n",
    },
  ],
  name: "GenServer",
  callbacks: [
    {
      name: "terminate/2",
      type: "callback",
      specs: [],
      documentation:
        "Invoked when the server is about to exit. It should do any cleanup required.\n\n`reason` is exit reason and `state` is the current state of the `GenServer`.\nThe return value is ignored.\n\n`c:terminate/2` is useful for cleanup that requires access to the\n`GenServer`'s state. However, it is **not guaranteed** that `c:terminate/2`\nis called when a `GenServer` exits. Therefore, important cleanup should be\ndone using process links and/or monitors. A monitoring process will receive the\nsame exit `reason` that would be passed to `c:terminate/2`.\n\n`c:terminate/2` is called if:\n\n  * the `GenServer` traps exits (using `Process.flag/2`) *and* the parent\n  process (the one which called `start_link/1`) sends an exit signal\n\n  * a callback (except `c:init/1`) does one of the following:\n\n    * returns a `:stop` tuple\n\n    * raises (via `raise/2`) or exits (via `exit/1`)\n\n    * returns an invalid value\n\nIf part of a supervision tree, a `GenServer` will receive an exit signal from\nits parent process (its supervisor) when the tree is shutting down. The exit\nsignal is based on the shutdown strategy in the child's specification, where\nthis value can be:\n\n  * `:brutal_kill`: the `GenServer` is killed and so `c:terminate/2` is not called.\n\n  * a timeout value, where the supervisor will send the exit signal `:shutdown` and\n    the `GenServer` will have the duration of the timeout to terminate.\n    If after duration of this timeout the process is still alive, it will be killed\n    immediately.\n\nFor a more in-depth explanation, please read the \"Shutdown values (:shutdown)\"\nsection in the `Supervisor` module.\n\nIf the `GenServer` receives an exit signal (that is not `:normal`) from any\nprocess when it is not trapping exits it will exit abruptly with the same\nreason and so not call `c:terminate/2`. Note that a process does *NOT* trap\nexits by default and an exit signal is sent when a linked process exits or its\nnode is disconnected.\n\n`c:terminate/2` is only called after the `GenServer` finishes processing all\nmessages which arrived in its mailbox prior to the exit signal. If it\nreceives a `:kill` signal before it finishes processing those,\n`c:terminate/2` will not be called. If `c:terminate/2` is called, any\nmessages received after the exit signal will still be in the mailbox.\n\nThere is no cleanup needed when the `GenServer` controls a `port` (for example,\n`:gen_tcp.socket`) or `t:File.io_device/0`, because these will be closed on\nreceiving a `GenServer`'s exit signal and do not need to be closed manually\nin `c:terminate/2`.\n\nIf `reason` is neither `:normal`, `:shutdown`, nor `{:shutdown, term}` an error is\nlogged.\n\nThis callback is optional.\n",
    },
    {
      name: "init/1",
      type: "callback",
      specs: [],
      documentation:
        'Invoked when the server is started. `start_link/3` or `start/3` will\nblock until it returns.\n\n`init_arg` is the argument term (second argument) passed to `start_link/3`.\n\nReturning `{:ok, state}` will cause `start_link/3` to return\n`{:ok, pid}` and the process to enter its loop.\n\nReturning `{:ok, state, timeout}` is similar to `{:ok, state}`,\nexcept that it also sets a timeout. See the "Timeouts" section\nin the module documentation for more information.\n\nReturning `{:ok, state, :hibernate}` is similar to `{:ok, state}`\nexcept the process is hibernated before entering the loop. See\n`c:handle_call/3` for more information on hibernation.\n\nReturning `{:ok, state, {:continue, continue_arg}}` is similar to\n`{:ok, state}` except that immediately after entering the loop,\nthe `c:handle_continue/2` callback will be invoked with `continue_arg`\nas the first argument and `state` as the second one.\n\nReturning `:ignore` will cause `start_link/3` to return `:ignore` and\nthe process will exit normally without entering the loop or calling\n`c:terminate/2`. If used when part of a supervision tree the parent\nsupervisor will not fail to start nor immediately try to restart the\n`GenServer`. The remainder of the supervision tree will be started\nand so the `GenServer` should not be required by other processes.\nIt can be started later with `Supervisor.restart_child/2` as the child\nspecification is saved in the parent supervisor. The main use cases for\nthis are:\n\n  * The `GenServer` is disabled by configuration but might be enabled later.\n  * An error occurred and it will be handled by a different mechanism than the\n   `Supervisor`. Likely this approach involves calling `Supervisor.restart_child/2`\n    after a delay to attempt a restart.\n\nReturning `{:stop, reason}` will cause `start_link/3` to return\n`{:error, reason}` and the process to exit with reason `reason` without\nentering the loop or calling `c:terminate/2`.\n',
    },
    {
      name: "handle_info/2",
      type: "callback",
      specs: [],
      documentation:
        "Invoked to handle all other messages.\n\n`msg` is the message and `state` is the current state of the `GenServer`. When\na timeout occurs the message is `:timeout`.\n\nReturn values are the same as `c:handle_cast/2`.\n\nThis callback is optional. If one is not implemented, the received message\nwill be logged.\n",
    },
    {
      name: "handle_continue/2",
      type: "callback",
      specs: [],
      documentation:
        "Invoked to handle continue instructions.\n\nIt is useful for performing work after initialization or for splitting the work\nin a callback in multiple steps, updating the process state along the way.\n\nReturn values are the same as `c:handle_cast/2`.\n\nThis callback is optional. If one is not implemented, the server will fail\nif a continue instruction is used.\n",
    },
    {
      name: "handle_cast/2",
      type: "callback",
      specs: [],
      documentation:
        'Invoked to handle asynchronous `cast/2` messages.\n\n`request` is the request message sent by a `cast/2` and `state` is the current\nstate of the `GenServer`.\n\nReturning `{:noreply, new_state}` continues the loop with new state `new_state`.\n\nReturning `{:noreply, new_state, timeout}` is similar to `{:noreply, new_state}`\nexcept that it also sets a timeout. See the "Timeouts" section in the module\ndocumentation for more information.\n\nReturning `{:noreply, new_state, :hibernate}` is similar to\n`{:noreply, new_state}` except the process is hibernated before continuing the\nloop. See `c:handle_call/3` for more information.\n\nReturning `{:noreply, new_state, {:continue, continue_arg}}` is similar to\n`{:noreply, new_state}` except `c:handle_continue/2` will be invoked\nimmediately after with `continue_arg` as the first argument and\n`state` as the second one.\n\nReturning `{:stop, reason, new_state}` stops the loop and `c:terminate/2` is\ncalled with the reason `reason` and state `new_state`. The process exits with\nreason `reason`.\n\nThis callback is optional. If one is not implemented, the server will fail\nif a cast is performed against it.\n',
    },
    {
      name: "handle_call/3",
      type: "callback",
      specs: [],
      documentation:
        'Invoked to handle synchronous `call/3` messages. `call/3` will block until a\nreply is received (unless the call times out or nodes are disconnected).\n\n`request` is the request message sent by a `call/3`, `from` is a 2-tuple\ncontaining the caller\'s PID and a term that uniquely identifies the call, and\n`state` is the current state of the `GenServer`.\n\nReturning `{:reply, reply, new_state}` sends the response `reply` to the\ncaller and continues the loop with new state `new_state`.\n\nReturning `{:reply, reply, new_state, timeout}` is similar to\n`{:reply, reply, new_state}` except that it also sets a timeout.\nSee the "Timeouts" section in the module documentation for more information.\n\nReturning `{:reply, reply, new_state, :hibernate}` is similar to\n`{:reply, reply, new_state}` except the process is hibernated and will\ncontinue the loop once a message is in its message queue. However, if a message is\nalready in the message queue, the process will continue the loop immediately.\nHibernating a `GenServer` causes garbage collection and leaves a continuous\nheap that minimises the memory used by the process.\n\nHibernating should not be used aggressively as too much time could be spent\ngarbage collecting, which would delay the processing of incoming messages.\nNormally it should only be used when you are not expecting new messages to\nimmediately arrive and minimising the memory of the process is shown to be\nbeneficial.\n\nReturning `{:reply, reply, new_state, {:continue, continue_arg}}` is similar to\n`{:reply, reply, new_state}` except that `c:handle_continue/2` will be invoked\nimmediately after with `continue_arg` as the first argument and\n`state` as the second one.\n\nReturning `{:noreply, new_state}` does not send a response to the caller and\ncontinues the loop with new state `new_state`. The response must be sent with\n`reply/2`.\n\nThere are three main use cases for not replying using the return value:\n\n  * To reply before returning from the callback because the response is known\n    before calling a slow function.\n  * To reply after returning from the callback because the response is not yet\n    available.\n  * To reply from another process, such as a task.\n\nWhen replying from another process the `GenServer` should exit if the other\nprocess exits without replying as the caller will be blocking awaiting a\nreply.\n\nReturning `{:noreply, new_state, timeout | :hibernate | {:continue, continue_arg}}`\nis similar to `{:noreply, new_state}` except a timeout, hibernation or continue\noccurs as with a `:reply` tuple.\n\nReturning `{:stop, reason, reply, new_state}` stops the loop and `c:terminate/2`\nis called with reason `reason` and state `new_state`. Then, the `reply` is sent\nas the response to call and the process exits with reason `reason`.\n\nReturning `{:stop, reason, new_state}` is similar to\n`{:stop, reason, reply, new_state}` except a reply is not sent.\n\nThis callback is optional. If one is not implemented, the server will fail\nif a call is performed against it.\n',
    },
    {
      name: "format_status/2",
      type: "callback",
      specs: [],
      documentation: null,
    },
    {
      name: "format_status/1",
      type: "callback",
      specs: [],
      documentation:
        'This function is called by a `GenServer` process in the following situations:\n\n  * [`:sys.get_status/1,2`](`:sys.get_status/1`) is invoked to get the `GenServer` status.\n  * The `GenServer` process terminates abnormally and logs an error.\n\nThis callback is used to limit the status of the process returned by\n[`:sys.get_status/1,2`](`:sys.get_status/1`) or sent to logger.\n\nThe callback gets a map `status` describing the current status and shall return\na map `new_status` with the same keys, but it may transform some values.\n\nTwo possible use cases for this callback is to remove sensitive information\nfrom the state to prevent it from being printed in log files, or to compact\nlarge irrelevant status items that would only clutter the logs.\n\n## Example\n\n    @impl GenServer\n    def format_status(status) do\n      Map.new(status, fn\n        {:state, state} -> {:state, Map.delete(state, :private_key)}\n        {:message, {:password, _}} -> {:message, {:password, "redacted"}}\n        key_value -> key_value\n      end)\n    end\n\n',
    },
    {
      name: "code_change/3",
      type: "callback",
      specs: [],
      documentation:
        "Invoked to change the state of the `GenServer` when a different version of a\nmodule is loaded (hot code swapping) and the state's term structure should be\nchanged.\n\n`old_vsn` is the previous version of the module (defined by the `@vsn`\nattribute) when upgrading. When downgrading the previous version is wrapped in\na 2-tuple with first element `:down`. `state` is the current state of the\n`GenServer` and `extra` is any extra data required to change the state.\n\nReturning `{:ok, new_state}` changes the state to `new_state` and the code\nchange is successful.\n\nReturning `{:error, reason}` fails the code change with reason `reason` and\nthe state remains as the previous state.\n\nIf `c:code_change/3` raises the code change fails and the loop will continue\nwith its previous state. Therefore this callback does not usually contain side effects.\n\nThis callback is optional.\n",
    },
  ],
  macros: [],
  types: [
    {
      name: "from/0",
      type: "type",
      specs: ["@type from() :: {pid(), tag :: term()}"],
      documentation:
        "Tuple describing the client of a call request.\n\n`pid` is the PID of the caller and `tag` is a unique term used to identify the\ncall.\n",
    },
    {
      name: "server/0",
      type: "type",
      specs: ["@type server() :: pid() | name() | {atom(), node()}"],
      documentation:
        'The server reference.\n\nThis is either a plain PID or a value representing a registered name.\nSee the "Name registration" section of this document for more information.\n',
    },
    {
      name: "debug/0",
      type: "type",
      specs: [
        "@type debug() :: [:trace | :log | :statistics | {:log_to_file, Path.t()}]",
      ],
      documentation: "Debug options supported by the `start*` functions",
    },
    {
      name: "option/0",
      type: "type",
      specs: [
        "@type option() ::\n        {:debug, debug()}\n        | {:name, name()}\n        | {:timeout, timeout()}\n        | {:spawn_opt, [Process.spawn_opt()]}\n        | {:hibernate_after, timeout()}",
      ],
      documentation: "Option values used by the `start*` functions",
    },
    {
      name: "options/0",
      type: "type",
      specs: ["@type options() :: [option()]"],
      documentation: "Options used by the `start*` functions",
    },
    {
      name: "name/0",
      type: "type",
      specs: [
        "@type name() :: atom() | {:global, term()} | {:via, module(), term()}",
      ],
      documentation: "The GenServer name",
    },
    {
      name: "on_start/0",
      type: "type",
      specs: [
        "@type on_start() ::\n        {:ok, pid()} | :ignore | {:error, {:already_started, pid()} | term()}",
      ],
      documentation: "Return values of `start*` functions",
    },
  ],
};
