import XCTest
import class Foundation.Bundle

let launchctl = "/bin/launchctl"
let plist = "com.zackelia.bclm.plist"
let plist_path = "/Library/LaunchDaemons/\(plist)"

final class bclmTests: XCTestCase {

    /// Helper method to run bclm
    func bclm(args: String...) -> String! {
        // Some of the APIs that we use below are available in macOS 10.13 and above.
        guard #available(macOS 10.13, *) else {
            XCTFail("macOS version >= 10.13 required to run tests.")
            return ""
        }

        let binary = self.productsDirectory.appendingPathComponent("bclm")
        let process = Process()
        let pipe = Pipe()

        process.executableURL = binary
        process.arguments = args
        process.standardOutput = pipe
        process.standardError = pipe

        do {
            try process.run()
        }
        catch {
            XCTFail("Could not start bclm process.")
        }

        process.waitUntilExit()

        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        let output = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)

        return output
    }

    /// Helper method to check if persistent
    func isPersistent() -> Bool {
        let process = Process()
        let pipe = Pipe()

        process.launchPath = launchctl
        process.arguments = ["list"]
        process.standardOutput = pipe
        process.standardError = pipe

        process.launch()

        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        let output = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)

        if (output != nil && output!.contains(plist)) {
            return true
        } else {
            return false
        }
    }

    /// Helper method to run bclm read
    func readBCLM() -> String!  {
        return bclm(args: "read")
    }

    /// Helper method to run bclm write
    func writeBCLM(value: Int) -> String!  {
        return bclm(args: "write", String(value))
    }

    /// Helper method to run bclm persist
    func persistBCLM() -> String!  {
        return bclm(args: "persist")
    }

    /// Helper method to run bclm unpersist
    func unpersistBCLM() -> String!  {
        return bclm(args: "unpersist")
    }

    /// Verify that reading the bclm returns a value
    func testRead() {
        var bclm: Int!

        bclm = Int(readBCLM()!)!
        XCTAssertNotNil(bclm)
    }

    /// Verify that writing a valid bclm value works
    func testWriteValid() {
        var bclm: Int!
        var output: String!

        // Get the current value to not mess up the runner's configuration
        bclm = Int(readBCLM()!)!

        output = writeBCLM(value: bclm)!
        XCTAssertEqual(output, "")
    }

    // Verify that writing an invalid bclm value did not work
    func testWriteInvalid() throws {
        var output: String!

        output = writeBCLM(value: 101)!
        XCTAssertNotEqual(output, "")

        output = writeBCLM(value: 0)!
        XCTAssertNotEqual(output, "")

#if arch(arm64)
        output = writeBCLM(value: 79)!
        XCTAssertNotEqual(output, "")
#endif
    }

    /// Verify that persisting works
    func testPersist() {
        var output: String!
        var persist: Bool!

        // Get the current value to not mess up the runner's configuration
        persist = isPersistent()

        _ = unpersistBCLM()
        XCTAssertFalse(isPersistent())
        do {
            try FileManager.default.removeItem(at: URL(fileURLWithPath: plist_path))
        } catch {
            // Not an error if the file didn't exist
        }

        output = persistBCLM()!
        XCTAssertEqual(output, "")
        XCTAssertTrue(isPersistent())
        XCTAssertTrue(FileManager.default.fileExists(atPath: plist_path))

        // Second call shouldn't fail, but it should print an error
        output = persistBCLM()!
        XCTAssertNotEqual(output, "")
        XCTAssertTrue(isPersistent())
        XCTAssertTrue(FileManager.default.fileExists(atPath: plist_path))

        // Restore runner setup
        if !persist {
            _ = unpersistBCLM()
        }
    }

    /// Verify that unpersisting works
    func testUnpersist() {
        var output: String!
        var persist: Bool!

        // Get the current value to not mess up the runner's configuration
        persist = isPersistent()

        _ = persistBCLM()
        XCTAssertTrue(isPersistent())

        output = unpersistBCLM()!
        XCTAssertEqual(output, "")
        XCTAssertFalse(isPersistent())
        XCTAssertFalse(FileManager.default.fileExists(atPath: plist_path))

        // Second call shouldn't fail, but it should print an error
        output = unpersistBCLM()!
        XCTAssertNotEqual(output, "")
        XCTAssertFalse(isPersistent())
        XCTAssertFalse(FileManager.default.fileExists(atPath: plist_path))

        // Restore runner setup
        if persist {
            _ = persistBCLM()
        }
    }

    /// Returns path to the built products directory.
    var productsDirectory: URL {
      #if os(macOS)
        for bundle in Bundle.allBundles where bundle.bundlePath.hasSuffix(".xctest") {
            return bundle.bundleURL.deletingLastPathComponent()
        }
        fatalError("couldn't find the products directory")
      #else
        return Bundle.main.bundleURL
      #endif
    }

    static var allTests = [
        ("testRead", testRead),
        ("testWriteValid", testWriteValid),
        ("testWriteInvalid", testWriteInvalid),
        ("testPersist", testPersist),
        ("testUnpersist", testUnpersist),
    ]
}
