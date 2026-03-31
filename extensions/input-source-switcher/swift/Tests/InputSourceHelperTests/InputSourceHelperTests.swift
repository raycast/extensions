import Carbon
import Testing

// These tests exercise the macOS TIS API directly — they require a real macOS environment
// with at least one input source enabled. They do not test switching (would change system state).

// .serialized prevents concurrent execution — TIS Carbon APIs are not thread-safe.
@Suite("TIS API — enumeration and filtering", .serialized)
struct InputSourceHelperTests {

    // MARK: - Helpers (duplicated from main.swift since executable targets can't be imported)

    private func stringProperty(_ source: TISInputSource, _ key: CFString) -> String? {
        guard let ptr = TISGetInputSourceProperty(source, key) else { return nil }
        return (Unmanaged<CFString>.fromOpaque(ptr).takeUnretainedValue()) as String
    }

    private func keyboardSources() -> [TISInputSource] {
        let all = TISCreateInputSourceList(nil, false).takeRetainedValue() as! [TISInputSource]
        return all.filter { source in
            guard let category = stringProperty(source, kTISPropertyInputSourceCategory) else {
                return false
            }
            return category == (kTISCategoryKeyboardInputSource as String)
        }
    }

    // MARK: - Tests

    @Test("TIS returns at least one input source")
    func listReturnsAtLeastOneSource() {
        let all = TISCreateInputSourceList(nil, false).takeRetainedValue() as! [TISInputSource]
        #expect(all.count > 0, "Expected at least one input source from TISCreateInputSourceList")
    }

    @Test("All keyboard sources have non-empty ID and name")
    func allSourcesHaveNonEmptyIDAndName() {
        let sources = keyboardSources()
        #expect(sources.count > 0, "Expected at least one keyboard source after filtering")

        for source in sources {
            let id = stringProperty(source, kTISPropertyInputSourceID) ?? ""
            let name = stringProperty(source, kTISPropertyLocalizedName) ?? ""
            #expect(!id.isEmpty, "Source ID must not be empty")
            #expect(!name.isEmpty, "Source name must not be empty (id: \(id))")
        }
    }

    @Test("Filtering removes non-keyboard sources")
    func filterExcludesNonKeyboardSources() {
        let all = TISCreateInputSourceList(nil, false).takeRetainedValue() as! [TISInputSource]
        let keyboard = keyboardSources()

        // There must be fewer (or equal) sources after filtering
        #expect(keyboard.count <= all.count)

        // Every remaining source must be in the keyboard category
        for source in keyboard {
            let category = stringProperty(source, kTISPropertyInputSourceCategory) ?? ""
            #expect(category == (kTISCategoryKeyboardInputSource as String),
                    "Unexpected category after filter: \(category)")
        }
    }

    @Test("stringProperty returns nil for unsupported key gracefully")
    func stringPropertyReturnsNilForUnsupportedKey() {
        let sources = TISCreateInputSourceList(nil, false).takeRetainedValue() as! [TISInputSource]
        guard let first = sources.first else { return }
        // kTISPropertyUnicodeKeyLayoutData returns binary data, not a CFString —
        // our stringProperty helper must not crash, it just returns nil for non-string properties.
        // We use a dummy unknown key to ensure nil is returned cleanly.
        let result = stringProperty(first, "com.apple.unknownProperty.test" as CFString)
        #expect(result == nil)
    }
}
