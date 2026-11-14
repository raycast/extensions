import Foundation

/// The same handlers support the diagnostic CLI and the command-scoped stdin session.
enum BrowserHelperRuntime {
  typealias Handler = ([String]) throws -> Void

  static func run(list: Handler, focus: Handler) {
    let args = Array(CommandLine.arguments.dropFirst())
    if args.first == "serve" {
      runSession(list: list, focus: focus)
    } else {
      do {
        try dispatch(args, list: list, focus: focus)
      } catch {
        fputs((error as NSError).localizedDescription + "\n", stderr)
        exit(1)
      }
    }
  }

  private static func runSession(list: Handler, focus: Handler) {
    while let line = readLine() {
      do {
        let args = try JSONDecoder().decode([String].self, from: Data(line.utf8))
        try dispatch(args, list: list, focus: focus)
      } catch {
        let response = ["error": (error as NSError).localizedDescription]
        if let data = try? JSONEncoder().encode(response) {
          print(String(decoding: data, as: UTF8.self))
        }
      }
      fflush(stdout)
    }
  }

  private static func dispatch(_ args: [String], list: Handler, focus: Handler) throws {
    guard let command = args.first else {
      throw NSError(domain: "BrowserAX", code: 1, userInfo: [NSLocalizedDescriptionKey: "Missing command"])
    }
    let rest = Array(args.dropFirst())
    switch command {
    case "list": try list(rest)
    case "focus": try focus(rest)
    default:
      throw NSError(domain: "BrowserAX", code: 1, userInfo: [NSLocalizedDescriptionKey: "Unknown command"])
    }
  }
}
