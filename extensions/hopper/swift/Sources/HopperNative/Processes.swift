import Darwin

/// A process, as returned to TypeScript. Agent sources use this to tell live agents from leftovers, find the
/// terminal an agent runs in (its tty and parent chain), and spot agent CLIs by name.
struct RunningProcess: Codable {
  let pid: Int
  let ppid: Int
  /// Controlling terminal without "/dev/" (e.g. "ttys003"), or "" for none.
  let tty: String
  /// For processes with a terminal: the file name the program was started as (argv[0]: `claude`, where the
  /// executable itself is a versioned file like `2.1.283`), or for script interpreters (node, bun, python) the
  /// script's, so `codex` or `gemini` installed through npm are recognized. Otherwise the kernel's name
  /// (`p_comm`, at most 16 characters).
  let name: String
  /// Start time, milliseconds since 1970: with the pid it identifies a process (pids get reused).
  let startedAt: Double
  /// Working directory, for processes with a terminal only (agents' projects); "" otherwise or if unreadable.
  let cwd: String
  /// Paths of the Unix sockets the process is connected to, for herdr clients only (which session each is
  /// attached to: `<session dir>/herdr-client.sock`); empty otherwise.
  let sockets: [String]
}

/// Processes whose socket connections are read (see RunningProcess.sockets).
private let socketsReadFor: Set<String> = ["herdr"]

private let interpreters: Set<String> = ["node", "bun", "deno", "python", "python3", "ruby"]

/// Every process, from one sysctl read (a few ms; no permissions needed). All users', not just ours: a terminal's
/// `login` runs as root, and parent chains from an agent to its terminal app go through it.
func readProcesses() -> [RunningProcess] {
  var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_ALL, 0]
  var size = 0
  guard sysctl(&mib, UInt32(mib.count), nil, &size, nil, 0) == 0 else { return [] }
  // Room for processes started between the two calls.
  size += size / 8
  let capacity = size / MemoryLayout<kinfo_proc>.stride
  var procs = [kinfo_proc](repeating: kinfo_proc(), count: capacity)
  guard sysctl(&mib, UInt32(mib.count), &procs, &size, nil, 0) == 0 else { return [] }
  let count = size / MemoryLayout<kinfo_proc>.stride

  return procs.prefix(count).map { proc in
    let pid = Int(proc.kp_proc.p_pid)
    var comm = proc.kp_proc.p_comm
    let command = withUnsafeBytes(of: &comm) { String(decoding: $0.prefix { $0 != 0 }, as: UTF8.self) }
    let start = proc.kp_proc.p_starttime
    let tty = ttyName(proc.kp_eproc.e_tdev)
    let name = tty.isEmpty ? command : (commandName(pid: pid, executable: command) ?? command)
    return RunningProcess(
      pid: pid,
      ppid: Int(proc.kp_eproc.e_ppid),
      tty: tty,
      name: name,
      startedAt: Double(start.tv_sec) * 1000 + Double(start.tv_usec) / 1000,
      cwd: tty.isEmpty ? "" : (workingDirectory(pid: pid) ?? ""),
      sockets: !tty.isEmpty && socketsReadFor.contains(name) ? connectedSockets(pid: pid) : []
    )
  }
}

/// Paths of the Unix sockets `pid` has connected to (each socket's peer address), without duplicates.
private func connectedSockets(pid: Int) -> [String] {
  let bytes = proc_pidinfo(Int32(pid), PROC_PIDLISTFDS, 0, nil, 0)
  guard bytes > 0 else { return [] }
  var fds = [proc_fdinfo](repeating: proc_fdinfo(), count: Int(bytes) / MemoryLayout<proc_fdinfo>.stride)
  let read = proc_pidinfo(Int32(pid), PROC_PIDLISTFDS, 0, &fds, bytes)
  guard read > 0 else { return [] }
  var paths: [String] = []
  for fd in fds.prefix(Int(read) / MemoryLayout<proc_fdinfo>.stride)
  where fd.proc_fdtype == UInt32(PROX_FDTYPE_SOCKET) {
    var info = socket_fdinfo()
    let size = Int32(MemoryLayout<socket_fdinfo>.size)
    guard proc_pidfdinfo(Int32(pid), fd.proc_fd, PROC_PIDFDSOCKETINFO, &info, size) == size,
      info.psi.soi_family == AF_UNIX
    else { continue }
    var unix = info.psi.soi_proto.pri_un
    let path = withUnsafeBytes(of: &unix.unsi_caddr.ua_sun.sun_path) {
      String(decoding: $0.prefix { $0 != 0 }, as: UTF8.self)
    }
    if !path.isEmpty && !paths.contains(path) { paths.append(path) }
  }
  return paths
}

private func workingDirectory(pid: Int) -> String? {
  var info = proc_vnodepathinfo()
  let size = Int32(MemoryLayout<proc_vnodepathinfo>.size)
  guard proc_pidinfo(Int32(pid), PROC_PIDVNODEPATHINFO, 0, &info, size) == size else { return nil }
  let path = withUnsafeBytes(of: &info.pvi_cdir.vip_path) { String(decoding: $0.prefix { $0 != 0 }, as: UTF8.self) }
  return path.isEmpty ? nil : path
}

private func ttyName(_ device: dev_t) -> String {
  guard device != -1, let name = devname(device, S_IFCHR) else { return "" }
  let text = String(cString: name)
  return text == "??" ? "" : text
}

/// File name of argv[0] (without a login shell's leading "-"), or for interpreters of the script they run: the
/// first argument not starting with "-". Only that file name leaves this function; other arguments can hold
/// secrets and are never returned.
private func commandName(pid: Int, executable: String) -> String? {
  var mib: [Int32] = [CTL_KERN, KERN_PROCARGS2, Int32(pid)]
  var size = 0
  guard sysctl(&mib, 3, nil, &size, nil, 0) == 0, size > 0 else { return nil }
  var buffer = [UInt8](repeating: 0, count: size)
  guard sysctl(&mib, 3, &buffer, &size, nil, 0) == 0, size > MemoryLayout<Int32>.size else { return nil }
  // Layout: argc (Int32), executable path, NUL padding, then argv[0], argv[1], ... NUL-separated.
  let argc = buffer.withUnsafeBytes { $0.load(as: Int32.self) }
  var index = MemoryLayout<Int32>.size
  while index < size && buffer[index] != 0 { index += 1 }
  while index < size && buffer[index] == 0 { index += 1 }
  var args: [String] = []
  while index < size && args.count < Int(argc) {
    let start = index
    while index < size && buffer[index] != 0 { index += 1 }
    args.append(String(decoding: buffer[start..<index], as: UTF8.self))
    index += 1
  }
  let fileName = { (path: String) in path.split(separator: "/").last.map(String.init) }
  if interpreters.contains(executable) {
    return args.dropFirst().first(where: { !$0.hasPrefix("-") }).flatMap(fileName)
  }
  return args.first.flatMap(fileName).map { $0.hasPrefix("-") ? String($0.dropFirst()) : $0 }
}
