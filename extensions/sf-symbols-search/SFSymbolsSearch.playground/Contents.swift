import Cocoa
import Foundation

typealias CategoryDictionary = Dictionary<String, Array<String>>

struct Symbol: Codable {
    let name: String
    let symbol: String
    let categories: [String]
}

let isPlayground = Bundle.main.bundlePath.contains("Playground")
var symbolNames: String? = nil
var symbolGlyphs: String?
var symbolCategoriesDict: CategoryDictionary?

if isPlayground {
    let bundle = Bundle.main
    
    if let symbolNamesPath = bundle.path(forResource: "symbol_names", ofType: "txt"),
       let symbolGlyphsPath = bundle.path(forResource: "symbol_glyphs", ofType: "txt"),
       let symbolCategoriesPath = bundle.path(forResource: "symbol_categories", ofType: "plist") {
        symbolNames = try? String(contentsOfFile: symbolNamesPath)
        symbolGlyphs = try? String(contentsOfFile: symbolGlyphsPath)
        symbolCategoriesDict = NSDictionary(contentsOfFile: symbolCategoriesPath) as? CategoryDictionary
    }
} else {
    let resourcesURL = URL(string: FileManager.default.currentDirectoryPath)?
        .appendingPathComponent(#file)
        .deletingLastPathComponent()
        .appendingPathComponent("Resources")
    
    if let symbolNamesPath = resourcesURL?.appendingPathComponent("symbol_names.txt").absoluteString,
       let symbolGlyphsPath = resourcesURL?.appendingPathComponent("symbol_glyphs.txt").absoluteString,
       let symbolCategoriesPath = resourcesURL?.appendingPathComponent("symbol_categories.plist").absoluteString {
        symbolNames = try? String(contentsOfFile: symbolNamesPath)
        symbolGlyphs = try? String(contentsOfFile: symbolGlyphsPath)
        symbolCategoriesDict = NSDictionary(contentsOfFile: symbolCategoriesPath) as? CategoryDictionary
    }
}

if let symbolNames = symbolNames, let symbolGlyphs = symbolGlyphs, let symbolCategoriesDict = symbolCategoriesDict {
    var symbolsArray: [Symbol] = []
    let symbolNamesArray = symbolNames.split(separator: "\n")
    let symbolGlyphsArray = symbolGlyphs.split(separator: "\n")

    for (index, name) in symbolNamesArray.enumerated() {
        let name = String(name)
        let glyph = String(symbolGlyphsArray[index])
        let categories: [String] = {
            if let categories = symbolCategoriesDict[name] {
                return categories
            } else {
                return []
            }
        }()
        let symbol = Symbol(name: name, symbol: glyph, categories: categories)

        symbolsArray.append(symbol)
    }

    if let symbolData = try? JSONEncoder().encode(symbolsArray) {
        if let jsonString = String(data: symbolData, encoding: .utf8) {
            print(jsonString)
        }
    }
}
