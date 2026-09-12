import Darwin
import Foundation

struct SequentialTransferExecutor {
    let configuration: BenchmarkConfiguration
    let buffer: AlignedBuffer
    let onProgress: (BenchmarkProgress) -> Void
    let isCancelled: () -> Bool

    func transfer(
        descriptor: Int32,
        direction: TransferDirection,
        phase: BenchmarkPhase,
        maximumBytes: UInt64,
        flushToMedia: Bool
    ) throws -> TransferSample {
        let startedAt = DispatchTime.now().uptimeNanoseconds
        var processed: UInt64 = 0
        var windowSpeeds: [Double] = []
        let stabilityWindowBytes = min(maximumBytes, UInt64(64 * 1_048_576))
        var windowStartedAt = startedAt
        var windowBytes: UInt64 = 0

        while processed < maximumBytes {
            guard !isCancelled() else {
                throw BenchmarkRunnerError.cancelled
            }

            let elapsed = seconds(since: startedAt)
            if processed > 0, elapsed >= configuration.targetDurationSeconds {
                break
            }

            let requested = min(UInt64(configuration.chunkSizeBytes), maximumBytes - processed)
            var transferred = 0

            while transferred < Int(requested) {
                let patternOffset = (Int(processed) + transferred) % buffer.byteCount
                let availablePatternBytes = buffer.byteCount - patternOffset
                let transferSize = min(Int(requested) - transferred, availablePatternBytes)
                let pointer = buffer.pointer.advanced(by: patternOffset)
                let result: Int
                switch direction {
                case .write:
                    result = Darwin.write(descriptor, pointer, transferSize)
                case .read:
                    result = Darwin.read(descriptor, pointer, transferSize)
                }

                if result < 0, errno == EINTR {
                    continue
                }
                guard result > 0 else {
                    if direction == .read, result == 0 {
                        throw BenchmarkRunnerError.unexpectedEndOfFile
                    }
                    throw BenchmarkRunnerError.posix(
                        operation: direction == .write ? "write benchmark data" : "read benchmark data",
                        code: errno
                    )
                }
                transferred += result
            }

            processed += UInt64(transferred)
            windowBytes += UInt64(transferred)
            if windowBytes >= stabilityWindowBytes {
                let windowDuration = seconds(since: windowStartedAt)
                if windowDuration > 0 {
                    windowSpeeds.append(Double(windowBytes) / 1_000_000 / windowDuration)
                }
                windowBytes = 0
                windowStartedAt = DispatchTime.now().uptimeNanoseconds
            }
            let totalDuration = seconds(since: startedAt)
            onProgress(
                BenchmarkProgress(
                    phase: phase,
                    bytesProcessed: processed,
                    totalBytes: maximumBytes,
                    throughputMBps: totalDuration > 0 ? Double(processed) / 1_000_000 / totalDuration : 0
                )
            )
        }

        if windowBytes > 0 {
            let windowDuration = seconds(since: windowStartedAt)
            if windowDuration > 0 {
                windowSpeeds.append(Double(windowBytes) / 1_000_000 / windowDuration)
            }
        }

        if flushToMedia {
            try flushToPermanentStorage(descriptor)
        }

        let duration = seconds(since: startedAt)
        guard processed > 0, duration > 0 else {
            throw BenchmarkRunnerError.noDataMeasured
        }

        onProgress(
            BenchmarkProgress(
                phase: phase,
                bytesProcessed: processed,
                totalBytes: maximumBytes,
                throughputMBps: Double(processed) / 1_000_000 / duration
            )
        )
        return TransferSample(bytes: processed, durationSeconds: duration, windowSpeeds: windowSpeeds)
    }

    private func flushToPermanentStorage(_ descriptor: Int32) throws {
        if fcntl(descriptor, F_FULLFSYNC, 0) == 0 {
            return
        }

        let fullSyncError = errno
        if fullSyncError == EINVAL || fullSyncError == ENOTSUP {
            guard fsync(descriptor) == 0 else {
                throw BenchmarkRunnerError.posix(operation: "flush benchmark data", code: errno)
            }
            return
        }
        throw BenchmarkRunnerError.posix(operation: "flush benchmark data", code: fullSyncError)
    }

    private func seconds(since start: UInt64) -> Double {
        Double(DispatchTime.now().uptimeNanoseconds - start) / 1_000_000_000
    }
}

enum TransferDirection: Equatable {
    case write
    case read
}

struct TransferSample {
    let bytes: UInt64
    let durationSeconds: Double
    let variation: Double
    let stabilityWindowCount: Int

    init(bytes: UInt64, durationSeconds: Double, windowSpeeds: [Double]) {
        self.bytes = bytes
        self.durationSeconds = durationSeconds
        self.variation = Self.coefficientOfVariation(windowSpeeds)
        self.stabilityWindowCount = windowSpeeds.count
    }

    var measurement: BenchmarkMeasurement {
        BenchmarkMeasurement(
            durationSeconds: durationSeconds,
            megabytesPerSecond: Double(bytes) / 1_000_000 / durationSeconds,
            variation: variation
        )
    }

    private static func coefficientOfVariation(_ values: [Double]) -> Double {
        guard values.count > 1 else { return 0 }
        let mean = values.reduce(0, +) / Double(values.count)
        guard mean > 0 else { return 0 }
        let variance = values.reduce(0) { total, value in
            total + pow(value - mean, 2)
        } / Double(values.count)
        return sqrt(variance) / mean
    }
}

final class AlignedBuffer {
    let pointer: UnsafeMutableRawPointer
    let byteCount: Int

    init(byteCount: Int) throws {
        var allocated: UnsafeMutableRawPointer?
        let result = posix_memalign(&allocated, 4_096, byteCount)
        guard result == 0, let allocated else {
            throw BenchmarkRunnerError.posix(operation: "allocate aligned buffer", code: Int32(result))
        }
        self.pointer = allocated
        self.byteCount = byteCount
    }

    deinit {
        free(pointer)
    }

    func fillDeterministicHighEntropyData() {
        let words = pointer.bindMemory(to: UInt64.self, capacity: byteCount / MemoryLayout<UInt64>.size)
        var state: UInt64 = 0x9E37_79B9_7F4A_7C15

        for index in 0..<(byteCount / MemoryLayout<UInt64>.size) {
            state ^= state >> 12
            state ^= state << 25
            state ^= state >> 27
            words[index] = state &* 0x2545_F491_4F6C_DD1D
        }
    }
}
