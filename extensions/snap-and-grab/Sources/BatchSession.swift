import Foundation

struct BatchSession {
    private(set) var files: [URL] = []
    private(set) var capturing = false
    private(set) var closing = false
    private(set) var finished = false
    private(set) var availableCount = 0
    private var began = false
    private var readySince: TimeInterval = 0
    private var previousFiles: [URL] = []
    private var nextPrevious = 0

    mutating func beginCapture() -> Bool {
        guard !began, !closing, !finished else { return false }
        began = true
        capturing = true
        return true
    }

    mutating func captureCompleted(file: URL?, history: [URL], completedAt: TimeInterval = ProcessInfo.processInfo.systemUptime) -> Bool {
        capturing = false
        readySince = completedAt
        if let file {
            files = [file]
            var seen: Set<URL> = [file.resolvingSymlinksInPath().standardizedFileURL]
            previousFiles = history.filter { seen.insert($0.resolvingSymlinksInPath().standardizedFileURL).inserted }
            availableCount = previousFiles.count + 1
        } else { closing = true }
        if closing { finished = true }
        return finished
    }

    mutating func selectPrevious(requestedAt: TimeInterval = ProcessInfo.processInfo.systemUptime) -> Bool {
        guard began, !capturing, !closing, !finished, requestedAt >= readySince,
              nextPrevious < previousFiles.count else { return false }
        files.append(previousFiles[nextPrevious])
        nextPrevious += 1
        return true
    }

    mutating func modifiersReleased() -> Bool {
        closing = true
        if !capturing { finished = true }
        return finished
    }
}
