// SHA-256 where CryptoKit isn't there (Linux, Windows): the way CryptoKit's `SHA256` is used here (`update(data:)`,
// `finalize()`, `hash(data:)`), for checking downloads against their published checksums. FIPS 180-4, checked against
// CryptoKit's digests when it was written and by `IndexStoreTests` ("abc", a long file).
#if !canImport(CryptoKit)
import Foundation

struct SHA256 {
    private var state: [UInt32] = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
                                   0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]
    private var pending: [UInt8] = []   // less than a block
    private var length: UInt64 = 0      // bytes seen

    init() {}

    static func hash(data: Data) -> [UInt8] {
        var sha = SHA256()
        sha.update(data: data)
        return sha.finalize()
    }

    mutating func update(data: Data) {
        length += UInt64(data.count)
        pending.append(contentsOf: data)
        var offset = 0
        while pending.count - offset >= 64 {
            compress(pending, at: offset)
            offset += 64
        }
        pending.removeFirst(offset)
    }

    /// The digest, 32 bytes.
    func finalize() -> [UInt8] {
        var copy = self
        var tail = pending
        tail.append(0x80)
        while tail.count % 64 != 56 { tail.append(0) }
        let bits = length * 8
        for shift in stride(from: 56, through: 0, by: -8) { tail.append(UInt8((bits >> UInt64(shift)) & 0xff)) }
        var offset = 0
        while offset < tail.count {
            copy.compress(tail, at: offset)
            offset += 64
        }
        var digest: [UInt8] = []
        for word in copy.state {
            for shift in stride(from: 24, through: 0, by: -8) { digest.append(UInt8((word >> UInt32(shift)) & 0xff)) }
        }
        return digest
    }

    private static let rounds: [UInt32] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ]

    private mutating func compress(_ bytes: [UInt8], at offset: Int) {
        var w = [UInt32](repeating: 0, count: 64)
        for i in 0..<16 {
            let b = offset + i * 4
            w[i] = UInt32(bytes[b]) << 24 | UInt32(bytes[b + 1]) << 16 | UInt32(bytes[b + 2]) << 8 | UInt32(bytes[b + 3])
        }
        for i in 16..<64 {
            let s0 = rotate(w[i - 15], 7) ^ rotate(w[i - 15], 18) ^ (w[i - 15] >> 3)
            let s1 = rotate(w[i - 2], 17) ^ rotate(w[i - 2], 19) ^ (w[i - 2] >> 10)
            w[i] = w[i - 16] &+ s0 &+ w[i - 7] &+ s1
        }
        var a = state[0], b = state[1], c = state[2], d = state[3]
        var e = state[4], f = state[5], g = state[6], h = state[7]
        for i in 0..<64 {
            let sum1 = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)
            let choice = (e & f) ^ (~e & g)
            let t1 = h &+ sum1 &+ choice &+ Self.rounds[i] &+ w[i]
            let sum0 = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)
            let majority = (a & b) ^ (a & c) ^ (b & c)
            let t2 = sum0 &+ majority
            h = g; g = f; f = e; e = d &+ t1
            d = c; c = b; b = a; a = t1 &+ t2
        }
        state[0] &+= a; state[1] &+= b; state[2] &+= c; state[3] &+= d
        state[4] &+= e; state[5] &+= f; state[6] &+= g; state[7] &+= h
    }

    private func rotate(_ x: UInt32, _ n: UInt32) -> UInt32 { (x >> n) | (x << (32 - n)) }
}
#endif
