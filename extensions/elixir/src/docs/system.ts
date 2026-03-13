import type { ModuleDoc } from "../types";

export const System: ModuleDoc = {
  functions: [
    {
      name: "version/0",
      type: "function",
      specs: ["@spec version() :: String.t()"],
      documentation:
        "Elixir version information.\n\nReturns Elixir's version as binary.\n",
    },
    {
      name: "user_home!/0",
      type: "function",
      specs: ["@spec user_home!() :: String.t()"],
      documentation:
        "User home directory, exception on error.\n\nSame as `user_home/0` but raises `RuntimeError`\ninstead of returning `nil` if no user home is set.\n",
    },
    {
      name: "user_home/0",
      type: "function",
      specs: ["@spec user_home() :: String.t() | nil"],
      documentation:
        "User home directory.\n\nReturns the user home directory (platform independent).\n",
    },
    {
      name: "untrap_signal/2",
      type: "function",
      specs: [
        "@spec untrap_signal(signal(), id) :: :ok | {:error, :not_found} when id: term()",
      ],
      documentation: "Removes a previously registered `signal` with `id`.\n",
    },
    {
      name: "unique_integer/1",
      type: "function",
      specs: ["@spec unique_integer([:positive | :monotonic]) :: integer()"],
      documentation:
        'Generates and returns an integer that is unique in the current runtime\ninstance.\n\n"Unique" means that this function, called with the same list of `modifiers`,\nwill never return the same integer more than once on the current runtime\ninstance.\n\nIf `modifiers` is `[]`, then a unique integer (that can be positive or negative) is returned.\nOther modifiers can be passed to change the properties of the returned integer:\n\n  * `:positive` - the returned integer is guaranteed to be positive.\n  * `:monotonic` - the returned integer is monotonically increasing. This\n    means that, on the same runtime instance (but even on different\n    processes), integers returned using the `:monotonic` modifier will always\n    be strictly less than integers returned by successive calls with the\n    `:monotonic` modifier.\n\nAll modifiers listed above can be combined; repeated modifiers in `modifiers`\nwill be ignored.\n\nInlined by the compiler.\n',
    },
    {
      name: "trap_signal/3",
      type: "function",
      specs: [
        "@spec trap_signal(signal(), id, (-> :ok)) ::\n        {:ok, id} | {:error, :already_registered} | {:error, :not_sup}\n      when id: term()",
      ],
      documentation:
        "Traps the given `signal` to execute the `fun`.\n\n> #### Avoid setting traps in libraries {: .warning}\n>\n> Trapping signals may have strong implications\n> on how a system shuts down and behaves in production and\n> therefore it is extremely discouraged for libraries to\n> set their own traps. Instead, they should redirect users\n> to configure them themselves. The only cases where it is\n> acceptable for libraries to set their own traps is when\n> using Elixir in script mode, such as in `.exs` files and\n> via Mix tasks.\n\nAn optional `id` that uniquely identifies the function\ncan be given, otherwise a unique one is automatically\ngenerated. If a previously registered `id` is given,\nthis function returns an error tuple. The `id` can be\nused to remove a registered signal by calling\n`untrap_signal/2`.\n\nThe given `fun` receives no arguments and it must return\n`:ok`.\n\nIt returns `{:ok, id}` in case of success,\n`{:error, :already_registered}` in case the id has already\nbeen registered for the given signal, or `{:error, :not_sup}`\nin case trapping exists is not supported by the current OS.\n\nThe first time a signal is trapped, it will override the\ndefault behavior from the operating system. If the same\nsignal is trapped multiple times, subsequent functions\ngiven to `trap_signal` will execute *first*. In other\nwords, you can consider each function is prepended to\nthe signal handler.\n\nBy default, the Erlang VM register traps to the three\nsignals:\n\n  * `:sigstop` - gracefully shuts down the VM with `stop/0`\n  * `:sigquit` - halts the VM via `halt/0`\n  * `:sigusr1` - halts the VM via status code of 1\n\nTherefore, if you add traps to the signals above, the\ndefault behavior above will be executed after all user\nsignals.\n\n## Implementation notes\n\nAll signals run from a single process. Therefore, blocking the\n`fun` will block subsequent traps. It is also not possible to add\nor remove traps from within a trap itself.\n\nInternally, this functionality is built on top of `:os.set_signal/2`.\nWhen you register a trap, Elixir automatically sets it to `:handle`\nand it reverts it back to `:default` once all traps are removed\n(except for `:sigquit`, `:sigterm`, and `:sigusr1` which are always\nhandled). If you or a library call `:os.set_signal/2` directly,\nit may disable Elixir traps (or Elixir may override your configuration).\n",
    },
    {
      name: "tmp_dir!/0",
      type: "function",
      specs: ["@spec tmp_dir!() :: String.t()"],
      documentation:
        "Writable temporary directory, exception on error.\n\nSame as `tmp_dir/0` but raises `RuntimeError`\ninstead of returning `nil` if no temp dir is set.\n",
    },
    {
      name: "tmp_dir/0",
      type: "function",
      specs: ["@spec tmp_dir() :: String.t() | nil"],
      documentation:
        "Writable temporary directory.\n\nReturns a writable temporary directory.\nSearches for directories in the following order:\n\n  1. the directory named by the TMPDIR environment variable\n  2. the directory named by the TEMP environment variable\n  3. the directory named by the TMP environment variable\n  4. `C:\\TMP` on Windows or `/tmp` on Unix-like operating systems\n  5. as a last resort, the current working directory\n\nReturns `nil` if none of the above are writable.\n",
    },
    {
      name: "time_offset/1",
      type: "function",
      specs: ["@spec time_offset(time_unit() | :native) :: integer()"],
      documentation:
        "Returns the current time offset between the Erlang VM monotonic\ntime and the Erlang VM system time.\n\nThe result is returned in the given time unit `unit`. The returned\noffset, added to an Erlang monotonic time (for instance, one obtained with\n`monotonic_time/1`), gives the Erlang system time that corresponds\nto that monotonic time.\n",
    },
    {
      name: "time_offset/0",
      type: "function",
      specs: ["@spec time_offset() :: integer()"],
      documentation:
        "Returns the current time offset between the Erlang VM monotonic\ntime and the Erlang VM system time.\n\nThe result is returned in the `:native` time unit.\n\nSee `time_offset/1` for more information.\n\nInlined by the compiler.\n",
    },
    {
      name: "system_time/1",
      type: "function",
      specs: ["@spec system_time(time_unit() | :native) :: integer()"],
      documentation:
        "Returns the current system time in the given time unit.\n\nIt is the VM view of the `os_time/0`. They may not match in\ncase of time warps although the VM works towards aligning\nthem. This time is not monotonic.\n",
    },
    {
      name: "system_time/0",
      type: "function",
      specs: ["@spec system_time() :: integer()"],
      documentation:
        "Returns the current system time in the `:native` time unit.\n\nIt is the VM view of the `os_time/0`. They may not match in\ncase of time warps although the VM works towards aligning\nthem. This time is not monotonic.\n\nInlined by the compiler.\n",
    },
    {
      name: "stop/1",
      type: "function",
      specs: ["@spec stop(non_neg_integer() | binary()) :: :ok"],
      documentation:
        "Asynchronously and carefully stops the Erlang runtime system.\n\nAll applications are taken down smoothly, all code is unloaded, and all ports\nare closed before the system terminates by calling `halt/1`.\n\n`status` must be a non-negative integer or a binary.\n\n  * If an integer, the runtime system exits with the integer value which is\n    returned to the operating system. On many platforms, only the status codes\n    0-255 are supported by the operating system.\n\n  * If a binary, an Erlang crash dump is produced with status as slogan, and\n    then the runtime system exits with status code 1.\n\nNote this function is asynchronous and the current process will continue\nexecuting after this function is invoked. In case you want to block the\ncurrent process until the system effectively shuts down, you can invoke\n`Process.sleep(:infinity)`.\n\n## Examples\n\n    System.stop(0)\n    System.stop(1)\n\n",
    },
    {
      name: "stacktrace/0",
      type: "function",
      specs: [],
      documentation:
        "Deprecated mechanism to retrieve the last exception stacktrace.\n\nIt always return an empty list.\n",
    },
    {
      name: "shell/2",
      type: "function",
      specs: [
        "@spec shell(\n        binary(),\n        keyword()\n      ) :: {Collectable.t(), exit_status :: non_neg_integer()}",
      ],
      documentation:
        'Executes the given `command` in the OS shell.\n\nIt uses `sh` for Unix-like systems and `cmd` for Windows.\n\n> #### Watch out {: .warning}\n>\n> Use this function with care. In particular, **never\n> pass untrusted user input to this function**, as the user would be\n> able to perform "command injection attacks" by executing any code\n> directly on the machine. Generally speaking, prefer to use `cmd/3`\n> over this function.\n\n## Examples\n\n    iex> System.shell("echo hello")\n    {"hello\\n", 0}\n\nIf you want to stream the output to Standard IO as it arrives:\n\n    iex> System.shell("echo hello", into: IO.stream())\n    hello\n    {%IO.Stream{}, 0}\n\n## Options\n\nIt accepts the same options as `cmd/3` (except for `arg0`).\nIt also accepts the following exclusive options:\n\n  * `:close_stdin` (since v1.14.1) - if the stdin should be closed\n    on Unix systems, forcing any command that waits on stdin to\n    immediately terminate. Defaults to false.\n',
    },
    {
      name: "schedulers_online/0",
      type: "function",
      specs: ["@spec schedulers_online() :: pos_integer()"],
      documentation: "Returns the number of schedulers online in the VM.\n",
    },
    {
      name: "schedulers/0",
      type: "function",
      specs: ["@spec schedulers() :: pos_integer()"],
      documentation: "Returns the number of schedulers in the VM.\n",
    },
    {
      name: "restart/0",
      type: "function",
      specs: ["@spec restart() :: :ok"],
      documentation:
        "Restarts all applications in the Erlang runtime system.\n\nAll applications are taken down smoothly, all code is unloaded, and all ports\nare closed before the system starts all applications once again.\n\n## Examples\n\n    System.restart()\n\n",
    },
    {
      name: "put_env/2",
      type: "function",
      specs: ["@spec put_env(binary(), binary()) :: :ok"],
      documentation:
        "Sets an environment variable value.\n\nSets a new `value` for the environment variable `varname`.\n",
    },
    {
      name: "put_env/1",
      type: "function",
      specs: ["@spec put_env(Enumerable.t()) :: :ok"],
      documentation:
        "Sets multiple environment variables.\n\nSets a new value for each environment variable corresponding\nto each `{key, value}` pair in `enum`. Keys and non-nil values\nare automatically converted to charlists. `nil` values erase\nthe given keys.\n\nOverall, this is a convenience wrapper around `put_env/2` and\n`delete_env/2` with support for different key and value formats.\n",
    },
    {
      name: "pid/0",
      type: "function",
      specs: ["@spec pid() :: String.t()"],
      documentation:
        "Returns the operating system PID for the current Erlang runtime system instance.\n\nReturns a string containing the (usually) numerical identifier for a process.\nOn Unix-like operating systems, this is typically the return value of the `getpid()` system call.\nOn Windows, the process ID as returned by the `GetCurrentProcessId()` system\ncall is used.\n\n## Examples\n\n    System.pid()\n\n",
    },
    {
      name: "otp_release/0",
      type: "function",
      specs: ["@spec otp_release() :: String.t()"],
      documentation: "Returns the Erlang/OTP release number.\n",
    },
    {
      name: "os_time/1",
      type: "function",
      specs: ["@spec os_time(time_unit() | :native) :: integer()"],
      documentation:
        "Returns the current operating system (OS) time in the given time `unit`.\n\nThis time may be adjusted forwards or backwards in time\nwith no limitation and is not monotonic.\n",
    },
    {
      name: "os_time/0",
      type: "function",
      specs: ["@spec os_time() :: integer()"],
      documentation:
        "Returns the current operating system (OS) time.\n\nThe result is returned in the `:native` time unit.\n\nThis time may be adjusted forwards or backwards in time\nwith no limitation and is not monotonic.\n\nInlined by the compiler.\n",
    },
    {
      name: "no_halt/1",
      type: "function",
      specs: ["@spec no_halt(boolean()) :: :ok"],
      documentation:
        "Marks if the system should halt or not at the end of ARGV processing.\n",
    },
    {
      name: "no_halt/0",
      type: "function",
      specs: ["@spec no_halt() :: boolean()"],
      documentation:
        "Checks if the system will halt or not at the end of ARGV processing.\n",
    },
    {
      name: "monotonic_time/1",
      type: "function",
      specs: ["@spec monotonic_time(time_unit() | :native) :: integer()"],
      documentation:
        "Returns the current monotonic time in the given time unit.\n\nThis time is monotonically increasing and starts in an unspecified\npoint in time.\n",
    },
    {
      name: "monotonic_time/0",
      type: "function",
      specs: ["@spec monotonic_time() :: integer()"],
      documentation:
        "Returns the current monotonic time in the `:native` time unit.\n\nThis time is monotonically increasing and starts in an unspecified\npoint in time. This is not strictly monotonically increasing. Multiple\nsequential calls of the function may return the same value.\n\nInlined by the compiler.\n",
    },
    {
      name: "halt/1",
      type: "function",
      specs: [
        "@spec halt(non_neg_integer() | binary() | :abort) :: no_return()",
      ],
      documentation:
        "Immediately halts the Erlang runtime system.\n\nTerminates the Erlang runtime system without properly shutting down\napplications and ports. Please see `stop/1` for a careful shutdown of the\nsystem.\n\n`status` must be a non-negative integer, the atom `:abort` or a binary.\n\n  * If an integer, the runtime system exits with the integer value which\n    is returned to the operating system.\n\n  * If `:abort`, the runtime system aborts producing a core dump, if that is\n    enabled in the operating system.\n\n  * If a string, an Erlang crash dump is produced with status as slogan,\n    and then the runtime system exits with status code 1.\n\nNote that on many platforms, only the status codes 0-255 are supported\nby the operating system.\n\nFor more information, see `:erlang.halt/1`.\n\n## Examples\n\n    System.halt(0)\n    System.halt(1)\n    System.halt(:abort)\n\n",
    },
    {
      name: "get_pid/0",
      type: "function",
      specs: ["@spec get_pid() :: binary()"],
      documentation:
        "Erlang VM process identifier.\n\nReturns the process identifier of the current Erlang emulator\nin the format most commonly used by the operating system environment.\n\nFor more information, see `:os.getpid/0`.\n",
    },
    {
      name: "get_env/2",
      type: "function",
      specs: [
        "@spec get_env(String.t(), String.t()) :: String.t()",
        "@spec get_env(String.t(), nil) :: String.t() | nil",
      ],
      documentation:
        'Returns the value of the given environment variable.\n\nThe returned value of the environment variable\n`varname` is a string. If the environment variable\nis not set, returns the string specified in `default` or\n`nil` if none is specified.\n\n## Examples\n\n    iex> System.get_env("PORT")\n    "4000"\n\n    iex> System.get_env("NOT_SET")\n    nil\n\n    iex> System.get_env("NOT_SET", "4001")\n    "4001"\n\n',
    },
    {
      name: "get_env/0",
      type: "function",
      specs: ["@spec get_env() :: %{optional(String.t()) => String.t()}"],
      documentation:
        "Returns all system environment variables.\n\nThe returned value is a map containing name-value pairs.\nVariable names and their values are strings.\n",
    },
    {
      name: "find_executable/1",
      type: "function",
      specs: ["@spec find_executable(binary()) :: binary() | nil"],
      documentation:
        "Locates an executable on the system.\n\nThis function looks up an executable program given\nits name using the environment variable PATH on Windows and Unix-like\noperating systems. It also considers the proper executable\nextension for each operating system, so for Windows it will try to\nlookup files with `.com`, `.cmd` or similar extensions.\n",
    },
    {
      name: "fetch_env!/1",
      type: "function",
      specs: ["@spec fetch_env!(String.t()) :: String.t()"],
      documentation:
        'Returns the value of the given environment variable or raises if not found.\n\nSame as `get_env/1` but raises instead of returning `nil` when the variable is\nnot set.\n\n## Examples\n\n    iex> System.fetch_env!("PORT")\n    "4000"\n\n    iex> System.fetch_env!("NOT_SET")\n    ** (System.EnvError) could not fetch environment variable "NOT_SET" because it is not set\n\n',
    },
    {
      name: "fetch_env/1",
      type: "function",
      specs: ["@spec fetch_env(String.t()) :: {:ok, String.t()} | :error"],
      documentation:
        'Returns the value of the given environment variable or `:error` if not found.\n\nIf the environment variable `varname` is set, then `{:ok, value}` is returned\nwhere `value` is a string. If `varname` is not set, `:error` is returned.\n\n## Examples\n\n    iex> System.fetch_env("PORT")\n    {:ok, "4000"}\n\n    iex> System.fetch_env("NOT_SET")\n    :error\n\n',
    },
    {
      name: "endianness/0",
      type: "function",
      specs: ["@spec endianness() :: :little | :big"],
      documentation: "Returns the endianness.\n",
    },
    {
      name: "delete_env/1",
      type: "function",
      specs: ["@spec delete_env(String.t()) :: :ok"],
      documentation:
        "Deletes an environment variable.\n\nRemoves the variable `varname` from the environment.\n",
    },
    {
      name: "cwd!/0",
      type: "function",
      specs: ["@spec cwd!() :: String.t()"],
      documentation:
        "Current working directory, exception on error.\n\nReturns the current working directory or raises `RuntimeError`.\n",
    },
    {
      name: "cwd/0",
      type: "function",
      specs: ["@spec cwd() :: String.t() | nil"],
      documentation:
        "Current working directory.\n\nReturns the current working directory or `nil` if one\nis not available.\n",
    },
    {
      name: "convert_time_unit/3",
      type: "function",
      specs: [
        "@spec convert_time_unit(integer(), time_unit() | :native, time_unit() | :native) ::\n        integer()",
      ],
      documentation:
        "Converts `time` from time unit `from_unit` to time unit `to_unit`.\n\nThe result is rounded via the floor function.\n\n`convert_time_unit/3` accepts an additional time unit (other than the\nones in the `t:time_unit/0` type) called `:native`. `:native` is the time\nunit used by the Erlang runtime system. It's determined when the runtime\nstarts and stays the same until the runtime is stopped, but could differ\nthe next time the runtime is started on the same machine. For this reason,\nyou should use this function to convert `:native` time units to a predictable\nunit before you display them to humans.\n\nTo determine how many seconds the `:native` unit represents in your current\nruntime, you can call this function to convert 1 second to the `:native`\ntime unit: `System.convert_time_unit(1, :second, :native)`.\n",
    },
    {
      name: "compiled_endianness/0",
      type: "function",
      specs: ["@spec compiled_endianness() :: :little | :big"],
      documentation: "Returns the endianness the system was compiled with.\n",
    },
    {
      name: "cmd/3",
      type: "function",
      specs: [
        "@spec cmd(binary(), [binary()], keyword()) ::\n        {Collectable.t(), exit_status :: non_neg_integer()}",
      ],
      documentation:
        'Executes the given `command` with `args`.\n\n`command` is expected to be an executable available in PATH\nunless an absolute path is given.\n\n`args` must be a list of binaries which the executable will receive\nas its arguments as is. This means that:\n\n  * environment variables will not be interpolated\n  * wildcard expansion will not happen (unless `Path.wildcard/2` is used\n    explicitly)\n  * arguments do not need to be escaped or quoted for shell safety\n\nThis function returns a tuple containing the collected result\nand the command exit status.\n\nInternally, this function uses a `Port` for interacting with the\noutside world. However, if you plan to run a long-running program,\nports guarantee stdin/stdout devices will be closed but it does not\nautomatically terminate the program. The documentation for the\n`Port` module describes this problem and possible solutions under\nthe "Zombie processes" section.\n\n> #### Windows argument splitting and untrusted arguments {: .warning}\n>\n> On Unix systems, arguments are passed to a new operating system\n> process as an array of strings but on Windows it is up to the child\n> process to parse them and some Windows programs may apply their own\n> rules, which are inconsistent with the standard C runtime `argv` parsing\n>\n> This is particularly troublesome when invoking `.bat` or `.com` files\n> as these run implicitly through `cmd.exe`, whose argument parsing is\n> vulnerable to malicious input and can be used to run arbitrary shell\n> commands.\n>\n> Therefore, if you are running on Windows and you execute batch\n> files or `.com` applications, you must not pass untrusted input as\n> arguments to the program. You may avoid accidentally executing them\n> by explicitly passing the extension of the program you want to run,\n> such as `.exe`, and double check the program is indeed not a batch\n> file or `.com` application.\n\n## Examples\n\n    iex> System.cmd("echo", ["hello"])\n    {"hello\\n", 0}\n\n    iex> System.cmd("echo", ["hello"], env: [{"MIX_ENV", "test"}])\n    {"hello\\n", 0}\n\nIf you want to stream the output to Standard IO as it arrives:\n\n    iex> System.cmd("echo", ["hello"], into: IO.stream())\n    hello\n    {%IO.Stream{}, 0}\n\nIf you want to read lines:\n\n    iex> System.cmd("echo", ["hello\\nworld"], into: [], lines: 1024)\n    {["hello", "world"], 0}\n\n## Options\n\n  * `:into` - injects the result into the given collectable, defaults to `""`\n\n  * `:lines` - (since v1.15.0) reads the output by lines instead of in bytes. It expects a\n    number of maximum bytes to buffer internally (1024 is a reasonable default).\n    The collectable will be called with each finished line (regardless of buffer\n    size) and without the EOL character\n\n  * `:cd` - the directory to run the command in\n\n  * `:env` - an enumerable of tuples containing environment key-value as\n    binary. The child process inherits all environment variables from its\n    parent process, the Elixir application, except those overwritten or\n    cleared using this option. Specify a value of `nil` to clear (unset) an\n    environment variable, which is useful for preventing credentials passed\n    to the application from leaking into child processes\n\n  * `:arg0` - sets the command arg0\n\n  * `:stderr_to_stdout` - redirects stderr to stdout when `true`, no effect\n    if `use_stdio` is `false`.\n\n  * `:use_stdio` - `true` by default, setting it to false allows direct\n    interaction with the terminal from the callee\n\n  * `:parallelism` - when `true`, the VM will schedule port tasks to improve\n    parallelism in the system. If set to `false`, the VM will try to perform\n    commands immediately, improving latency at the expense of parallelism.\n    The default is `false`, and can be set on system startup by passing the\n    [`+spp`](https://www.erlang.org/doc/man/erl.html#+spp) flag to `--erl`.\n    Use `:erlang.system_info(:port_parallelism)` to check if enabled.\n\n## Error reasons\n\nIf invalid arguments are given, `ArgumentError` is raised by\n`System.cmd/3`. `System.cmd/3` also expects a strict set of\noptions and will raise if unknown or invalid options are given.\n\nFurthermore, `System.cmd/3` may fail with one of the POSIX reasons\ndetailed below:\n\n  * `:system_limit` - all available ports in the Erlang emulator are in use\n\n  * `:enomem` - there was not enough memory to create the port\n\n  * `:eagain` - there are no more available operating system processes\n\n  * `:enametoolong` - the external command given was too long\n\n  * `:emfile` - there are no more available file descriptors\n    (for the operating system process that the Erlang emulator runs in)\n\n  * `:enfile` - the file table is full (for the entire operating system)\n\n  * `:eacces` - the command does not point to an executable file\n\n  * `:enoent` - the command does not point to an existing file\n\n## Shell commands\n\nIf you desire to execute a trusted command inside a shell, with pipes,\nredirecting and so on, please check `shell/2`.\n',
    },
    {
      name: "build_info/0",
      type: "function",
      specs: [
        "@spec build_info() :: %{\n        build: String.t(),\n        date: String.t(),\n        revision: String.t(),\n        version: String.t(),\n        otp_release: String.t()\n      }",
      ],
      documentation:
        'Elixir build information.\n\nReturns a map with the Elixir version, the Erlang/OTP release it was compiled\nwith, a short Git revision hash and the date and time it was built.\n\nEvery value in the map is a string, and these are:\n\n  * `:build` - the Elixir version, short Git revision hash and\n    Erlang/OTP release it was compiled with\n  * `:date` - a string representation of the ISO8601 date and time it was built\n  * `:otp_release` - OTP release it was compiled with\n  * `:revision` - short Git revision hash. If Git was not available at building\n    time, it is set to `""`\n  * `:version` - the Elixir version\n\nOne should not rely on the specific formats returned by each of those fields.\nInstead one should use specialized functions, such as `version/0` to retrieve\nthe Elixir version and `otp_release/0` to retrieve the Erlang/OTP release.\n\n## Examples\n\n    iex> System.build_info()\n    %{\n      build: "1.9.0-dev (772a00a0c) (compiled with Erlang/OTP 21)",\n      date: "2018-12-24T01:09:21Z",\n      otp_release: "21",\n      revision: "772a00a0c",\n      version: "1.9.0-dev"\n    }\n\n',
    },
    {
      name: "at_exit/1",
      type: "function",
      specs: ["@spec at_exit((non_neg_integer() -> any())) :: :ok"],
      documentation:
        "Registers a program exit handler function.\n\nRegisters a function that will be invoked at the end of an Elixir script.\nA script is typically started via the command line via the `elixir` and\n`mix` executables.\n\nThe handler always executes in a different process from the one it was\nregistered in. As a consequence, any resources managed by the calling process\n(ETS tables, open files, and others) won't be available by the time the handler\nfunction is invoked.\n\nThe function must receive the exit status code as an argument.\n\nIf the VM terminates programmatically, via `System.stop/1`, `System.halt/1`,\nor exit signals, the `at_exit/1` callbacks are not guaranteed to be executed.\n",
    },
    {
      name: "argv/1",
      type: "function",
      specs: ["@spec argv([String.t()]) :: :ok"],
      documentation:
        "Modifies command line arguments.\n\nChanges the list of command line arguments. Use it with caution,\nas it destroys any previous argv information.\n",
    },
    {
      name: "argv/0",
      type: "function",
      specs: ["@spec argv() :: [String.t()]"],
      documentation:
        "Lists command line arguments.\n\nReturns the list of command line arguments passed to the program.\n",
    },
  ],
  name: "System",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "signal/0",
      type: "type",
      specs: [
        "@type signal() ::\n        :sigabrt\n        | :sigalrm\n        | :sigchld\n        | :sighup\n        | :sigquit\n        | :sigstop\n        | :sigterm\n        | :sigtstp\n        | :sigusr1\n        | :sigusr2",
      ],
      documentation: null,
    },
    {
      name: "time_unit/0",
      type: "type",
      specs: [
        "@type time_unit() ::\n        :second | :millisecond | :microsecond | :nanosecond | pos_integer()",
      ],
      documentation:
        'The time unit to be passed to functions like `monotonic_time/1` and others.\n\nThe `:second`, `:millisecond`, `:microsecond` and `:nanosecond` time\nunits controls the return value of the functions that accept a time unit.\n\nA time unit can also be a strictly positive integer. In this case, it\nrepresents the "parts per second": the time will be returned in `1 /\nparts_per_second` seconds. For example, using the `:millisecond` time unit\nis equivalent to using `1000` as the time unit (as the time will be returned\nin 1/1000 seconds - milliseconds).\n',
    },
  ],
};
