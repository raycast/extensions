import Foundation

/// Slow previews must never occupy the protocol reader or leave cancelled thumbnails queued.
public final class PreviewQueue: @unchecked Sendable {
    private let queue: OperationQueue = {
        let queue = OperationQueue()
        queue.maxConcurrentOperationCount = 2
        return queue
    }()
    private let lock = NSLock()
    private var pending: [Int: BlockOperation] = [:]

    public init() {}

    public func submit(_ id: Int, work: @escaping @Sendable (BlockOperation) -> Void) {
        let operation = BlockOperation()
        operation.addExecutionBlock { [self, weak operation] in
            guard let operation else { return }
            defer { lock.withLock { if pending[id] === operation { pending[id] = nil } } }
            if !operation.isCancelled { work(operation) }
        }
        lock.withLock {
            pending.removeValue(forKey: id)?.cancel()
            pending[id] = operation
            queue.addOperation(operation)
        }
    }

    public func cancel(_ id: Int) {
        lock.withLock { pending.removeValue(forKey: id)?.cancel() }
    }

    public func cancelAll() {
        lock.withLock {
            for operation in pending.values { operation.cancel() }
            pending.removeAll()
        }
    }
}
