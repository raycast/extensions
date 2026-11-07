import Foundation
import Testing
@testable import DigUpKit

@Suite struct PreviewQueueTests {
    @Test func queuedPreviewsCanBeCancelledWithoutBlockingTheReader() {
        let queue = PreviewQueue()
        let started = DispatchSemaphore(value: 0), release = DispatchSemaphore(value: 0)
        let finished = DispatchSemaphore(value: 0), cancelledRan = DispatchSemaphore(value: 0)
        defer { queue.cancelAll(); release.signal(); release.signal() }
        for id in 1...2 {
            queue.submit(id) { _ in
                started.signal()
                _ = release.wait(timeout: .now() + 5)
                finished.signal()
            }
        }
        #expect(started.wait(timeout: .now() + 2) == .success)
        #expect(started.wait(timeout: .now() + 2) == .success)
        queue.submit(3) { _ in cancelledRan.signal() }
        queue.cancel(3)
        let next = DispatchSemaphore(value: 0)
        queue.submit(4) { _ in next.signal() }
        release.signal(); release.signal()
        #expect(next.wait(timeout: .now() + 2) == .success)
        #expect(finished.wait(timeout: .now() + 2) == .success)
        #expect(finished.wait(timeout: .now() + 2) == .success)
        #expect(cancelledRan.wait(timeout: .now() + 0.05) == .timedOut)
    }
}
