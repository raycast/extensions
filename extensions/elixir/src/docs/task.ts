import type { ModuleDoc } from "../types";

export const Task: ModuleDoc = {
  functions: [
    {
      name: "yield_many/2",
      type: "function",
      specs: [
        "@spec yield_many([t()], timeout()) :: [\n        {t(), {:ok, term()} | {:exit, term()} | nil}\n      ]",
        "@spec yield_many([t()],\n        limit: pos_integer(),\n        timeout: timeout(),\n        on_timeout: :nothing | :ignore | :kill_task\n      ) :: [{t(), {:ok, term()} | {:exit, term()} | nil}]",
      ],
      documentation:
        "Yields to multiple tasks in the given time interval.\n\nThis function receives a list of tasks and waits for their\nreplies in the given time interval. It returns a list\nof two-element tuples, with the task as the first element\nand the yielded result as the second. The tasks in the returned\nlist will be in the same order as the tasks supplied in the `tasks`\ninput argument.\n\nSimilarly to `yield/2`, each task's result will be\n\n  * `{:ok, term}` if the task has successfully reported its\n    result back in the given time interval\n  * `{:exit, reason}` if the task has died\n  * `nil` if the task keeps running, either because a limit\n    has been reached or past the timeout\n\nCheck `yield/2` for more information.\n\n## Example\n\n`Task.yield_many/2` allows developers to spawn multiple tasks\nand retrieve the results received in a given time frame.\nIf we combine it with `Task.shutdown/2` (or `Task.ignore/1`),\nit allows us to gather those results and cancel (or ignore)\nthe tasks that have not replied in time.\n\nLet's see an example.\n\n    tasks =\n      for i <- 1..10 do\n        Task.async(fn ->\n          Process.sleep(i * 1000)\n          i\n        end)\n      end\n\n    tasks_with_results = Task.yield_many(tasks, timeout: 5000)\n\n    results =\n      Enum.map(tasks_with_results, fn {task, res} ->\n        # Shut down the tasks that did not reply nor exit\n        res || Task.shutdown(task, :brutal_kill)\n      end)\n\n    # Here we are matching only on {:ok, value} and\n    # ignoring {:exit, _} (crashed tasks) and `nil` (no replies)\n    for {:ok, value} <- results do\n      IO.inspect(value)\n    end\n\nIn the example above, we create tasks that sleep from 1\nup to 10 seconds and return the number of seconds they slept for.\nIf you execute the code all at once, you should see 1 up to 5\nprinted, as those were the tasks that have replied in the\ngiven time. All other tasks will have been shut down using\nthe `Task.shutdown/2` call.\n\nAs a convenience, you can achieve a similar behavior to above\nby specifying the `:on_timeout` option to be `:kill_task` (or\n`:ignore`). See `Task.await_many/2` if you would rather exit\nthe caller process on timeout.\n\n## Options\n\nThe second argument is either a timeout or options, which defaults\nto this:\n\n  * `:limit` - the maximum amount of tasks to wait for.\n    If the limit is reached before the timeout, this function\n    returns immediately without triggering the `:on_timeout` behaviour\n\n  * `:timeout` - the maximum amount of time (in milliseconds or `:infinity`)\n    each task is allowed to execute for. Defaults to `5000`.\n\n  * `:on_timeout` - what to do when a task times out. The possible\n    values are:\n    * `:nothing` - do nothing (default). The tasks can still be\n      awaited on, yielded on, ignored, or shut down later.\n    * `:ignore` - the results of the task will be ignored.\n    * `:kill_task` - the task that timed out is killed.\n",
    },
    {
      name: "yield/2",
      type: "function",
      specs: [
        "@spec yield(t(), timeout()) :: {:ok, term()} | {:exit, term()} | nil",
      ],
      documentation:
        'Temporarily blocks the caller process waiting for a task reply.\n\nReturns `{:ok, reply}` if the reply is received, `nil` if\nno reply has arrived, or `{:exit, reason}` if the task has already\nexited. Keep in mind that normally a task failure also causes\nthe process owning the task to exit. Therefore this function can\nreturn `{:exit, reason}` if at least one of the conditions below apply:\n\n  * the task process exited with the reason `:normal`\n  * the task isn\'t linked to the caller (the task was started\n    with `Task.Supervisor.async_nolink/2` or `Task.Supervisor.async_nolink/4`)\n  * the caller is trapping exits\n\nA timeout, in milliseconds or `:infinity`, can be given with a default value\nof `5000`. If the time runs out before a message from the task is received,\nthis function will return `nil` and the monitor will remain active. Therefore\n`yield/2` can be called multiple times on the same task.\n\nThis function assumes the task\'s monitor is still active or the\nmonitor\'s `:DOWN` message is in the message queue. If it has been\ndemonitored or the message already received, this function will wait\nfor the duration of the timeout awaiting the message.\n\nIf you intend to shut the task down if it has not responded within `timeout`\nmilliseconds, you should chain this together with `shutdown/1`, like so:\n\n    case Task.yield(task, timeout) || Task.shutdown(task) do\n      {:ok, result} ->\n        result\n\n      nil ->\n        Logger.warning("Failed to get a result in #{timeout}ms")\n        nil\n    end\n\nIf you intend to check on the task but leave it running after the timeout,\nyou can chain this together with `ignore/1`, like so:\n\n    case Task.yield(task, timeout) || Task.ignore(task) do\n      {:ok, result} ->\n        result\n\n      nil ->\n        Logger.warning("Failed to get a result in #{timeout}ms")\n        nil\n    end\n\nThat ensures that if the task completes after the `timeout` but before `shutdown/1`\nhas been called, you will still get the result, since `shutdown/1` is designed to\nhandle this case and return the result.\n',
    },
    {
      name: "start_link/3",
      type: "function",
      specs: ["@spec start_link(module(), atom(), [term()]) :: {:ok, pid()}"],
      documentation:
        "Starts a task as part of a supervision tree with the given\n`module`, `function`, and `args`.\n\nThis is used to start a statically supervised task under a supervision tree.\n",
    },
    {
      name: "start_link/1",
      type: "function",
      specs: ["@spec start_link((-> any())) :: {:ok, pid()}"],
      documentation:
        "Starts a task as part of a supervision tree with the given `fun`.\n\n`fun` must be a zero-arity anonymous function.\n\nThis is used to start a statically supervised task under a supervision tree.\n",
    },
    {
      name: "start/3",
      type: "function",
      specs: ["@spec start(module(), atom(), [term()]) :: {:ok, pid()}"],
      documentation:
        "Starts a task.\n\nThis should only used when the task is used for side-effects\n(like I/O) and you have no interest on its results nor if it\ncompletes successfully.\n\nIf the current node is shutdown, the node will terminate even\nif the task was not completed. For this reason, we recommend\nto use `Task.Supervisor.start_child/2` instead, which allows\nyou to control the shutdown time via the `:shutdown` option.\n",
    },
    {
      name: "start/1",
      type: "function",
      specs: ["@spec start((-> any())) :: {:ok, pid()}"],
      documentation:
        "Starts a task.\n\n`fun` must be a zero-arity anonymous function.\n\nThis should only used when the task is used for side-effects\n(like I/O) and you have no interest on its results nor if it\ncompletes successfully.\n\nIf the current node is shutdown, the node will terminate even\nif the task was not completed. For this reason, we recommend\nto use `Task.Supervisor.start_child/2` instead, which allows\nyou to control the shutdown time via the `:shutdown` option.\n",
    },
    {
      name: "shutdown/2",
      type: "function",
      specs: [
        "@spec shutdown(t(), timeout() | :brutal_kill) ::\n        {:ok, term()} | {:exit, term()} | nil",
      ],
      documentation:
        "Unlinks and shuts down the task, and then checks for a reply.\n\nReturns `{:ok, reply}` if the reply is received while shutting down the task,\n`{:exit, reason}` if the task died, otherwise `nil`. Once shut down,\nyou can no longer await or yield it.\n\nThe second argument is either a timeout or `:brutal_kill`. In case\nof a timeout, a `:shutdown` exit signal is sent to the task process\nand if it does not exit within the timeout, it is killed. With `:brutal_kill`\nthe task is killed straight away. In case the task terminates abnormally\n(possibly killed by another process), this function will exit with the same reason.\n\nIt is not required to call this function when terminating the caller, unless\nexiting with reason `:normal` or if the task is trapping exits. If the caller is\nexiting with a reason other than `:normal` and the task is not trapping exits, the\ncaller's exit signal will stop the task. The caller can exit with reason\n`:shutdown` to shut down all of its linked processes, including tasks, that\nare not trapping exits without generating any log messages.\n\nIf there is no process linked to the task, such as tasks started by\n`Task.completed/1`, we check for a response or error accordingly, but without\nshutting a process down.\n\nIf a task's monitor has already been demonitored or received and there is not\na response waiting in the message queue this function will return\n`{:exit, :noproc}` as the result or exit reason can not be determined.\n",
    },
    {
      name: "ignore/1",
      type: "function",
      specs: ["@spec ignore(t()) :: {:ok, term()} | {:exit, term()} | nil"],
      documentation:
        "Ignores an existing task.\n\nThis means the task will continue running, but it will be unlinked\nand you can no longer yield, await or shut it down.\n\nReturns `{:ok, reply}` if the reply is received before ignoring the task,\n`{:exit, reason}` if the task died before ignoring it, otherwise `nil`.\n\nImportant: avoid using [`Task.async/1,3`](`async/1`) and then immediately ignoring\nthe task. If you want to start tasks you don't care about their\nresults, use `Task.Supervisor.start_child/2` instead.\n",
    },
    {
      name: "completed/1",
      type: "function",
      specs: ["@spec completed(any()) :: t()"],
      documentation:
        'Starts a task that immediately completes with the given `result`.\n\nUnlike `async/1`, this task does not spawn a linked process. It can\nbe awaited or yielded like any other task.\n\n## Usage\n\nIn some cases, it is useful to create a "completed" task that represents\na task that has already run and generated a result. For example, when\nprocessing data you may be able to determine that certain inputs are\ninvalid before dispatching them for further processing:\n\n    def process(data) do\n      tasks =\n        for entry <- data do\n          if invalid_input?(entry) do\n            Task.completed({:error, :invalid_input})\n          else\n            Task.async(fn -> further_process(entry) end)\n          end\n        end\n\n      Task.await_many(tasks)\n    end\n\nIn many cases, `Task.completed/1` may be avoided in favor of returning the\nresult directly.  You should generally only require this variant when working\nwith mixed asynchrony, when a group of inputs will be handled partially\nsynchronously and partially asynchronously.\n',
    },
    {
      name: "child_spec/1",
      type: "function",
      specs: ["@spec child_spec(term()) :: Supervisor.child_spec()"],
      documentation:
        "Returns a specification to start a task under a supervisor.\n\n`arg` is passed as the argument to `Task.start_link/1` in the `:start` field\nof the spec.\n\nFor more information, see the `Supervisor` module,\nthe `Supervisor.child_spec/2` function and the `t:Supervisor.child_spec/0` type.\n",
    },
    {
      name: "await_many/2",
      type: "function",
      specs: ["@spec await_many([t()], timeout()) :: [term()]"],
      documentation:
        "Awaits replies from multiple tasks and returns them.\n\nThis function receives a list of tasks and waits for their replies in the\ngiven time interval. It returns a list of the results, in the same order as\nthe tasks supplied in the `tasks` input argument.\n\nIf any of the task processes dies, the caller process will exit with the same\nreason as that task.\n\nA timeout, in milliseconds or `:infinity`, can be given with a default value\nof `5000`. If the timeout is exceeded, then the caller process will exit.\nAny task processes that are linked to the caller process (which is the case\nwhen a task is started with `async`) will also exit. Any task processes that\nare trapping exits or not linked to the caller process will continue to run.\n\nThis function assumes the tasks' monitors are still active or the monitor's\n`:DOWN` message is in the message queue. If any tasks have been demonitored,\nor the message already received, this function will wait for the duration of\nthe timeout.\n\nThis function can only be called once for any given task. If you want to be\nable to check multiple times if a long-running task has finished its\ncomputation, use `yield_many/2` instead.\n\n## Compatibility with OTP behaviours\n\nIt is not recommended to `await` long-running tasks inside an OTP behaviour\nsuch as `GenServer`. See `await/2` for more information.\n\n## Examples\n\n    iex> tasks = [\n    ...>   Task.async(fn -> 1 + 1 end),\n    ...>   Task.async(fn -> 2 + 3 end)\n    ...> ]\n    iex> Task.await_many(tasks)\n    [2, 5]\n\n",
    },
    {
      name: "await/2",
      type: "function",
      specs: ["@spec await(t(), timeout()) :: term()"],
      documentation:
        'Awaits a task reply and returns it.\n\nIn case the task process dies, the caller process will exit with the same\nreason as the task.\n\nA timeout, in milliseconds or `:infinity`, can be given with a default value\nof `5000`. If the timeout is exceeded, then the caller process will exit.\nIf the task process is linked to the caller process which is the case when\na task is started with `async`, then the task process will also exit. If the\ntask process is trapping exits or not linked to the caller process, then it\nwill continue to run.\n\nThis function assumes the task\'s monitor is still active or the monitor\'s\n`:DOWN` message is in the message queue. If it has been demonitored, or the\nmessage already received, this function will wait for the duration of the\ntimeout awaiting the message.\n\nThis function can only be called once for any given task. If you want\nto be able to check multiple times if a long-running task has finished\nits computation, use `yield/2` instead.\n\n## Examples\n\n    iex> task = Task.async(fn -> 1 + 1 end)\n    iex> Task.await(task)\n    2\n\n## Compatibility with OTP behaviours\n\nIt is not recommended to `await` a long-running task inside an OTP\nbehaviour such as `GenServer`. Instead, you should match on the message\ncoming from a task inside your `c:GenServer.handle_info/2` callback.\n\nA GenServer will receive two messages on `handle_info/2`:\n\n  * `{ref, result}` - the reply message where `ref` is the monitor\n    reference returned by the `task.ref` and `result` is the task\n    result\n\n  * `{:DOWN, ref, :process, pid, reason}` - since all tasks are also\n    monitored, you will also receive the `:DOWN` message delivered by\n    `Process.monitor/1`. If you receive the `:DOWN` message without a\n    a reply, it means the task crashed\n\nAnother consideration to have in mind is that tasks started by `Task.async/1`\nare always linked to their callers and you may not want the GenServer to\ncrash if the task crashes. Therefore, it is preferable to instead use\n`Task.Supervisor.async_nolink/3` inside OTP behaviours. For completeness, here\nis an example of a GenServer that start tasks and handles their results:\n\n    defmodule GenServerTaskExample do\n      use GenServer\n\n      def start_link(opts) do\n        GenServer.start_link(__MODULE__, :ok, opts)\n      end\n\n      def init(_opts) do\n        # We will keep all running tasks in a map\n        {:ok, %{tasks: %{}}}\n      end\n\n      # Imagine we invoke a task from the GenServer to access a URL...\n      def handle_call(:some_message, _from, state) do\n        url = ...\n        task = Task.Supervisor.async_nolink(MyApp.TaskSupervisor, fn -> fetch_url(url) end)\n\n        # After we start the task, we store its reference and the url it is fetching\n        state = put_in(state.tasks[task.ref], url)\n\n        {:reply, :ok, state}\n      end\n\n      # If the task succeeds...\n      def handle_info({ref, result}, state) do\n        # The task succeed so we can demonitor its reference\n        Process.demonitor(ref, [:flush])\n\n        {url, state} = pop_in(state.tasks[ref])\n        IO.puts "Got #{inspect(result)} for URL #{inspect url}"\n        {:noreply, state}\n      end\n\n      # If the task fails...\n      def handle_info({:DOWN, ref, _, _, reason}, state) do\n        {url, state} = pop_in(state.tasks[ref])\n        IO.puts "URL #{inspect url} failed with reason #{inspect(reason)}"\n        {:noreply, state}\n      end\n    end\n\nWith the server defined, you will want to start the task supervisor\nabove and the GenServer in your supervision tree:\n\n    children = [\n      {Task.Supervisor, name: MyApp.TaskSupervisor},\n      {GenServerTaskExample, name: MyApp.GenServerTaskExample}\n    ]\n\n    Supervisor.start_link(children, strategy: :one_for_one)\n\n',
    },
    {
      name: "async_stream/5",
      type: "function",
      specs: [
        "@spec async_stream(Enumerable.t(), module(), atom(), [term()], [\n        async_stream_option()\n      ]) :: Enumerable.t()",
      ],
      documentation:
        "Returns a stream where the given function (`module` and `function_name`)\nis mapped concurrently on each element in `enumerable`.\n\nEach element of `enumerable` will be prepended to the given `args` and\nprocessed by its own task. Those tasks will be linked to an intermediate\nprocess that is then linked to the caller process. This means a failure\nin a task terminates the caller process and a failure in the caller\nprocess terminates all tasks.\n\nWhen streamed, each task will emit `{:ok, value}` upon successful\ncompletion or `{:exit, reason}` if the caller is trapping exits.\nIt's possible to have `{:exit, {element, reason}}` for exits\nusing the `:zip_input_on_exit` option. The order of results depends\non the value of the `:ordered` option.\n\nThe level of concurrency and the time tasks are allowed to run can\nbe controlled via options (see the \"Options\" section below).\n\nConsider using `Task.Supervisor.async_stream/6` to start tasks\nunder a supervisor. If you find yourself trapping exits to ensure\nerrors in the tasks do not terminate the caller process, consider\nusing `Task.Supervisor.async_stream_nolink/6` to start tasks that\nare not linked to the caller process.\n\n## Options\n\n  * `:max_concurrency` - sets the maximum number of tasks to run\n    at the same time. Defaults to `System.schedulers_online/0`.\n\n  * `:ordered` - whether the results should be returned in the same order\n    as the input stream. When the output is ordered, Elixir may need to\n    buffer results to emit them in the original order. Setting this option\n    to false disables the need to buffer at the cost of removing ordering.\n    This is also useful when you're using the tasks only for the side effects.\n    Note that regardless of what `:ordered` is set to, the tasks will\n    process asynchronously. If you need to process elements in order,\n    consider using `Enum.map/2` or `Enum.each/2` instead. Defaults to `true`.\n\n  * `:timeout` - the maximum amount of time (in milliseconds or `:infinity`)\n    each task is allowed to execute for. Defaults to `5000`.\n\n  * `:on_timeout` - what to do when a task times out. The possible\n    values are:\n    * `:exit` (default) - the caller (the process that spawned the tasks) exits.\n    * `:kill_task` - the task that timed out is killed. The value\n      emitted for that task is `{:exit, :timeout}`.\n\n  * `:zip_input_on_exit` - (since v1.14.0) adds the original\n    input to `:exit` tuples. The value emitted for that task is\n    `{:exit, {input, reason}}`, where `input` is the collection element\n    that caused an exited during processing. Defaults to `false`.\n\n## Example\n\nLet's build a stream and then enumerate it:\n\n    stream = Task.async_stream(collection, Mod, :expensive_fun, [])\n    Enum.to_list(stream)\n\nThe concurrency can be increased or decreased using the `:max_concurrency`\noption. For example, if the tasks are IO heavy, the value can be increased:\n\n    max_concurrency = System.schedulers_online() * 2\n    stream = Task.async_stream(collection, Mod, :expensive_fun, [], max_concurrency: max_concurrency)\n    Enum.to_list(stream)\n\nIf you do not care about the results of the computation, you can run\nthe stream with `Stream.run/1`. Also set `ordered: false`, as you don't\ncare about the order of the results either:\n\n    stream = Task.async_stream(collection, Mod, :expensive_fun, [], ordered: false)\n    Stream.run(stream)\n\n## First async tasks to complete\n\nYou can also use `async_stream/3` to execute M tasks and find the N tasks\nto complete. For example:\n\n    [\n      &heavy_call_1/0,\n      &heavy_call_2/0,\n      &heavy_call_3/0\n    ]\n    |> Task.async_stream(fn fun -> fun.() end, ordered: false, max_concurrency: 3)\n    |> Stream.filter(&match?({:ok, _}, &1))\n    |> Enum.take(2)\n\nIn the example above, we are executing three tasks and waiting for the\nfirst 2 to complete. We use `Stream.filter/2` to restrict ourselves only\nto successfully completed tasks, and then use `Enum.take/2` to retrieve\nN items. Note it is important to set both `ordered: false` and\n`max_concurrency: M`, where M is the number of tasks, to make sure all\ncalls execute concurrently.\n\n### Attention: unbound async + take\n\nIf you want to potentially process a high number of items and keep only\npart of the results, you may end-up processing more items than desired.\nLet's see an example:\n\n    1..100\n    |> Task.async_stream(fn i ->\n      Process.sleep(100)\n      IO.puts(to_string(i))\n    end)\n    |> Enum.take(10)\n\nRunning the example above in a machine with 8 cores will process 16 items,\neven though you want only 10 elements, since `async_stream/3` process items\nconcurrently. That's because it will process 8 elements at once. Then all 8\nelements complete at roughly the same time, causing 8 elements to be kicked\noff for processing. Out of these extra 8, only 2 will be used, and the rest\nwill be terminated.\n\nDepending on the problem, you can filter or limit the number of elements\nupfront:\n\n    1..100\n    |> Stream.take(10)\n    |> Task.async_stream(fn i ->\n      Process.sleep(100)\n      IO.puts(to_string(i))\n    end)\n    |> Enum.to_list()\n\nIn other cases, you likely want to tweak `:max_concurrency` to limit how\nmany elements may be over processed at the cost of reducing concurrency.\nYou can also set the number of elements to take to be a multiple of\n`:max_concurrency`. For instance, setting `max_concurrency: 5` in the\nexample above.\n",
    },
    {
      name: "async_stream/3",
      type: "function",
      specs: [
        "@spec async_stream(Enumerable.t(), (term() -> term()), [async_stream_option()]) ::\n        Enumerable.t()",
      ],
      documentation:
        'Returns a stream that runs the given function `fun` concurrently\non each element in `enumerable`.\n\nWorks the same as `async_stream/5` but with an anonymous function instead of a\nmodule-function-arguments tuple. `fun` must be a one-arity anonymous function.\n\nEach `enumerable` element is passed as argument to the given function `fun` and\nprocessed by its own task. The tasks will be linked to the caller process, similarly\nto `async/1`.\n\n## Example\n\nCount the code points in each string asynchronously, then add the counts together using reduce.\n\n    iex> strings = ["long string", "longer string", "there are many of these"]\n    iex> stream = Task.async_stream(strings, fn text -> text |> String.codepoints() |> Enum.count() end)\n    iex> Enum.reduce(stream, 0, fn {:ok, num}, acc -> num + acc end)\n    47\n\nSee `async_stream/5` for discussion, options, and more examples.\n',
    },
    {
      name: "async/3",
      type: "function",
      specs: ["@spec async(module(), atom(), [term()]) :: t()"],
      documentation:
        "Starts a task that must be awaited on.\n\nSimilar to `async/1` except the function to be started is\nspecified by the given `module`, `function_name`, and `args`.\nThe `module`, `function_name`, and its arity are stored as\na tuple in the `:mfa` field for reflection purposes.\n",
    },
    {
      name: "async/1",
      type: "function",
      specs: ["@spec async((-> any())) :: t()"],
      documentation:
        "Starts a task that must be awaited on.\n\n`fun` must be a zero-arity anonymous function. This function\nspawns a process that is linked to and monitored by the caller\nprocess. A `Task` struct is returned containing the relevant\ninformation.\n\nIf you start an `async`, you **must await**. This is either done\nby calling `Task.await/2` or `Task.yield/2` followed by\n`Task.shutdown/2` on the returned task. Alternatively, if you\nspawn a task inside a `GenServer`, then the `GenServer` will\nautomatically await for you and call `c:GenServer.handle_info/2`\nwith the task response and associated `:DOWN` message.\n\nRead the `Task` module documentation for more information about\nthe general usage of async tasks.\n\n## Linking\n\nThis function spawns a process that is linked to and monitored\nby the caller process. The linking part is important because it\naborts the task if the parent process dies. It also guarantees\nthe code before async/await has the same properties after you\nadd the async call. For example, imagine you have this:\n\n    x = heavy_fun()\n    y = some_fun()\n    x + y\n\nNow you want to make the `heavy_fun()` async:\n\n    x = Task.async(&heavy_fun/0)\n    y = some_fun()\n    Task.await(x) + y\n\nAs before, if `heavy_fun/0` fails, the whole computation will\nfail, including the caller process. If you don't want the task\nto fail then you must change the `heavy_fun/0` code in the\nsame way you would achieve it if you didn't have the async call.\nFor example, to either return `{:ok, val} | :error` results or,\nin more extreme cases, by using `try/rescue`. In other words,\nan asynchronous task should be thought of as an extension of the\ncaller process rather than a mechanism to isolate it from all errors.\n\nIf you don't want to link the caller to the task, then you\nmust use a supervised task with `Task.Supervisor` and call\n`Task.Supervisor.async_nolink/2`.\n\nIn any case, avoid any of the following:\n\n  * Setting `:trap_exit` to `true` - trapping exits should be\n    used only in special circumstances as it would make your\n    process immune to not only exits from the task but from\n    any other processes.\n\n    Moreover, even when trapping exits, calling `await` will\n    still exit if the task has terminated without sending its\n    result back.\n\n  * Unlinking the task process started with `async`/`await`.\n    If you unlink the processes and the task does not belong\n    to any supervisor, you may leave dangling tasks in case\n    the caller process dies.\n\n## Metadata\n\nThe task created with this function stores `:erlang.apply/2` in\nits `:mfa` metadata field, which is used internally to apply\nthe anonymous function. Use `async/3` if you want another function\nto be used as metadata.\n",
    },
    {
      name: "__struct__/0",
      type: "function",
      specs: [],
      documentation:
        "The Task struct.\n\nIt contains these fields:\n\n  * `:mfa` - a three-element tuple containing the module, function name,\n    and arity invoked to start the task in `async/1` and `async/3`\n\n  * `:owner` - the PID of the process that started the task\n\n  * `:pid` - the PID of the task process; `nil` if there is no process\n    specifically assigned for the task\n\n  * `:ref` - an opaque term used as the task monitor reference\n\n",
    },
  ],
  name: "Task",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "ref/0",
      type: "type",
      specs: ["@opaque ref()"],
      documentation: "The task opaque reference.\n",
    },
    {
      name: "async_stream_option/0",
      type: "type",
      specs: [
        "@type async_stream_option() ::\n        {:max_concurrency, pos_integer()}\n        | {:ordered, boolean()}\n        | {:timeout, timeout()}\n        | {:on_timeout, :exit | :kill_task}\n        | {:zip_input_on_exit, boolean()}",
      ],
      documentation: "Options given to `async_stream` functions.\n",
    },
    {
      name: "t/0",
      type: "type",
      specs: [
        "@type t() :: %Task{mfa: mfa(), owner: pid(), pid: pid() | nil, ref: ref()}",
      ],
      documentation:
        "The Task type.\n\nSee [`%Task{}`](`__struct__/0`) for information about each field of the structure.\n",
    },
  ],
};
