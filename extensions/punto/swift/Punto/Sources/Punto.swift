import RaycastSwiftMacros
import Cocoa
import Foundation
import Carbon

struct InputSource: Equatable {

    static func == (lhs: InputSource, rhs: InputSource) -> Bool {
        return lhs.id == rhs.id
    }

    private let tisInputSource: TISInputSource

    var id: String {
        return tisInputSource.id
    }

    var localizedName: String {
        return tisInputSource.localizedName
    }

    init(tisInputSource: TISInputSource) {
        self.tisInputSource = tisInputSource
    }

    func select() {
        let currentSource = InputSourceManager.getCurrentSource()

        if currentSource.id == self.id {
            return
        }

        TISSelectInputSource(tisInputSource)
    }

}

struct InputSourceManager {

    static var inputSources: [InputSource] {
        let inputSourceList = TISCreateInputSourceList(
            nil, false
        ).takeRetainedValue() as! [TISInputSource]

        return inputSourceList
            .filter {
                $0.isSelectable
            }
            .map { InputSource(tisInputSource: $0) }
    }

    static func getCurrentSource() -> InputSource {
        return InputSource(
            tisInputSource:
                TISCopyCurrentKeyboardInputSource()
                .takeRetainedValue()
        )
    }

    static func selectInputSource(id: String) {
        InputSourceManager.inputSources.first { $0.id == id }?.select()
    }
    
}

extension TISInputSource {

    private func getProperty(_ key: CFString) -> AnyObject? {
        if let cfType = TISGetInputSourceProperty(self, key) {
            return Unmanaged<AnyObject>
                .fromOpaque(cfType)
                .takeUnretainedValue()
        }

        return nil
    }

    // source: https://leopard-adc.pepas.com/documentation/TextFonts/Reference/TextInputSourcesReference/TextInputSourcesReference.pdf

    var id: String {
        return getProperty(kTISPropertyInputSourceID) as! String
    }

    var category: String {
        return getProperty(kTISPropertyInputSourceCategory) as! String
    }

    var isSelectable: Bool {
        return getProperty(kTISPropertyInputSourceIsSelectCapable) as! Bool
    }

    var sourceLanguages: [String] {
        return getProperty(kTISPropertyInputSourceLanguages) as! [String]
    }

    var localizedName: String {
        return getProperty(kTISPropertyLocalizedName) as! String
    }

}

@raycast
func getAvailableInputSourceIds() -> [String] {
    InputSourceManager.inputSources.map { $0.id }
}

@raycast
func selectInputSource(id: String) {
    InputSourceManager.selectInputSource(id: id)
}