import type { ModuleDoc } from "../types";

export const Task_Supervisor: ModuleDoc = {
  functions: [
    {
      name: "terminate_child/2",
      type: "function",
      specs: [
        "@spec terminate_child(Supervisor.supervisor(), pid()) ::\n        :ok | {:error, :not_found}",
      ],
      documentation: "Terminates the child with the given `pid`.\n",
    },
    {
      name: "start_link/1",
      type: "function",
      specs: ["@spec start_link([option()]) :: Supervisor.on_start()"],
      documentation:
        "Starts a new supervisor.\n\n## Examples\n\nA task supervisor is typically started under a supervision tree using\nthe tuple format:\n\n    {Task.Supervisor, name: MyApp.TaskSupervisor}\n\nYou can also start it by calling `start_link/1` directly:\n\n    Task.Supervisor.start_link(name: MyApp.TaskSupervisor)\n\nBut this is recommended only for scripting and should be avoided in\nproduction code. Generally speaking, processes should always be started\ninside supervision trees.\n\n## Options\n\n  * `:name` - used to register a supervisor name, the supported values are\n    described under the `Name Registration` section in the `GenServer` module\n    docs;\n\n  * `:max_restarts`, `:max_seconds`, and `:max_children` - as specified in\n    `DynamicSupervisor`;\n\nThis function could also receive `:restart` and `:shutdown` as options\nbut those two options have been deprecated and it is now preferred to\ngive them directly to `start_child`.\n",
    },
    {
      name: "start_child/5",
      type: "function",
      specs: [
        "@spec start_child(\n        Supervisor.supervisor(),\n        module(),\n        atom(),\n        [term()],\n        keyword()\n      ) :: DynamicSupervisor.on_start_child()",
      ],
      documentation:
        "Starts a task as a child of the given `supervisor`.\n\nSimilar to `start_child/3` except the task is specified\nby the given `module`, `fun` and `args`.\n",
    },
    {
      name: "start_child/3",
      type: "function",
      specs: [
        "@spec start_child(Supervisor.supervisor(), (-> any()), keyword()) ::\n        DynamicSupervisor.on_start_child()",
      ],
      documentation:
        'Starts a task as a child of the given `supervisor`.\n\n    Task.Supervisor.start_child(MyTaskSupervisor, fn ->\n      IO.puts "I am running in a task"\n    end)\n\nNote that the spawned process is not linked to the caller, but\nonly to the supervisor. This command is useful in case the\ntask needs to perform side-effects (like I/O) and you have no\ninterest in its results nor if it completes successfully.\n\n## Options\n\n  * `:restart` - the restart strategy, may be `:temporary` (the default),\n    `:transient` or `:permanent`. `:temporary` means the task is never\n    restarted, `:transient` means it is restarted if the exit is not\n    `:normal`, `:shutdown` or `{:shutdown, reason}`. A `:permanent` restart\n    strategy means it is always restarted.\n\n  * `:shutdown` - `:brutal_kill` if the task must be killed directly on shutdown\n    or an integer indicating the timeout value, defaults to 5000 milliseconds.\n    The task must trap exits for the timeout to have an effect.\n\n',
    },
    {
      name: "children/1",
      type: "function",
      specs: ["@spec children(Supervisor.supervisor()) :: [pid()]"],
      documentation:
        "Returns all children PIDs except those that are restarting.\n\nNote that calling this function when supervising a large number\nof children under low memory conditions can cause an out of memory\nexception.\n",
    },
    {
      name: "async_stream_nolink/6",
      type: "function",
      specs: [
        "@spec async_stream_nolink(\n        Supervisor.supervisor(),\n        Enumerable.t(),\n        module(),\n        atom(),\n        [term()],\n        [async_stream_option()]\n      ) :: Enumerable.t()",
      ],
      documentation:
        "Returns a stream where the given function (`module` and `function`)\nis mapped concurrently on each element in `enumerable`.\n\nEach element in `enumerable` will be prepended to the given `args` and processed\nby its own task. The tasks will be spawned under the given `supervisor` and\nwill not be linked to the caller process, similarly to `async_nolink/5`.\n\nSee `async_stream/6` for discussion, options, and examples.\n",
    },
    {
      name: "async_stream_nolink/4",
      type: "function",
      specs: [
        "@spec async_stream_nolink(\n        Supervisor.supervisor(),\n        Enumerable.t(),\n        (term() -> term()),\n        [async_stream_option()]\n      ) :: Enumerable.t()",
      ],
      documentation:
        'Returns a stream that runs the given `function` concurrently on each\nelement in `enumerable`.\n\nEach element in `enumerable` is passed as argument to the given function `fun`\nand processed by its own task. The tasks will be spawned under the given\n`supervisor` and will not be linked to the caller process, similarly\nto `async_nolink/3`.\n\nSee `async_stream/6` for discussion and examples.\n\n## Error handling and cleanup\n\nEven if tasks are not linked to the caller, there is no risk of leaving dangling tasks\nrunning after the stream halts.\n\nConsider the following example:\n\n    Task.Supervisor.async_stream_nolink(MySupervisor, collection, fun, on_timeout: :kill_task, ordered: false)\n    |> Enum.each(fn\n      {:ok, _} -> :ok\n      {:exit, reason} -> raise "Task exited: #{Exception.format_exit(reason)}"\n    end)\n\nIf one task raises or times out:\n\n  1. the second clause gets called\n  2. an exception is raised\n  3. the stream halts\n  4. all ongoing tasks will be shut down\n\nHere is another example:\n\n    Task.Supervisor.async_stream_nolink(MySupervisor, collection, fun, on_timeout: :kill_task, ordered: false)\n    |> Stream.filter(&match?({:ok, _}, &1))\n    |> Enum.take(3)\n\nThis will return the three first tasks to succeed, ignoring timeouts and errors, and shut down\nevery ongoing task.\n\nJust running the stream with `Stream.run/1` on the other hand would ignore errors and process the whole stream.\n\n',
    },
    {
      name: "async_stream/6",
      type: "function",
      specs: [
        "@spec async_stream(\n        Supervisor.supervisor(),\n        Enumerable.t(),\n        module(),\n        atom(),\n        [term()],\n        [async_stream_option()]\n      ) :: Enumerable.t()",
      ],
      documentation:
        "Returns a stream where the given function (`module` and `function`)\nis mapped concurrently on each element in `enumerable`.\n\nEach element will be prepended to the given `args` and processed by its\nown task. The tasks will be spawned under the given `supervisor` and\nlinked to the caller process, similarly to `async/5`.\n\nWhen streamed, each task will emit `{:ok, value}` upon successful\ncompletion or `{:exit, reason}` if the caller is trapping exits.\nThe order of results depends on the value of the `:ordered` option.\n\nThe level of concurrency and the time tasks are allowed to run can\nbe controlled via options (see the \"Options\" section below).\n\nIf you find yourself trapping exits to handle exits inside\nthe async stream, consider using `async_stream_nolink/6` to start tasks\nthat are not linked to the calling process.\n\n## Options\n\n  * `:max_concurrency` - sets the maximum number of tasks to run\n    at the same time. Defaults to `System.schedulers_online/0`.\n\n  * `:ordered` - whether the results should be returned in the same order\n    as the input stream. This option is useful when you have large\n    streams and don't want to buffer results before they are delivered.\n    This is also useful when you're using the tasks for side effects.\n    Defaults to `true`.\n\n  * `:timeout` - the maximum amount of time to wait (in milliseconds)\n    without receiving a task reply (across all running tasks).\n    Defaults to `5000`.\n\n  * `:on_timeout` - what do to when a task times out. The possible\n    values are:\n    * `:exit` (default) - the process that spawned the tasks exits.\n    * `:kill_task` - the task that timed out is killed. The value\n      emitted for that task is `{:exit, :timeout}`.\n\n  * `:zip_input_on_exit` - (since v1.14.0) adds the original\n    input to `:exit` tuples. The value emitted for that task is\n    `{:exit, {input, reason}}`, where `input` is the collection element\n    that caused an exited during processing. Defaults to `false`.\n\n  * `:shutdown` - `:brutal_kill` if the tasks must be killed directly on shutdown\n    or an integer indicating the timeout value. Defaults to `5000` milliseconds.\n    The tasks must trap exits for the timeout to have an effect.\n\n## Examples\n\nLet's build a stream and then enumerate it:\n\n    stream = Task.Supervisor.async_stream(MySupervisor, collection, Mod, :expensive_fun, [])\n    Enum.to_list(stream)\n\n",
    },
    {
      name: "async_stream/4",
      type: "function",
      specs: [
        "@spec async_stream(\n        Supervisor.supervisor(),\n        Enumerable.t(),\n        (term() -> term()),\n        [async_stream_option()]\n      ) :: Enumerable.t()",
      ],
      documentation:
        "Returns a stream that runs the given function `fun` concurrently\non each element in `enumerable`.\n\nEach element in `enumerable` is passed as argument to the given function `fun`\nand processed by its own task. The tasks will be spawned under the given\n`supervisor` and linked to the caller process, similarly to `async/3`.\n\nSee `async_stream/6` for discussion, options, and examples.\n",
    },
    {
      name: "async_nolink/5",
      type: "function",
      specs: [
        "@spec async_nolink(\n        Supervisor.supervisor(),\n        module(),\n        atom(),\n        [term()],\n        Keyword.t()\n      ) :: Task.t()",
      ],
      documentation:
        "Starts a task that can be awaited on.\n\nThe `supervisor` must be a reference as defined in `Supervisor`.\nThe task won't be linked to the caller, see `Task.async/1` for\nmore information.\n\nRaises an error if `supervisor` has reached the maximum number of\nchildren.\n\nNote this function requires the task supervisor to have `:temporary`\nas the `:restart` option (the default), as `async_nolink/5` keeps a\ndirect reference to the task which is lost if the task is restarted.\n",
    },
    {
      name: "async_nolink/3",
      type: "function",
      specs: [
        "@spec async_nolink(Supervisor.supervisor(), (-> any()), Keyword.t()) :: Task.t()",
      ],
      documentation:
        "Starts a task that can be awaited on.\n\nThe `supervisor` must be a reference as defined in `Supervisor`.\nThe task won't be linked to the caller, see `Task.async/1` for\nmore information.\n\nRaises an error if `supervisor` has reached the maximum number of\nchildren.\n\nNote this function requires the task supervisor to have `:temporary`\nas the `:restart` option (the default), as `async_nolink/3` keeps a\ndirect reference to the task which is lost if the task is restarted.\n\n## Options\n\n  * `:shutdown` - `:brutal_kill` if the tasks must be killed directly on shutdown\n    or an integer indicating the timeout value, defaults to 5000 milliseconds.\n    The tasks must trap exits for the timeout to have an effect.\n\n## Compatibility with OTP behaviours\n\nIf you create a task using `async_nolink` inside an OTP behaviour\nlike `GenServer`, you should match on the message coming from the\ntask inside your `c:GenServer.handle_info/2` callback.\n\nThe reply sent by the task will be in the format `{ref, result}`,\nwhere `ref` is the monitor reference held by the task struct\nand `result` is the return value of the task function.\n\nKeep in mind that, regardless of how the task created with `async_nolink`\nterminates, the caller's process will always receive a `:DOWN` message\nwith the same `ref` value that is held by the task struct. If the task\nterminates normally, the reason in the `:DOWN` message will be `:normal`.\n\n## Examples\n\nTypically, you use `async_nolink/3` when there is a reasonable expectation that\nthe task may fail, and you don't want it to take down the caller. Let's see an\nexample where a `GenServer` is meant to run a single task and track its status:\n\n    defmodule MyApp.Server do\n      use GenServer\n\n      # ...\n\n      def start_task do\n        GenServer.call(__MODULE__, :start_task)\n      end\n\n      # In this case the task is already running, so we just return :ok.\n      def handle_call(:start_task, _from, %{ref: ref} = state) when is_reference(ref) do\n        {:reply, :ok, state}\n      end\n\n      # The task is not running yet, so let's start it.\n      def handle_call(:start_task, _from, %{ref: nil} = state) do\n        task =\n          Task.Supervisor.async_nolink(MyApp.TaskSupervisor, fn ->\n            ...\n          end)\n\n        # We return :ok and the server will continue running\n        {:reply, :ok, %{state | ref: task.ref}}\n      end\n\n      # The task completed successfully\n      def handle_info({ref, answer}, %{ref: ref} = state) do\n        # We don't care about the DOWN message now, so let's demonitor and flush it\n        Process.demonitor(ref, [:flush])\n        # Do something with the result and then return\n        {:noreply, %{state | ref: nil}}\n      end\n\n      # The task failed\n      def handle_info({:DOWN, ref, :process, _pid, _reason}, %{ref: ref} = state) do\n        # Log and possibly restart the task...\n        {:noreply, %{state | ref: nil}}\n      end\n    end\n\n",
    },
    {
      name: "async/5",
      type: "function",
      specs: [
        "@spec async(Supervisor.supervisor(), module(), atom(), [term()], Keyword.t()) ::\n        Task.t()",
      ],
      documentation:
        "Starts a task that can be awaited on.\n\nThe `supervisor` must be a reference as defined in `Supervisor`.\nThe task will still be linked to the caller, see `Task.async/1` for\nmore information and `async_nolink/3` for a non-linked variant.\n\nRaises an error if `supervisor` has reached the maximum number of\nchildren.\n\n## Options\n\n  * `:shutdown` - `:brutal_kill` if the tasks must be killed directly on shutdown\n    or an integer indicating the timeout value, defaults to 5000 milliseconds.\n    The tasks must trap exits for the timeout to have an effect.\n\n",
    },
    {
      name: "async/3",
      type: "function",
      specs: [
        "@spec async(Supervisor.supervisor(), (-> any()), Keyword.t()) :: Task.t()",
      ],
      documentation:
        "Starts a task that can be awaited on.\n\nThe `supervisor` must be a reference as defined in `Supervisor`.\nThe task will still be linked to the caller, see `Task.async/1` for\nmore information and `async_nolink/3` for a non-linked variant.\n\nRaises an error if `supervisor` has reached the maximum number of\nchildren.\n\n## Options\n\n  * `:shutdown` - `:brutal_kill` if the tasks must be killed directly on shutdown\n    or an integer indicating the timeout value, defaults to 5000 milliseconds.\n    The tasks must trap exits for the timeout to have an effect.\n\n",
    },
  ],
  name: "Task.Supervisor",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "async_stream_option/0",
      type: "type",
      specs: [
        "@type async_stream_option() ::\n        Task.async_stream_option() | {:shutdown, Supervisor.shutdown()}",
      ],
      documentation:
        "Options given to `async_stream` and `async_stream_nolink` functions.\n",
    },
    {
      name: "option/0",
      type: "type",
      specs: [
        "@type option() :: DynamicSupervisor.option() | DynamicSupervisor.init_option()",
      ],
      documentation: "Option values used by `start_link`",
    },
  ],
};
