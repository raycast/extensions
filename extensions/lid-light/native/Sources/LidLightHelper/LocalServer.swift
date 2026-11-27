import AppKit
import Network

@MainActor
final class LocalServer {
    private let listener: NWListener
    private let lock: Int32

    init(directory: String, handle: @escaping @MainActor (Data) async -> Data) throws {
        if mkdir(directory, 0o700) != 0, errno != EEXIST { throw Self.systemError() }
        var info = stat()
        guard lstat(directory, &info) == 0, info.st_uid == getuid(),
              info.st_mode & S_IFMT == S_IFDIR, info.st_mode & 0o777 == 0o700 else {
            throw POSIXError(.EACCES)
        }

        let lock = open(directory + "/lock", O_CREAT | O_RDONLY | O_NOFOLLOW | O_CLOEXEC, 0o600)
        guard lock >= 0 else { throw Self.systemError() }
        do {
            guard flock(lock, LOCK_EX | LOCK_NB) == 0 else { throw Self.systemError() }
            let path = directory + "/control.sock"
            if unlink(path) != 0, errno != ENOENT { throw Self.systemError() }
            let parameters = NWParameters.tcp
            parameters.requiredLocalEndpoint = .unix(path: path)
            let listener = try NWListener(using: parameters)
            self.listener = listener
            self.lock = lock
        } catch {
            close(lock)
            throw error
        }

        listener.newConnectionHandler = { connection in
            connection.start(queue: .main)
            // Only one bounded, newline-terminated JSON request is allowed per connection.
            Self.receive(connection, accumulated: Data(), handle: handle)
            DispatchQueue.main.asyncAfter(deadline: .now() + 125) { connection.cancel() }
        }
        listener.stateUpdateHandler = { state in
            if case .failed(let error) = state {
                NSLog("Lid Light listener failed: %@", error.localizedDescription)
                Task { @MainActor in NSApp.terminate(nil) }
            }
        }
        listener.start(queue: .main)
    }

    private nonisolated static func receive(
        _ connection: NWConnection, accumulated: Data, handle: @escaping @MainActor (Data) async -> Data
    ) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 2048) { data, _, complete, error in
            guard error == nil, let data, accumulated.count + data.count <= 8192 else {
                connection.cancel()
                return
            }
            let request = accumulated + data
            if let newline = request.firstIndex(of: 10) {
                Task { @MainActor in
                    let result = await handle(Data(request[..<newline]))
                    connection.send(content: result + Data([10]), completion: .contentProcessed { _ in
                        connection.cancel()
                    })
                }
            } else if complete {
                connection.cancel()
            } else {
                receive(connection, accumulated: request, handle: handle)
            }
        }
    }

    private static func systemError() -> POSIXError {
        POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO)
    }
}
