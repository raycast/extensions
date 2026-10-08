import type { ModuleDoc } from "../types";

export const File: ModuleDoc = {
  functions: [
    {
      name: "write_stat!/3",
      type: "function",
      specs: [
        "@spec write_stat!(Path.t(), File.Stat.t(), stat_options()) :: :ok",
      ],
      documentation:
        "Same as `write_stat/3` but raises a `File.Error` exception if it fails.\nReturns `:ok` otherwise.\n",
    },
    {
      name: "write_stat/3",
      type: "function",
      specs: [
        "@spec write_stat(Path.t(), File.Stat.t(), stat_options()) ::\n        :ok | {:error, posix()}",
      ],
      documentation:
        "Writes the given `File.Stat` back to the file system at the given\npath. Returns `:ok` or `{:error, reason}`.\n",
    },
    {
      name: "write!/3",
      type: "function",
      specs: ["@spec write!(Path.t(), iodata(), [mode()]) :: :ok"],
      documentation:
        "Same as `write/3` but raises a `File.Error` exception if it fails.\nReturns `:ok` otherwise.\n",
    },
    {
      name: "write/3",
      type: "function",
      specs: [
        "@spec write(Path.t(), iodata(), [mode()]) :: :ok | {:error, posix()}",
      ],
      documentation:
        "Writes `content` to the file `path`.\n\nThe file is created if it does not exist. If it exists, the previous\ncontents are overwritten. Returns `:ok` if successful, or `{:error, reason}`\nif an error occurs.\n\n`content` must be `iodata` (a list of bytes or a binary). Setting the\nencoding for this function has no effect.\n\n**Warning:** Every time this function is invoked, a file descriptor is opened\nand a new process is spawned to write to the file. For this reason, if you are\ndoing multiple writes in a loop, opening the file via `File.open/2` and using\nthe functions in `IO` to write to the file will yield much better performance\nthan calling this function multiple times.\n\nTypical error reasons are:\n\n  * `:enoent`  - a component of the file name does not exist\n  * `:enotdir` - a component of the file name is not a directory;\n    on some platforms, `:enoent` is returned instead\n  * `:enospc`  - there is no space left on the device\n  * `:eacces`  - missing permission for writing the file or searching one of\n    the parent directories\n  * `:eisdir`  - the named file is a directory\n\nCheck `File.open/2` for other available options.\n",
    },
    {
      name: "touch!/2",
      type: "function",
      specs: ["@spec touch!(Path.t(), erlang_time() | posix_time()) :: :ok"],
      documentation:
        'Same as `touch/2` but raises a `File.Error` exception if it fails.\nReturns `:ok` otherwise.\n\nThe file is created if it doesn\'t exist. Requires datetime in UTC\n(as returned by `:erlang.universaltime()`) or an integer\nrepresenting the POSIX timestamp (as returned by `System.os_time(:second)`).\n\n## Examples\n\n    File.touch!("/tmp/a.txt", {{2018, 1, 30}, {13, 59, 59}})\n    #=> :ok\n    File.touch!("/fakedir/b.txt", {{2018, 1, 30}, {13, 59, 59}})\n    ** (File.Error) could not touch "/fakedir/b.txt": no such file or directory\n\n    File.touch!("/tmp/a.txt", 1544519753)\n\n',
    },
    {
      name: "touch/2",
      type: "function",
      specs: [
        "@spec touch(Path.t(), erlang_time() | posix_time()) :: :ok | {:error, posix()}",
      ],
      documentation:
        'Updates modification time (mtime) and access time (atime) of\nthe given file.\n\nThe file is created if it doesn\'t exist. Requires datetime in UTC\n(as returned by `:erlang.universaltime()`) or an integer\nrepresenting the POSIX timestamp (as returned by `System.os_time(:second)`).\n\nIn Unix-like systems, changing the modification time may require\nyou to be either `root` or the owner of the file. Having write\naccess may not be enough. In those cases, touching the file the\nfirst time (to create it) will succeed, but touching an existing\nfile with fail with `{:error, :eperm}`.\n\n## Examples\n\n    File.touch("/tmp/a.txt", {{2018, 1, 30}, {13, 59, 59}})\n    #=> :ok\n    File.touch("/fakedir/b.txt", {{2018, 1, 30}, {13, 59, 59}})\n    {:error, :enoent}\n\n    File.touch("/tmp/a.txt", 1544519753)\n    #=> :ok\n\n',
    },
    {
      name: "stream!/3",
      type: "function",
      specs: [
        "@spec stream!(Path.t(), :line | pos_integer(), [stream_mode()]) ::\n        File.Stream.t()",
      ],
      documentation:
        'Returns a `File.Stream` for the given `path` with the given `modes`.\n\nThe stream implements both `Enumerable` and `Collectable` protocols,\nwhich means it can be used both for read and write.\n\nThe `line_or_bytes` argument configures how the file is read when\nstreaming, by `:line` (default) or by a given number of bytes. When\nusing the `:line` option, CRLF line breaks (`"\\r\\n"`) are normalized\nto LF (`"\\n"`).\n\nSimilar to other file operations, a stream can be created in one node\nand forwarded to another node. Once the stream is opened in another node,\na request will be sent to the creator node to spawn a process for file\nstreaming.\n\nOperating the stream can fail on open for the same reasons as\n`File.open!/2`. Note that the file is automatically opened each time streaming\nbegins. There is no need to pass `:read` and `:write` modes, as those are\nautomatically set by Elixir.\n\n## Raw files\n\nSince Elixir controls when the streamed file is opened, the underlying\ndevice cannot be shared and as such it is convenient to open the file\nin raw mode for performance reasons. Therefore, Elixir **will** open\nstreams in `:raw` mode with the `:read_ahead` option if the stream is\nopen in the same node as it is created and no encoding has been specified.\nThis means any data streamed into the file must be converted to `t:iodata/0`\ntype. If you pass, for example, `[encoding: :utf8]` or\n`[encoding: {:utf16, :little}]` in the modes parameter, the underlying stream\nwill use `IO.write/2` and the `String.Chars` protocol to convert the data.\nSee `IO.binwrite/2` and `IO.write/2` .\n\nOne may also consider passing the `:delayed_write` option if the stream\nis meant to be written to under a tight loop.\n\n## Byte order marks and read offset\n\nIf you pass `:trim_bom` in the modes parameter, the stream will\ntrim UTF-8, UTF-16 and UTF-32 byte order marks when reading from file.\n\nNote that this function does not try to discover the file encoding\nbased on BOM. From Elixir v1.16.0, you may also pass a `:read_offset`\nthat is skipped whenever enumerating the stream (if both `:read_offset`\nand `:trim_bom` are given, the offset is skipped after the BOM).\n\n## Examples\n\n    # Read a utf8 text file which may include BOM\n    File.stream!("./test/test.txt", [:trim_bom, encoding: :utf8])\n\n    # Read in 2048 byte chunks rather than lines\n    File.stream!("./test/test.data", 2048)\n\nSee `Stream.run/1` for an example of streaming into a file.\n',
    },
    {
      name: "stream!/2",
      type: "function",
      specs: [
        "@spec stream!(Path.t(), :line | pos_integer() | [stream_mode()]) ::\n        File.Stream.t()",
      ],
      documentation: "Shortcut for `File.stream!/3`.\n",
    },
    {
      name: "stat!/2",
      type: "function",
      specs: ["@spec stat!(Path.t(), stat_options()) :: File.Stat.t()"],
      documentation:
        "Same as `stat/2` but returns the `File.Stat` directly,\nor raises a `File.Error` exception if an error is returned.\n",
    },
    {
      name: "stat/2",
      type: "function",
      specs: [
        "@spec stat(Path.t(), stat_options()) :: {:ok, File.Stat.t()} | {:error, posix()}",
      ],
      documentation:
        "Returns information about the `path`. If it exists, it\nreturns a `{:ok, info}` tuple, where info is a\n`File.Stat` struct. Returns `{:error, reason}` with\nthe same reasons as `read/1` if a failure occurs.\n\n## Options\n\nThe accepted options are:\n\n  * `:time` - configures how the file timestamps are returned\n\nThe values for `:time` can be:\n\n  * `:universal` - returns a `{date, time}` tuple in UTC (default)\n  * `:local` - returns a `{date, time}` tuple using the same time zone as the\n    machine\n  * `:posix` - returns the time as integer seconds since epoch\n\nNote: Since file times are stored in POSIX time format on most operating systems,\nit is faster to retrieve file information with the `time: :posix` option.\n",
    },
    {
      name: "rmdir!/1",
      type: "function",
      specs: ["@spec rmdir!(Path.t()) :: :ok | {:error, posix()}"],
      documentation:
        "Same as `rmdir/1`, but raises a `File.Error` exception in case of failure.\nOtherwise `:ok`.\n",
    },
    {
      name: "rmdir/1",
      type: "function",
      specs: ["@spec rmdir(Path.t()) :: :ok | {:error, posix()}"],
      documentation:
        'Tries to delete the dir at `path`.\n\nReturns `:ok` if successful, or `{:error, reason}` if an error occurs.\nIt returns `{:error, :eexist}` if the directory is not empty.\n\n## Examples\n\n    File.rmdir("tmp_dir")\n    #=> :ok\n\n    File.rmdir("non_empty_dir")\n    #=> {:error, :eexist}\n\n    File.rmdir("file.txt")\n    #=> {:error, :enotdir}\n\n',
    },
    {
      name: "rm_rf!/1",
      type: "function",
      specs: ["@spec rm_rf!(Path.t()) :: [binary()]"],
      documentation:
        "Same as `rm_rf/1` but raises a `File.Error` exception in case of failures,\notherwise the list of files or directories removed.\n",
    },
    {
      name: "rm_rf/1",
      type: "function",
      specs: [
        "@spec rm_rf(Path.t()) :: {:ok, [binary()]} | {:error, posix(), binary()}",
      ],
      documentation:
        'Removes files and directories recursively at the given `path`.\nSymlinks are not followed but simply removed, non-existing\nfiles are simply ignored (i.e. doesn\'t make this function fail).\n\nReturns `{:ok, files_and_directories}` with all files and\ndirectories removed in no specific order, `{:error, reason, file}`\notherwise.\n\n## Examples\n\n    File.rm_rf("samples")\n    #=> {:ok, ["samples", "samples/1.txt"]}\n\n    File.rm_rf("unknown")\n    #=> {:ok, []}\n\n',
    },
    {
      name: "rm!/1",
      type: "function",
      specs: ["@spec rm!(Path.t()) :: :ok"],
      documentation:
        "Same as `rm/1`, but raises a `File.Error` exception in case of failure.\nOtherwise `:ok`.\n",
    },
    {
      name: "rm/1",
      type: "function",
      specs: ["@spec rm(Path.t()) :: :ok | {:error, posix()}"],
      documentation:
        'Tries to delete the file `path`.\n\nReturns `:ok` if successful, or `{:error, reason}` if an error occurs.\n\nNote the file is deleted even if in read-only mode.\n\nTypical error reasons are:\n\n  * `:enoent`  - the file does not exist\n  * `:eacces`  - missing permission for the file or one of its parents\n  * `:eperm`   - the file is a directory and user is not super-user\n  * `:enotdir` - a component of the file name is not a directory;\n    on some platforms, `:enoent` is returned instead\n  * `:einval`  - filename had an improper type, such as tuple\n\n## Examples\n\n    File.rm("file.txt")\n    #=> :ok\n\n    File.rm("tmp_dir/")\n    #=> {:error, :eperm}\n\n',
    },
    {
      name: "rename!/2",
      type: "function",
      specs: ["@spec rename!(Path.t(), Path.t()) :: :ok"],
      documentation:
        "The same as `rename/2` but raises a `File.RenameError` exception if it fails.\nReturns `:ok` otherwise.\n",
    },
    {
      name: "rename/2",
      type: "function",
      specs: ["@spec rename(Path.t(), Path.t()) :: :ok | {:error, posix()}"],
      documentation:
        'Renames the `source` file to `destination` file.  It can be used to move files\n(and directories) between directories.  If moving a file, you must fully\nspecify the `destination` filename, it is not sufficient to simply specify\nits directory.\n\nReturns `:ok` in case of success, `{:error, reason}` otherwise.\n\nNote: The command `mv` in Unix-like systems behaves differently depending on\nwhether `source` is a file and the `destination` is an existing directory.\nWe have chosen to explicitly disallow this behavior.\n\n## Examples\n\n    # Rename file "a.txt" to "b.txt"\n    File.rename("a.txt", "b.txt")\n\n    # Rename directory "samples" to "tmp"\n    File.rename("samples", "tmp")\n\n',
    },
    {
      name: "regular?/2",
      type: "function",
      specs: [
        "@spec regular?(Path.t(), [regular_option]) :: boolean()\n      when regular_option: :raw",
      ],
      documentation:
        "Returns `true` if the path is a regular file.\n\nThis function follows symbolic links, so if a symbolic link points to a\nregular file, `true` is returned.\n\n## Options\n\nThe supported options are:\n\n  * `:raw` - a single atom to bypass the file server and only check\n    for the file locally\n\n## Examples\n\n    File.regular?(__ENV__.file)\n    #=> true\n\n",
    },
    {
      name: "read_link!/1",
      type: "function",
      specs: ["@spec read_link!(Path.t()) :: binary()"],
      documentation:
        "Same as `read_link/1` but returns the target directly,\nor raises a `File.Error` exception if an error is returned.\n",
    },
    {
      name: "read_link/1",
      type: "function",
      specs: [
        "@spec read_link(Path.t()) :: {:ok, binary()} | {:error, posix()}",
      ],
      documentation:
        "Reads the symbolic link at `path`.\n\nIf `path` exists and is a symlink, returns `{:ok, target}`, otherwise returns\n`{:error, reason}`.\n\nFor more details, see `:file.read_link/1`.\n\nTypical error reasons are:\n\n  * `:einval` - path is not a symbolic link\n  * `:enoent` - path does not exist\n  * `:enotsup` - symbolic links are not supported on the current platform\n\n",
    },
    {
      name: "read!/1",
      type: "function",
      specs: ["@spec read!(Path.t()) :: binary()"],
      documentation:
        "Returns a binary with the contents of the given filename,\nor raises a `File.Error` exception if an error occurs.\n",
    },
    {
      name: "read/1",
      type: "function",
      specs: ["@spec read(Path.t()) :: {:ok, binary()} | {:error, posix()}"],
      documentation:
        "Returns `{:ok, binary}`, where `binary` is a binary data object that contains the contents\nof `path`, or `{:error, reason}` if an error occurs.\n\nTypical error reasons:\n\n  * `:enoent`  - the file does not exist\n  * `:eacces`  - missing permission for reading the file,\n    or for searching one of the parent directories\n  * `:eisdir`  - the named file is a directory\n  * `:enotdir` - a component of the file name is not a directory;\n    on some platforms, `:enoent` is returned instead\n  * `:enomem`  - there is not enough memory for the contents of the file\n\nYou can use `:file.format_error/1` to get a descriptive string of the error.\n",
    },
    {
      name: "open!/3",
      type: "function",
      specs: [
        "@spec open!(Path.t(), [mode() | :ram], (io_device() | file_descriptor() -> res)) ::\n        res\n      when res: var",
      ],
      documentation:
        "Similar to `open/3` but raises a `File.Error` exception if the file\ncould not be opened.\n\nIf it succeeds opening the file, it returns the `function` result on the IO device.\n\nSee `open/2` for the list of available `modes`.\n",
    },
    {
      name: "open!/2",
      type: "function",
      specs: [
        "@spec open!(Path.t(), [mode() | :ram]) :: io_device() | file_descriptor()",
        "@spec open!(Path.t(), (io_device() | file_descriptor() -> res)) :: res\n      when res: var",
      ],
      documentation:
        "Similar to `open/2` but raises a `File.Error` exception if the file\ncould not be opened. Returns the IO device otherwise.\n\nSee `open/2` for the list of available modes.\n",
    },
    {
      name: "open/3",
      type: "function",
      specs: [
        "@spec open(Path.t(), [mode() | :ram], (io_device() | file_descriptor() -> res)) ::\n        {:ok, res} | {:error, posix()}\n      when res: var",
      ],
      documentation:
        'Similar to `open/2` but expects a function as its last argument.\n\nThe file is opened, given to the function as an argument and\nautomatically closed after the function returns, regardless\nif there was an error when executing the function.\n\nReturns `{:ok, function_result}` in case of success,\n`{:error, reason}` otherwise.\n\nThis function expects the file to be closed with success,\nwhich is usually the case unless the `:delayed_write` option\nis given. For this reason, we do not recommend passing\n`:delayed_write` to this function.\n\n## Examples\n\n    File.open("file.txt", [:read, :write], fn file ->\n      IO.read(file, :line)\n    end)\n\nSee `open/2` for the list of available `modes`.\n',
    },
    {
      name: "open/2",
      type: "function",
      specs: [
        "@spec open(Path.t(), [mode() | :ram]) ::\n        {:ok, io_device() | file_descriptor()} | {:error, posix()}",
        "@spec open(Path.t(), (io_device() | file_descriptor() -> res)) ::\n        {:ok, res} | {:error, posix()}\n      when res: var",
      ],
      documentation:
        "Opens the given `path`.\n\n`modes_or_function` can either be a list of modes or a function. If it's a\nlist, it's considered to be a list of modes (that are documented below). If\nit's a function, then it's equivalent to calling `open(path, [],\nmodes_or_function)`. See the documentation for `open/3` for more information\non this function.\n\nThe allowed modes:\n\n  * `:binary` - opens the file in binary mode, disabling special handling of\n    Unicode sequences (default mode).\n\n  * `:read` - the file, which must exist, is opened for reading.\n\n  * `:write` - the file is opened for writing. It is created if it does not\n    exist.\n\n    If the file does exist, and if write is not combined with read, the file\n    will be truncated.\n\n  * `:append` - the file will be opened for writing, and it will be created\n    if it does not exist. Every write operation to a file opened with append\n    will take place at the end of the file.\n\n  * `:exclusive` - the file, when opened for writing, is created if it does\n    not exist. If the file exists, open will return `{:error, :eexist}`.\n\n  * `:charlist` - when this term is given, read operations on the file will\n    return charlists rather than binaries.\n\n  * `:compressed` - makes it possible to read or write gzip compressed files.\n\n    The compressed option must be combined with either read or write, but not\n    both. Note that the file size obtained with `stat/1` will most probably\n    not match the number of bytes that can be read from a compressed file.\n\n  * `:utf8` - this option denotes how data is actually stored in the disk\n    file and makes the file perform automatic translation of characters to\n    and from UTF-8.\n\n    If data is sent to a file in a format that cannot be converted to the\n    UTF-8 or if data is read by a function that returns data in a format that\n    cannot cope with the character range of the data, an error occurs and the\n    file will be closed.\n\n  * `:delayed_write`, `:raw`, `:ram`, `:read_ahead`, `:sync`, `{:encoding, ...}`,\n    `{:read_ahead, pos_integer}`, `{:delayed_write, non_neg_integer, non_neg_integer}` -\n    for more information about these options see `:file.open/2`.\n\nThis function returns:\n\n  * `{:ok, io_device | file_descriptor}` - the file has been opened in\n    the requested mode. We explore the differences between these two results\n    in the following section\n\n  * `{:error, reason}` - the file could not be opened due to `reason`.\n\n## IO devices\n\nBy default, this function returns an IO device. An `io_device` is\na process which handles the file and you can interact with it using\nthe functions in the `IO` module. By default, a file is opened in\n`:binary` mode, which requires the functions `IO.binread/2` and\n`IO.binwrite/2` to interact with the file. A developer may pass `:utf8`\nas a mode when opening the file and then all other functions from\n`IO` are available, since they work directly with Unicode data.\n\nGiven the IO device is a file, if the owner process terminates,\nthe file is closed and the process itself terminates too. If any\nprocess to which the `io_device` is linked terminates, the file\nwill be closed and the process itself will be terminated.\n\n## File descriptors\n\nWhen the `:raw` or `:ram` modes are given, this function returns\na low-level file descriptors. This avoids creating a process but\nrequires using the functions in the [`:file`](`:file`) module to\ninteract with it.\n\n## Examples\n\n    {:ok, file} = File.open(\"foo.tar.gz\", [:read, :compressed])\n    IO.read(file, :line)\n    File.close(file)\n\n",
    },
    {
      name: "mkdir_p!/1",
      type: "function",
      specs: ["@spec mkdir_p!(Path.t()) :: :ok"],
      documentation:
        "Same as `mkdir_p/1`, but raises a `File.Error` exception in case of failure.\nOtherwise `:ok`.\n",
    },
    {
      name: "mkdir_p/1",
      type: "function",
      specs: ["@spec mkdir_p(Path.t()) :: :ok | {:error, posix()}"],
      documentation:
        "Tries to create the directory `path`.\n\nMissing parent directories are created. Returns `:ok` if successful, or\n`{:error, reason}` if an error occurs.\n\nTypical error reasons are:\n\n  * `:eacces`  - missing search or write permissions for the parent\n    directories of `path`\n  * `:enospc`  - there is no space left on the device\n  * `:enotdir` - a component of `path` is not a directory\n\n",
    },
    {
      name: "mkdir!/1",
      type: "function",
      specs: ["@spec mkdir!(Path.t()) :: :ok"],
      documentation:
        "Same as `mkdir/1`, but raises a `File.Error` exception in case of failure.\nOtherwise `:ok`.\n",
    },
    {
      name: "mkdir/1",
      type: "function",
      specs: ["@spec mkdir(Path.t()) :: :ok | {:error, posix()}"],
      documentation:
        "Tries to create the directory `path`.\n\nMissing parent directories are not created.\nReturns `:ok` if successful, or `{:error, reason}` if an error occurs.\n\nTypical error reasons are:\n\n  * `:eacces`  - missing search or write permissions for the parent\n    directories of `path`\n  * `:eexist`  - there is already a file or directory named `path`\n  * `:enoent`  - a component of `path` does not exist\n  * `:enospc`  - there is no space left on the device\n  * `:enotdir` - a component of `path` is not a directory;\n    on some platforms, `:enoent` is returned instead\n\n",
    },
    {
      name: "lstat!/2",
      type: "function",
      specs: ["@spec lstat!(Path.t(), stat_options()) :: File.Stat.t()"],
      documentation:
        "Same as `lstat/2` but returns the `File.Stat` struct directly,\nor raises a `File.Error` exception if an error is returned.\n",
    },
    {
      name: "lstat/2",
      type: "function",
      specs: [
        "@spec lstat(Path.t(), stat_options()) ::\n        {:ok, File.Stat.t()} | {:error, posix()}",
      ],
      documentation:
        "Returns information about the `path`. If the file is a symlink, sets\nthe `type` to `:symlink` and returns a `File.Stat` struct for the link. For any\nother file, returns exactly the same values as `stat/2`.\n\nFor more details, see `:file.read_link_info/2`.\n\n## Options\n\nThe accepted options are:\n\n  * `:time` - configures how the file timestamps are returned\n\nThe values for `:time` can be:\n\n  * `:universal` - returns a `{date, time}` tuple in UTC (default)\n  * `:local` - returns a `{date, time}` tuple using the machine time\n  * `:posix` - returns the time as integer seconds since epoch\n\nNote: Since file times are stored in POSIX time format on most operating systems,\nit is faster to retrieve file information with the `time: :posix` option.\n",
    },
    {
      name: "ls!/1",
      type: "function",
      specs: ["@spec ls!(Path.t()) :: [binary()]"],
      documentation:
        "The same as `ls/1` but raises a `File.Error` exception in case of an error.\n",
    },
    {
      name: "ls/1",
      type: "function",
      specs: ["@spec ls(Path.t()) :: {:ok, [binary()]} | {:error, posix()}"],
      documentation:
        "Returns the list of files in the given directory.\n\nHidden files are not ignored and the results are *not* sorted.\n\nSince directories are considered files by the file system,\nthey are also included in the returned value.\n\nReturns `{:ok, files}` in case of success,\n`{:error, reason}` otherwise.\n",
    },
    {
      name: "ln_s!/2",
      type: "function",
      specs: ["@spec ln_s!(Path.t(), Path.t()) :: :ok"],
      documentation:
        "Same as `ln_s/2` but raises a `File.LinkError` exception if it fails.\nReturns `:ok` otherwise.\n",
    },
    {
      name: "ln_s/2",
      type: "function",
      specs: ["@spec ln_s(Path.t(), Path.t()) :: :ok | {:error, posix()}"],
      documentation:
        "Creates a symbolic link `new` to the file or directory `existing`.\n\nReturns `:ok` if successful, `{:error, reason}` otherwise.\nIf the operating system does not support symlinks, returns\n`{:error, :enotsup}`.\n",
    },
    {
      name: "ln!/2",
      type: "function",
      specs: ["@spec ln!(Path.t(), Path.t()) :: :ok"],
      documentation:
        "Same as `ln/2` but raises a `File.LinkError` exception if it fails.\nReturns `:ok` otherwise.\n",
    },
    {
      name: "ln/2",
      type: "function",
      specs: ["@spec ln(Path.t(), Path.t()) :: :ok | {:error, posix()}"],
      documentation:
        "Creates a hard link `new` to the file `existing`.\n\nReturns `:ok` if successful, `{:error, reason}` otherwise.\nIf the operating system does not support hard links, returns\n`{:error, :enotsup}`.\n",
    },
    {
      name: "exists?/2",
      type: "function",
      specs: [
        "@spec exists?(Path.t(), [exists_option]) :: boolean() when exists_option: :raw",
      ],
      documentation:
        'Returns `true` if the given path exists.\n\nIt can be a regular file, directory, socket, symbolic link, named pipe, or device file.\nReturns `false` for symbolic links pointing to non-existing targets.\n\n## Options\n\nThe supported options are:\n\n  * `:raw` - a single atom to bypass the file server and only check\n    for the file locally\n\n## Examples\n\n    File.exists?("test/")\n    #=> true\n\n    File.exists?("missing.txt")\n    #=> false\n\n    File.exists?("/dev/null")\n    #=> true\n\n',
    },
    {
      name: "dir?/2",
      type: "function",
      specs: [
        "@spec dir?(Path.t(), [dir_option]) :: boolean() when dir_option: :raw",
      ],
      documentation:
        'Returns `true` if the given path is a directory.\n\nThis function follows symbolic links, so if a symbolic link points to a\ndirectory, `true` is returned.\n\n## Options\n\nThe supported options are:\n\n  * `:raw` - a single atom to bypass the file server and only check\n    for the file locally\n\n## Examples\n\n    File.dir?("./test")\n    #=> true\n\n    File.dir?("test")\n    #=> true\n\n    File.dir?("/usr/bin")\n    #=> true\n\n    File.dir?("~/Downloads")\n    #=> false\n\n    "~/Downloads" |> Path.expand() |> File.dir?()\n    #=> true\n\n',
    },
    {
      name: "cwd!/0",
      type: "function",
      specs: ["@spec cwd!() :: binary()"],
      documentation:
        "The same as `cwd/0`, but raises a `File.Error` exception if it fails.\n",
    },
    {
      name: "cwd/0",
      type: "function",
      specs: ["@spec cwd() :: {:ok, binary()} | {:error, posix()}"],
      documentation:
        "Gets the current working directory.\n\nIn rare circumstances, this function can fail on Unix-like systems. It may happen\nif read permissions do not exist for the parent directories of the\ncurrent directory. For this reason, returns `{:ok, cwd}` in case\nof success, `{:error, reason}` otherwise.\n",
    },
    {
      name: "cp_r!/3",
      type: "function",
      specs: [
        "@spec cp_r!(Path.t(), Path.t(),\n        on_conflict: on_conflict_callback(),\n        dereference_symlinks: boolean()\n      ) :: [binary()]",
      ],
      documentation:
        "The same as `cp_r/3`, but raises a `File.CopyError` exception if it fails.\nReturns the list of copied files otherwise.\n",
    },
    {
      name: "cp_r/3",
      type: "function",
      specs: [
        "@spec cp_r(Path.t(), Path.t(),\n        on_conflict: on_conflict_callback(),\n        dereference_symlinks: boolean()\n      ) :: {:ok, [binary()]} | {:error, posix(), binary()}",
      ],
      documentation:
        'Copies the contents in `source` to `destination` recursively, maintaining the\nsource directory structure and modes.\n\nIf `source` is a file or a symbolic link to it, `destination` must be a path\nto an existent file, a symbolic link to one, or a path to a non-existent file.\n\nIf `source` is a directory, or a symbolic link to it, then `destination` must\nbe an existent `directory` or a symbolic link to one, or a path to a non-existent directory.\n\nIf the source is a file, it copies `source` to `destination`. If the `source`\nis a directory, it copies the contents inside source into the `destination` directory.\n\nIf a file already exists in the destination, it invokes the optional `on_conflict`\ncallback given as an option. See "Options" for more information.\n\nThis function may fail while copying files, in such cases, it will leave the\ndestination directory in a dirty state, where file which have already been\ncopied won\'t be removed.\n\nThe function returns `{:ok, files_and_directories}` in case of\nsuccess, `files_and_directories` lists all files and directories copied in no\nspecific order. It returns `{:error, reason, file}` otherwise.\n\nNote: The command `cp` in Unix-like systems behaves differently depending on\nwhether `destination` is an existing directory or not. We have chosen to\nexplicitly disallow this behavior. If `source` is a `file` and `destination`\nis a directory, `{:error, :eisdir}` will be returned.\n\n## Options\n\n  * `:on_conflict` - (since v1.14.0) Invoked when a file already exists in the destination.\n    The function receives arguments for `source` and `destination`. It should return\n    `true` if the existing file should be overwritten, `false` if otherwise. The default\n    callback returns `true`. On earlier versions, this callback could be given as third\n    argument, but such behavior is now deprecated.\n\n  * `:dereference_symlinks` - (since v1.14.0) By default, this function will copy symlinks\n    by creating symlinks that point to the same location. This option forces symlinks to be\n    dereferenced and have their contents copied instead when set to `true`. If the dereferenced\n    files do not exist, than the operation fails. The default is `false`.\n\n## Examples\n\n    # Copies file "a.txt" to "b.txt"\n    File.cp_r("a.txt", "b.txt")\n\n    # Copies all files in "samples" to "tmp"\n    File.cp_r("samples", "tmp")\n\n    # Same as before, but asks the user how to proceed in case of conflicts\n    File.cp_r("samples", "tmp", on_conflict: fn source, destination ->\n      IO.gets("Overwriting #{destination} by #{source}. Type y to confirm. ") == "y\\n"\n    end)\n\n',
    },
    {
      name: "cp!/3",
      type: "function",
      specs: [
        "@spec cp!(Path.t(), Path.t(), [{:on_conflict, on_conflict_callback()}]) :: :ok",
      ],
      documentation:
        "The same as `cp/3`, but raises a `File.CopyError` exception if it fails.\nReturns `:ok` otherwise.\n",
    },
    {
      name: "cp/3",
      type: "function",
      specs: [
        "@spec cp(Path.t(), Path.t(), [{:on_conflict, on_conflict_callback()}]) ::\n        :ok | {:error, posix()}",
      ],
      documentation:
        "Copies the contents of `source_file` to `destination_file` preserving its modes.\n\n`source_file` must be a file or a symbolic link to one. `destination_file` must\nbe a path to a non-existent file. If either is a directory, `{:error, :eisdir}`\nwill be returned.\n\nThe function returns `:ok` in case of success. Otherwise, it returns\n`{:error, reason}`.\n\nIf you want to copy contents from an IO device to another device\nor do a straight copy from a source to a destination without\npreserving modes, check `copy/3` instead.\n\nNote: The command `cp` in Unix-like systems behaves differently depending on\nwhether the destination is an existing directory or not. We have chosen to\nexplicitly disallow copying to a destination which is a directory,\nand an error will be returned if tried.\n\n## Options\n\n  * `:on_conflict` - (since v1.14.0) Invoked when a file already exists in the destination.\n    The function receives arguments for `source_file` and `destination_file`. It should\n    return `true` if the existing file should be overwritten, `false` if otherwise.\n    The default callback returns `true`. On earlier versions, this callback could be\n    given as third argument, but such behavior is now deprecated.\n\n",
    },
    {
      name: "copy!/3",
      type: "function",
      specs: [
        "@spec copy!(\n        Path.t() | io_device(),\n        Path.t() | io_device(),\n        pos_integer() | :infinity\n      ) :: non_neg_integer()",
      ],
      documentation:
        "The same as `copy/3` but raises a `File.CopyError` exception if it fails.\nReturns the `bytes_copied` otherwise.\n",
    },
    {
      name: "copy/3",
      type: "function",
      specs: [
        "@spec copy(\n        Path.t() | io_device(),\n        Path.t() | io_device(),\n        pos_integer() | :infinity\n      ) :: {:ok, non_neg_integer()} | {:error, posix()}",
      ],
      documentation:
        "Copies the contents of `source` to `destination`.\n\nBoth parameters can be a filename or an IO device opened\nwith `open/2`. `bytes_count` specifies the number of\nbytes to copy, the default being `:infinity`.\n\nIf file `destination` already exists, it is overwritten\nby the contents in `source`.\n\nReturns `{:ok, bytes_copied}` if successful,\n`{:error, reason}` otherwise.\n\nCompared to the `cp/3`, this function is more low-level,\nallowing a copy from device to device limited by a number of\nbytes. On the other hand, `cp/3` performs more extensive\nchecks on both source and destination and it also preserves\nthe file mode after copy.\n\nTypical error reasons are the same as in `open/2`,\n`read/1` and `write/3`.\n",
    },
    {
      name: "close/1",
      type: "function",
      specs: [
        "@spec close(io_device()) :: :ok | {:error, posix() | :badarg | :terminated}",
      ],
      documentation:
        "Closes the file referenced by `io_device`. It mostly returns `:ok`, except\nfor some severe errors such as out of memory.\n\nNote that if the option `:delayed_write` was used when opening the file,\n`close/1` might return an old write error and not even try to close the file.\nSee `open/2` for more information.\n",
    },
    {
      name: "chown!/2",
      type: "function",
      specs: ["@spec chown!(Path.t(), non_neg_integer()) :: :ok"],
      documentation:
        "Same as `chown/2`, but raises a `File.Error` exception in case of failure.\nOtherwise `:ok`.\n",
    },
    {
      name: "chown/2",
      type: "function",
      specs: [
        "@spec chown(Path.t(), non_neg_integer()) :: :ok | {:error, posix()}",
      ],
      documentation:
        "Changes the owner given by the user ID `uid`\nfor a given `file`. Returns `:ok` on success,\nor `{:error, reason}` on failure.\n",
    },
    {
      name: "chmod!/2",
      type: "function",
      specs: ["@spec chmod!(Path.t(), non_neg_integer()) :: :ok"],
      documentation:
        "Same as `chmod/2`, but raises a `File.Error` exception in case of failure.\nOtherwise `:ok`.\n",
    },
    {
      name: "chmod/2",
      type: "function",
      specs: [
        "@spec chmod(Path.t(), non_neg_integer()) :: :ok | {:error, posix()}",
      ],
      documentation:
        "Changes the `mode` for a given `file`.\n\nReturns `:ok` on success, or `{:error, reason}` on failure.\n\n## Permissions\n\nFile permissions are specified by adding together the following octal modes:\n\n  * `0o400` - read permission: owner\n  * `0o200` - write permission: owner\n  * `0o100` - execute permission: owner\n\n  * `0o040` - read permission: group\n  * `0o020` - write permission: group\n  * `0o010` - execute permission: group\n\n  * `0o004` - read permission: other\n  * `0o002` - write permission: other\n  * `0o001` - execute permission: other\n\nFor example, setting the mode `0o755` gives it\nwrite, read and execute permission to the owner\nand both read and execute permission to group\nand others.\n",
    },
    {
      name: "chgrp!/2",
      type: "function",
      specs: ["@spec chgrp!(Path.t(), non_neg_integer()) :: :ok"],
      documentation:
        "Same as `chgrp/2`, but raises a `File.Error` exception in case of failure.\nOtherwise `:ok`.\n",
    },
    {
      name: "chgrp/2",
      type: "function",
      specs: [
        "@spec chgrp(Path.t(), non_neg_integer()) :: :ok | {:error, posix()}",
      ],
      documentation:
        "Changes the group given by the group ID `gid`\nfor a given `file`. Returns `:ok` on success, or\n`{:error, reason}` on failure.\n",
    },
    {
      name: "cd!/2",
      type: "function",
      specs: ["@spec cd!(Path.t(), (-> res)) :: res when res: var"],
      documentation:
        "Changes the current directory to the given `path`,\nexecutes the given function and then reverts back\nto the previous path regardless of whether there is an exception.\n\nThe current working directory is temporarily set for the BEAM globally. This\ncan lead to race conditions if multiple processes are changing the current\nworking directory concurrently. To run an external command in a given\ndirectory without changing the global current working directory, use the\n`:cd` option of `System.cmd/3` and `Port.open/2`.\n\nRaises an error if retrieving or changing the current\ndirectory fails.\n",
    },
    {
      name: "cd!/1",
      type: "function",
      specs: ["@spec cd!(Path.t()) :: :ok"],
      documentation:
        "The same as `cd/1`, but raises a `File.Error` exception if it fails.\n",
    },
    {
      name: "cd/1",
      type: "function",
      specs: ["@spec cd(Path.t()) :: :ok | {:error, posix()}"],
      documentation:
        "Sets the current working directory.\n\nThe current working directory is set for the BEAM globally. This can lead to\nrace conditions if multiple processes are changing the current working\ndirectory concurrently. To run an external command in a given directory\nwithout changing the global current working directory, use the `:cd` option\nof `System.cmd/3` and `Port.open/2`.\n\nReturns `:ok` if successful, `{:error, reason}` otherwise.\n",
    },
  ],
  name: "File",
  callbacks: [],
  macros: [],
  types: [
    {
      name: "on_conflict_callback/0",
      type: "type",
      specs: [
        "@type on_conflict_callback() :: (Path.t(), Path.t() -> boolean())",
      ],
      documentation: null,
    },
    {
      name: "posix_time/0",
      type: "type",
      specs: ["@type posix_time() :: integer()"],
      documentation: null,
    },
    {
      name: "erlang_time/0",
      type: "type",
      specs: [
        "@type erlang_time() ::\n        {{year :: non_neg_integer(), month :: 1..12, day :: 1..31},\n         {hour :: 0..23, minute :: 0..59, second :: 0..59}}",
      ],
      documentation: null,
    },
    {
      name: "read_offset_mode/0",
      type: "type",
      specs: ["@type read_offset_mode() :: {:read_offset, non_neg_integer()}"],
      documentation: null,
    },
    {
      name: "stream_mode/0",
      type: "type",
      specs: [
        "@type stream_mode() ::\n        encoding_mode()\n        | read_offset_mode()\n        | :append\n        | :compressed\n        | :delayed_write\n        | :trim_bom\n        | {:read_ahead, pos_integer() | false}\n        | {:delayed_write, non_neg_integer(), non_neg_integer()}",
      ],
      documentation: null,
    },
    {
      name: "encoding_mode/0",
      type: "type",
      specs: [
        "@type encoding_mode() ::\n        :utf8\n        | {:encoding,\n           :latin1\n           | :unicode\n           | :utf8\n           | :utf16\n           | :utf32\n           | {:utf16, :big | :little}\n           | {:utf32, :big | :little}}",
      ],
      documentation: null,
    },
    {
      name: "mode/0",
      type: "type",
      specs: [
        "@type mode() ::\n        :append\n        | :binary\n        | :charlist\n        | :compressed\n        | :delayed_write\n        | :exclusive\n        | :raw\n        | :read\n        | :read_ahead\n        | :sync\n        | :write\n        | {:read_ahead, pos_integer()}\n        | {:delayed_write, non_neg_integer(), non_neg_integer()}\n        | encoding_mode()",
      ],
      documentation: null,
    },
    {
      name: "stat_options/0",
      type: "type",
      specs: [
        "@type stat_options() :: [{:time, :local | :universal | :posix}]",
      ],
      documentation: null,
    },
    {
      name: "file_descriptor/0",
      type: "type",
      specs: ["@type file_descriptor() :: :file.fd()"],
      documentation: null,
    },
    {
      name: "io_device/0",
      type: "type",
      specs: ["@type io_device() :: :file.io_device()"],
      documentation: null,
    },
    {
      name: "posix/0",
      type: "type",
      specs: ["@type posix() :: :file.posix()"],
      documentation: null,
    },
  ],
};
