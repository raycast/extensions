import Cocoa
import Foundation

typealias SymbolCategoriesDictionary = Dictionary<String, Array<String>>
typealias SymbolSearchTermsDictionary = Dictionary<String, Array<String>>
typealias SymbolRestrictionsDictionary = Dictionary<String, String>
typealias CategoryTitlesDictionary = Dictionary<String, String>
typealias CategoriesArray = Array<Dictionary<String, String>>

struct Symbol: Codable {
	let name: String
	let symbol: String
	let categories: [String]
	let searchTerms: [String]
}

struct SymbolCategory: Codable {
	let name: String
	let title: String
    let symbol: String
}

let isPlayground = Bundle.main.bundlePath.contains("Playground")

var symbolNames: String?
var symbolGlyphs: String?
var symbolSearchTermsDict: SymbolSearchTermsDictionary?
var symbolCategoriesDict: SymbolCategoriesDictionary?
var symbolRestrictionsDict: SymbolRestrictionsDictionary?
var categoryTitlesDict: CategoryTitlesDictionary?
var categoriesArray: CategoriesArray?

if isPlayground {
	let bundle = Bundle.main
	
	if let symbolNamesPath = bundle.path(forResource: "symbol_names", ofType: "txt"),
	   let symbolGlyphsPath = bundle.path(forResource: "symbol_glyphs", ofType: "txt"),
	   let symbolSearchTermsPath = bundle.path(forResource: "symbol_search", ofType: "plist"),
	   let symbolCategoriesPath = bundle.path(forResource: "symbol_categories", ofType: "plist"),
	   let categoryTitlesPath = bundle.path(forResource: "Localizable", ofType: "plist"),
	   let categoriesPath = bundle.path(forResource: "categories", ofType: "plist") {
		symbolNames = try? String(contentsOfFile: symbolNamesPath)
		symbolGlyphs = try? String(contentsOfFile: symbolGlyphsPath)
		symbolSearchTermsDict = NSDictionary(contentsOfFile: symbolSearchTermsPath) as? SymbolSearchTermsDictionary
		symbolCategoriesDict = NSDictionary(contentsOfFile: symbolCategoriesPath) as? SymbolCategoriesDictionary
		categoryTitlesDict = NSDictionary(contentsOfFile: categoryTitlesPath) as? CategoryTitlesDictionary
		categoriesArray = NSArray(contentsOfFile: categoriesPath) as? CategoriesArray
	}
} else {
	let resourcesURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
		.appendingPathComponent(#file)
		.deletingLastPathComponent()
		.appendingPathComponent("Resources")
	let symbolNamesURL = resourcesURL.appendingPathComponent("symbol_names.txt")
	let symbolGlyphsURL = resourcesURL.appendingPathComponent("symbol_glyphs.txt")
	let symbolSearchTermsURL = resourcesURL.appendingPathComponent("symbol_search.plist")
	let symbolCategoriesURL = resourcesURL.appendingPathComponent("symbol_categories.plist")
	let categoryTitlesURL = resourcesURL.appendingPathComponent("Localizable.plist")
	let categoriesURL = resourcesURL.appendingPathComponent("categories.plist")
	
	symbolNames = try? String(contentsOf: symbolNamesURL)
	symbolGlyphs = try? String(contentsOf: symbolGlyphsURL)
	symbolSearchTermsDict = NSDictionary(contentsOf: symbolSearchTermsURL) as? SymbolSearchTermsDictionary
	symbolCategoriesDict = NSDictionary(contentsOf: symbolCategoriesURL) as? SymbolCategoriesDictionary
	categoryTitlesDict = NSDictionary(contentsOf: categoryTitlesURL) as? CategoryTitlesDictionary
	categoriesArray = NSArray(contentsOf: categoriesURL) as? CategoriesArray
}

if let symbolNames = symbolNames,
   let symbolGlyphs = symbolGlyphs,
   let symbolSearchTermsDict = symbolSearchTermsDict,
   let symbolCategoriesDict = symbolCategoriesDict,
   let categoryTitlesDict = categoryTitlesDict,
   let categoriesArray = categoriesArray {
    var symbols = [Symbol]()
	var categories = [SymbolCategory]()
	let symbolNamesArray = symbolNames.split(separator: "\n")
	let symbolGlyphsArray = symbolGlyphs.split(separator: "\n")
	let imageView = NSImageView(frame: NSRect(x: 0, y: 0, width: 100, height: 100))
	
	imageView.imageScaling = .scaleProportionallyUpOrDown
	imageView.contentTintColor = .black
	
	for category in categoriesArray {
		if let categoryName = category["key"], let categorySymbol = category["icon"] {
			if let title = categoryTitlesDict.first(where: { (key: String, value: String) in
				return key == "sfsymbols-category-\(categoryName)"
			})?.value {
                categories.append(SymbolCategory(name: categoryName, title: title, symbol: categorySymbol))
			}
		}
	}
	
	for (index, name) in symbolNamesArray.enumerated() {
		let name = String(name)
		let glyph = String(symbolGlyphsArray[index])
		
		if !isPlayground {		
			let path = FileManager.default.currentDirectoryPath
            let url = URL(fileURLWithPath: path).appendingPathComponent("assets/symbols/images", isDirectory: true)
			let bitmapImage = imageView.bitmapImageRepForCachingDisplay(in: imageView.frame)
			
			imageView.image = NSImage(systemSymbolName: name, accessibilityDescription: nil)
			imageView.cacheDisplay(in: imageView.frame, to: bitmapImage!)
			try bitmapImage?.representation(using: .png, properties: [:])?.write(to: url.appendingPathComponent("\(name).png"))
		}
		
		let categories: [String] = {
			if let categories = symbolCategoriesDict[name] {
				return categories
			} else {
				return []
			}
		}()
		
		let searchTerms: [String] = {
			if let searchTerms = symbolSearchTermsDict[name] {
				var terms = [String]()
				
				for term in searchTerms {
					terms += term.components(separatedBy: ".")
				}
				return terms
			} else {
				return []
			}
		}()
		
		let symbol = Symbol(name: name, symbol: glyph, categories: categories, searchTerms: searchTerms)
		symbols.append(symbol)
		
	}
	
	if let symbolData = try? JSONEncoder().encode(symbols), let categoryData = try? JSONEncoder().encode(categories) {
		if let symbolString = String(data: symbolData, encoding: .utf8), let categoryString = String(data: categoryData, encoding: .utf8) {
			print("{ \"symbols\": \(symbolString), \"categories\": \(categoryString)}")
		}
	}
}
