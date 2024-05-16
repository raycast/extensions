import ArgumentParser
import Foundation

#if arch(x86_64)
    let BCLM_KEY = "BCLM"
#else
    let BCLM_KEY = "CHWA"
#endif

struct BCLM: ParsableCommand {
    static let configuration = CommandConfiguration(
            abstract: "Battery Charge Level Max (BCLM) Utility.",
            version: "0.1.0",
            subcommands: [Read.self, Write.self, Persist.self, Unpersist.self])

    struct Read: ParsableCommand {
        static let configuration = CommandConfiguration(
            abstract: "Reads the BCLM value.")

        func run() {
            do {
                try SMCKit.open()
            } catch {
                print(error)
            }

            let key = SMCKit.getKey(BCLM_KEY, type: DataTypes.UInt8)
            do {
                let status = try SMCKit.readData(key).0
#if arch(x86_64)
                print(status)
#else
                print(status == 1 ? 80 : 100)
#endif
            } catch {
                print(error)
            }
        }
    }

    struct Write: ParsableCommand {
        static let configuration = CommandConfiguration(
            abstract: "Writes a BCLM value.")

#if arch(x86_64)
        @Argument(help: "The value to set (50-100)")
        var value: Int
#else
        @Argument(help: "The value to set (80 or 100)")
        var value: Int
#endif

        func validate() throws {
            guard getuid() == 0 else {
                throw ValidationError("Must run as root.")
            }

#if arch(x86_64)
            guard value >= 50 && value <= 100 else {
                throw ValidationError("Value must be between 50 and 100.")
            }
#else
            guard value == 80 || value == 100 else {
                throw ValidationError("Value must be either 80 or 100.")
            }
#endif
        }

        func run() {
            do {
                try SMCKit.open()
            } catch {
                print(error)
            }

            let bclm_key = SMCKit.getKey(BCLM_KEY, type: DataTypes.UInt8)

#if arch(x86_64)
            let bfcl_key = SMCKit.getKey("BFCL", type: DataTypes.UInt8)

            let bclm_bytes: SMCBytes = (
                UInt8(value), UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0),
                UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0),
                UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0),
                UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0),
                UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0)
            )

            let bfcl_bytes: SMCBytes = (
                UInt8(value - 5), UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0),
                UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0),
                UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0),
                UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0),
                UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0)
            )

            do {
                try SMCKit.writeData(bclm_key, data: bclm_bytes)
            } catch {
                print(error)
            }

            // USB-C Macs do not have the BFCL key since they don't have the
            // charging indicator
            do {
                try SMCKit.writeData(bfcl_key, data: bfcl_bytes)
            } catch SMCKit.SMCError.keyNotFound {
                // Do nothing
            } catch {
                print(error)
            }
#else
            let bclm_bytes: SMCBytes = (
                UInt8(value == 80 ? 1 : 0), UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0),
                UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0),
                UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0),
                UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0),
                UInt8(0), UInt8(0), UInt8(0), UInt8(0), UInt8(0)
            )

            do {
                try SMCKit.writeData(bclm_key, data: bclm_bytes)
            } catch {
                print(error)
            }
#endif
            if (isPersistent()) {
                updatePlist(value)
            }
        }
    }

    struct Persist: ParsableCommand {
        static let configuration = CommandConfiguration(
            abstract: "Persists bclm on reboot.")

        func validate() throws {
            guard getuid() == 0 else {
                throw ValidationError("Must run as root.")
            }
        }

        func run() {
            do {
                try SMCKit.open()
            } catch {
                print(error)
            }

            let key = SMCKit.getKey(BCLM_KEY, type: DataTypes.UInt8)
            do {
                let status = try SMCKit.readData(key).0
#if arch(x86_64)
                updatePlist(Int(status))
#else
                updatePlist(Int(status) == 1 ? 80 : 100)
#endif
            } catch {
                print(error)
            }

            persist(true)
        }
    }

    struct Unpersist: ParsableCommand {
        static let configuration = CommandConfiguration(
            abstract: "Unpersists bclm on reboot.")

        func validate() throws {
            guard getuid() == 0 else {
                throw ValidationError("Must run as root.")
            }
        }

        func run() {
            persist(false)
        }
    }
}

BCLM.main()
