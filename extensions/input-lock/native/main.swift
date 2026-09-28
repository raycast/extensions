import Darwin
import Foundation

let arguments = Array(CommandLine.arguments.dropFirst())
signal(SIGPIPE, SIG_IGN)
#if GUARDIAN_TESTING
if arguments.count == 2 && arguments[0] == "--guardian-test-worker" { testWorker(arguments[1]) }
if arguments.count == 3 && arguments[0] == "--guardian-test" {
    let duration: LockDuration = arguments[2] == "timed" ? .timed(0.25) : .indefinite
    let policy = arguments[1] == "frozenProduction" ? GuardianPolicy() : GuardianPolicy(heartbeat: 0.3, grace: 0.15, startup: 1)
    let mode = arguments[1] == "frozenProduction" ? "frozen" : arguments[1]
    exit(supervise(duration, policy: policy, workerArguments: ["--guardian-test-worker", mode]))
}
#endif
switch arguments {
case ["--probe"]: probe()
case ["--self-test"]: selfTest()
case ["--test-escape"]: LockController().testEscape()
case let values where values.count == 2 && values[0] == "--lock":
    guard let duration = LockDuration(values[1]) else { fputs("unsupported lock duration\n", stderr); exit(2) }
    exit(supervise(duration))
case let values where values.count == 2 && values[0] == "--worker":
    var input = stat(), output = stat()
    guard let parent = Int32(values[1]), hasGuardianParent(parent),
          fstat(STDIN_FILENO, &input) == 0, fstat(STDOUT_FILENO, &output) == 0,
          input.st_mode & S_IFMT == S_IFIFO, output.st_mode & S_IFMT == S_IFIFO else { exit(2) }
    LockController().start()
default:
    fputs("usage: input-lock --lock <600|1800|3600|7200|18000|indefinite> | --probe | --self-test | --test-escape\n", stderr)
    exit(2)
}
