import type { ModuleDoc } from "../types";

export const Port: ModuleDoc = {
  functions: [
    {
      name: "open/2",
      type: "function",
      specs: ["@spec open(name(), list()) :: port()"],
      documentation:
        "Opens a port given a tuple `name` and a list of `options`.\n\nThe module documentation above contains documentation and examples\nfor the supported `name` values, summarized below:\n\n  * `{:spawn, command}` - runs an external program. `command` must contain\n    the program name and optionally a list of arguments separated by space.\n    If passing programs or arguments with space in their name, use the next option.\n  * `{:spawn_executable, filename}` - runs the executable given by the absolute\n    file name `filename`. Arguments can be passed via the `:args` option.\n  * `{:spawn_driver, command}` - spawns so-called port drivers.\n  * `{:fd, fd_in, fd_out}` - accesses file descriptors, `fd_in` and `fd_out`\n    opened by the VM.\n\nFor more information and the list of options, see `:erlang.open_port/2`.\n\nInlined by the compiler.\n",
    },
    {
      name: "monitor/1",
      type: "function",
      specs: [
        "@spec monitor(port() | {name, node()} | name) :: reference() when name: atom()",
      ],
      documentation:
        "Starts monitoring the given `port` from the calling process.\n\nOnce the monitored port process dies, a message is delivered to the\nmonitoring process in the shape of:\n\n    {:DOWN, ref, :port, object, reason}\n\nwhere:\n\n  * `ref` is a monitor reference returned by this function;\n  * `object` is either the `port` being monitored (when monitoring by port ID)\n  or `{name, node}` (when monitoring by a port name);\n  * `reason` is the exit reason.\n\nSee `:erlang.monitor/2` for more information.\n\nInlined by the compiler.\n",
    },
    {
      name: "list/0",
      type: "function",
      specs: ["@spec list() :: [port()]"],
      documentation:
        "Returns a list of all ports in the current node.\n\nInlined by the compiler.\n",
    },
    {
      name: "info/2",
      type: "function",
      specs: ["@spec info(port(), atom()) :: {atom(), term()} | nil"],
      documentation:
        "Returns information about a specific field within\nthe `port` (or `nil` if the port is closed).\n\nFor more information, see `:erlang.port_info/2`.\n",
    },
    {
      name: "info/1",
      type: "function",
      specs: ["@spec info(port()) :: keyword() | nil"],
      documentation:
        "Returns information about the `port` (or `nil` if the port is closed).\n\nFor more information, see `:erlang.port_info/1`.\n",
    },
    {
      name: "demonitor/2",
      type: "function",
      specs: [
        "@spec demonitor(reference(), options :: [:flush | :info]) :: boolean()",
      ],
      documentation:
        "Demonitors the monitor identified by the given `reference`.\n\nIf `monitor_ref` is a reference which the calling process\nobtained by calling `monitor/1`, that monitoring is turned off.\nIf the monitoring is already turned off, nothing happens.\n\nSee `:erlang.demonitor/2` for more information.\n\nInlined by the compiler.\n",
    },
    {
      name: "connect/2",
      type: "function",
      specs: ["@spec connect(port(), pid()) :: true"],
      documentation:
        "Associates the `port` identifier with a `pid`.\n\nFor more information, see `:erlang.port_connect/2`.\n\nInlined by the compiler.\n",
    },
    {
      name: "command/3",
      type: "function",
      specs: [
        "@spec command(port(), iodata(), [:force | :nosuspend]) :: boolean()",
      ],
      documentation:
        "Sends `data` to the port driver `port`.\n\nFor more information, see `:erlang.port_command/3`.\n\nInlined by the compiler.\n",
    },
    {
      name: "close/1",
      type: "function",
      specs: ["@spec close(port()) :: true"],
      documentation:
        "Closes the `port`.\n\nFor more information, see `:erlang.port_close/1`.\n\nInlined by the compiler.\n",
    },
  ],
  name: "Port",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "name/0",
      type: "type",
      specs: [
        "@type name() ::\n        {:spawn, charlist() | binary()}\n        | {:spawn_driver, charlist() | binary()}\n        | {:spawn_executable, :file.name_all()}\n        | {:fd, non_neg_integer(), non_neg_integer()}",
      ],
      documentation: null,
    },
  ],
};
