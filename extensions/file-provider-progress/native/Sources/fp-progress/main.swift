import FileProviderProgressCore
import Foundation

enum ExitCode: Int32 {
    case success = 0
    case failure = 1
}

let arguments = Array(CommandLine.arguments.dropFirst())
let command = arguments.first ?? "status"
let service = FileProviderProgressService(timeoutSeconds: 15)

switch command {
case "list":
    let domains = service.listDomains()
    if arguments.contains("--json") {
        printJSON(domains)
    } else {
        printDomains(domains)
    }

case "status":
    let report = service.status()
    if arguments.contains("--json") {
        printJSON(report)
    } else {
        printStatus(report)
    }

case "watch":
    watch(json: arguments.contains("--json"))

case "help", "--help", "-h":
    printHelp()

default:
    fputs("Unknown command: \(command)\n\n", stderr)
    printHelp()
    Foundation.exit(ExitCode.failure.rawValue)
}

@MainActor
func watch(json: Bool) {
    let delayBetweenPolls = parseInterval(arguments) ?? 10
    let estimator = SpeedEstimator()
    var previous: FileProviderStatusReport?

    while true {
        let startedAt = Date()
        var report = service.status(observedAt: startedAt)

        if let previous {
            let elapsed = startedAt.timeIntervalSince(previous.observedAt)
            report.domains = estimator.applySpeed(
                current: report.domains,
                previous: previous.domains,
                elapsedSeconds: elapsed
            )
        }

        if json {
            printJSON(report)
        } else {
            printStatus(report)
            print("")
        }

        fflush(stdout)
        previous = report
        Thread.sleep(forTimeInterval: delayBetweenPolls)
    }
}

@MainActor
func parseInterval(_ arguments: [String]) -> TimeInterval? {
    guard let index = arguments.firstIndex(of: "--interval"),
          arguments.indices.contains(arguments.index(after: index))
    else {
        return nil
    }

    return TimeInterval(arguments[arguments.index(after: index)])
}

func printDomains(_ domains: [FileProviderDomain]) {
    if domains.isEmpty {
        print("No File Provider domains found.")
        return
    }

    for domain in domains {
        print("\(domain.displayName)")
        print("  id: \(domain.fileproviderctlIdentifier)")
        print("  root: \(domain.rootPath)")
    }
}

func printStatus(_ report: FileProviderStatusReport) {
    if report.domains.isEmpty {
        print("No File Provider domains found.")
        return
    }

    for snapshot in report.domains {
        print(snapshot.displayName)

        if let error = snapshot.probeError {
            print("  Error: \(error)")
            continue
        }

        printTransfer("Uploading", snapshot.upload)
        printTransfer("Downloading", snapshot.download)

        if let pending = snapshot.health.pendingIndexableCount,
           let total = snapshot.health.totalIndexableCount {
            print("  Indexing: \(pending) pending / \(total) total")
        }

        if snapshot.health.needsAuth == true {
            print("  Health: needs sign-in")
        } else if snapshot.health.isActive == true {
            print("  Health: active")
        }
    }
}

func printTransfer(_ label: String, _ progress: TransferProgress?) {
    guard let progress else {
        print("  \(label): no active byte total")
        return
    }

    print(
        "  \(label): \(ProgressFormatting.decimalBytes(progress.completedBytes)) / " +
        "\(ProgressFormatting.decimalBytes(progress.totalBytes)) " +
        "(\(ProgressFormatting.percent(progress.fraction)))"
    )
    print(
        "    Remaining: \(ProgressFormatting.decimalBytes(progress.remainingBytes)) " +
        "(\(ProgressFormatting.binaryBytes(progress.remainingBytes)))"
    )

    if progress.bytesPerSecond != nil || progress.etaSeconds != nil {
        print("    Speed: \(ProgressFormatting.speed(progress.bytesPerSecond))")
        print("    ETA: \(ProgressFormatting.eta(progress.etaSeconds))")
    }
}

func printJSON<T: Encodable>(_ value: T) {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    encoder.dateEncodingStrategy = .iso8601

    do {
        let data = try encoder.encode(value)
        print(String(data: data, encoding: .utf8) ?? "{}")
    } catch {
        fputs("Failed to encode JSON: \(error)\n", stderr)
        Foundation.exit(ExitCode.failure.rawValue)
    }
}

func printHelp() {
    print(
        """
        Usage:
          fp-progress list [--json]
          fp-progress status [--json]
          fp-progress watch [--json] [--interval seconds]

        Watch waits 10 seconds between completed polls by default.
        --interval sets the wait time between completed polls.
        """
    )
}
