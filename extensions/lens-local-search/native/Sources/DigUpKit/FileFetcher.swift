#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
import Foundation

/// Downloads one model file into `<folder>/<name>.partial`, resuming from what's there (an HTTP range, kept across
/// Hugging Face's redirect to its CDN), writing as it comes (memory stays small), and saying how far it got. The app's
/// `ModelDownload` and the helper's `download-model` both use it; checking the file (size, SHA-256) is theirs. It reports
/// the bytes on disk at most 5 times a second, then how it went, on its own queue.
public final class FileFetcher: NSObject, URLSessionDataDelegate, @unchecked Sendable {
    public enum Outcome: Sendable {
        case downloaded(URL)
        case failed(String, retry: Bool)
    }

    private let file: ModelFiles.File
    private let partial: URL
    private let progress: @Sendable (Int64) -> Void
    private let waiting: @Sendable () -> Void
    private let done: @Sendable (Outcome) -> Void
    // The session's delegate queue only (after `start`).
    private var session: URLSession?
    private var handle: FileHandle?
    private var written: Int64 = 0
    private var problem: (message: String, retry: Bool)?
    private var reported = Date.distantPast

    public init(file: ModelFiles.File, folder: URL, progress: @escaping @Sendable (Int64) -> Void,
         waiting: @escaping @Sendable () -> Void, done: @escaping @Sendable (Outcome) -> Void) {
        self.file = file
        partial = folder.appendingPathComponent(file.name + ".partial")
        self.progress = progress
        self.waiting = waiting
        self.done = done
    }

    /// The file's size now. (Not through URL resource values: a URL keeps the first size it read, so asking the same
    /// URL again after the download said the resumed file was still as small as when it resumed.)
    public static func size(of url: URL) -> Int64 {
        ((try? FileManager.default.attributesOfItem(atPath: url.path))?[.size] as? NSNumber)?.int64Value ?? 0
    }

    public func start() {
        written = Self.size(of: partial)
        if written > file.bytes {
            try? FileManager.default.removeItem(at: partial)
            written = 0
        }
        if written == file.bytes { return done(.downloaded(partial)) }
        let configuration = URLSessionConfiguration.ephemeral
        #if !canImport(FoundationNetworking)
        configuration.waitsForConnectivity = true        // offline: wait for the network instead of failing
        #endif                                           // (elsewhere it fails, and the caller tries again)
        configuration.timeoutIntervalForRequest = 60     // no bytes for a minute: fail, then retry from here
        configuration.timeoutIntervalForResource = 7 * 24 * 3600
        configuration.urlCache = nil
        let queue = OperationQueue()
        queue.maxConcurrentOperationCount = 1
        let session = URLSession(configuration: configuration, delegate: self, delegateQueue: queue)
        self.session = session
        var request = URLRequest(url: file.url)
        if written > 0 { request.setValue("bytes=\(written)-", forHTTPHeaderField: "Range") }
        session.dataTask(with: request).resume()
    }

    public func cancel() {
        session?.invalidateAndCancel()
    }

    // Hugging Face redirects to its CDN; the range has to come along.
    public func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        var request = request
        if let range = task.originalRequest?.value(forHTTPHeaderField: "Range") {
            request.setValue(range, forHTTPHeaderField: "Range")
        }
        completionHandler(request)
    }

    public func urlSession(_ session: URLSession, taskIsWaitingForConnectivity task: URLSessionTask) {
        waiting()
    }

    public func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse,
                    completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        switch status {
        case 206:
            let range = (response as? HTTPURLResponse)?.value(forHTTPHeaderField: "Content-Range") ?? ""
            guard range.hasPrefix("bytes \(written)-") else {
                // Not where we asked: start the file over next time.
                try? FileManager.default.removeItem(at: partial)
                problem = ("The download couldn't resume", true)
                return completionHandler(.cancel)
            }
        case 200:
            written = 0   // the whole file, from the start
        default:
            problem = ("Hugging Face answered \(status)", status == 429 || status >= 500)
            return completionHandler(.cancel)
        }
        do {
            if !FileManager.default.fileExists(atPath: partial.path) {
                FileManager.default.createFile(atPath: partial.path, contents: nil)
            }
            let handle = try FileHandle(forWritingTo: partial)
            try handle.truncate(atOffset: UInt64(written))
            try handle.seekToEnd()
            self.handle = handle
            completionHandler(.allow)
        } catch {
            problem = ("Can't save the model: \(error.localizedDescription)", false)
            completionHandler(.cancel)
        }
    }

    public func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        do {
            try handle?.write(contentsOf: data)
            written += Int64(data.count)
        } catch {
            problem = ("Can't save the model: \(error.localizedDescription)", false)
            dataTask.cancel()
            return
        }
        let now = Date()
        if now.timeIntervalSince(reported) >= 0.2 {
            reported = now
            progress(written)
        }
    }

    public func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        try? handle?.close()
        handle = nil
        session.finishTasksAndInvalidate()
        progress(written)
        if let problem {
            done(.failed(problem.message, retry: problem.retry))
        } else if let error {
            if (error as NSError).code == NSURLErrorCancelled { return }   // cancel()
            done(.failed(error.localizedDescription, retry: true))
        } else if written == file.bytes {
            done(.downloaded(partial))
        } else {
            done(.failed("The download stopped early", retry: true))
        }
    }
}
