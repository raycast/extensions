import Cocoa
import Foundation

struct Symbol: Codable {
    let name: String
    let symbol: String
    let categories: [String]
}

let bundle = Bundle.main
var symbolsArray: [Symbol] = []

if let symbolNamesPath = bundle.path(forResource: "symbol_names", ofType: "txt"), // Copy/pasted from SF Symbols.app
   let symbolNames = try? String(contentsOfFile: symbolNamesPath),
   let symbolGlyphsPath = bundle.path(forResource: "symbol_glyphs", ofType: "txt"), // Copy/pasted from SF Symbols.app
   let symbolGlyphs = try? String(contentsOfFile: symbolGlyphsPath),
   let symbolCategoriesPath = bundle.path(forResource: "symbol_categories", ofType: "plist"), // From SF Symbols.app/Contents/Resources/symbol_categories.plist
   let symbolCategoriesDict = NSDictionary(contentsOfFile: symbolCategoriesPath) as? Dictionary<String, Array<String>> {
    
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
