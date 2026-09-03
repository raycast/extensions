import Foundation

func commandUsage() -> String {
    "mouse-scroll-helper devices | access [--prompt] | run --config <path> --state <path> | status --state <path> --expected-executable <path> | stop --state <path> --expected-executable <path> | version\n"
}

func renderedError(_ error: Error) -> String {
    "\(error.localizedDescription)\n"
}
