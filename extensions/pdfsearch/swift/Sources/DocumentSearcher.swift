import PDFKit
import CoreServices
import Foundation
import RaycastSwiftMacros
import UniformTypeIdentifiers

enum IndexError: Error {
    case unableToOpenOrCreateIndex(String)
    case invalidFileURL(String)
    case fileNotFound(String)
    case noPermissions(String)
    case failedToAddDocument(String)
    case deletionFailed(String)
    case flushFailed(String)
}

/// Returned objects must be Encodable
struct Document: Encodable {
    let id: Int
    let page: Int
    let file: String
    let score: Float
    var lower: Int?
    var upper: Int?
//    let summary: String
}

struct IndexResult: Encodable {
    let messages: [String]
    let indexedFiles: [String]
}

struct SearchResult: Encodable {
    let messages: [String]
    let documents: [Document]
}

enum SearchError: Error {
    case missingFile(String)
}

let compatibleFileExtensions: Set<String> = [
    "txt",
    "md",
]

func isDirectory(url: URL) -> Bool {
    var isDir: ObjCBool = false
    if FileManager.default.fileExists(atPath: url.path, isDirectory: &isDir) {
        return isDir.boolValue
    }
    return false
}

func createOrOpenIndex(_ collection: String, _ supportPath: String) -> SKIndex? {
    let supportDirectoryURL = URL(fileURLWithPath: supportPath)
    if !isDirectory(url: supportDirectoryURL) {
        return nil
    }
    let indexURL = supportDirectoryURL.appendingPathComponent("\(collection).index")
    if FileManager.default.fileExists(atPath: indexURL.path) {
        let unmanagedIndex = SKIndexOpenWithURL(indexURL as CFURL, collection as CFString, true)
        return unmanagedIndex?.takeRetainedValue()
    } else {
        let unmanagedIndex = SKIndexCreateWithURL(indexURL as CFURL, collection as CFString, kSKIndexInvertedVector, nil)
        return unmanagedIndex?.takeRetainedValue()
    }
}

func openIndex(_ collection: String, _ supportPath: String) -> SKIndex? {
    let supportDirectoryURL = URL(fileURLWithPath: supportPath)
    if !isDirectory(url: supportDirectoryURL) {
        return nil
    }
    let indexURL = supportDirectoryURL.appendingPathComponent("\(collection).index")
    let unmanagedIndex = SKIndexOpenWithURL(indexURL as CFURL, collection as CFString, true)
    return unmanagedIndex?.takeRetainedValue()
}

/// Called whenever user saves changes to either a new or existing collection. Triggers update or creating new index file depending on whether it is a new or existing collection.
@raycast func createOrUpdateCollection(collectionName: String, supportPath: String, filepaths: [String]) throws -> IndexResult {
    guard let index = createOrOpenIndex(collectionName, supportPath) else {
        throw IndexError.unableToOpenOrCreateIndex("Unable to open or create new index file for collection \(collectionName).")
    }
    var messages = [String]()
    var files = [String]()

    let queue = DispatchQueue.global(qos: .userInitiated)
    let group = DispatchGroup()

    SKLoadDefaultExtractorPlugIns()
    let lock = NSRecursiveLock() // allows a single thread to acquire the lock multiple times
    for filepath in filepaths {
        let documentURL = URL(fileURLWithPath: filepath)
        if !documentURL.isFileURL {
            throw IndexError.invalidFileURL("Not file URL: \(documentURL.path).")
        }

        if !FileManager.default.fileExists(atPath: filepath) {
            throw IndexError.fileNotFound("File does not exist: \(documentURL.path)")
        }

        if !FileManager.default.isReadableFile(atPath: filepath) {
            throw IndexError.noPermissions("No read permissions for file: \(documentURL.path)")
        }

        let pathExtension = documentURL.pathExtension.lowercased()
        if pathExtension == "pdf" {
            guard let pdfDocument = PDFDocument(url: documentURL) else {
                throw IndexError.failedToAddDocument("Failed to load pdf docuemnt.")
            }

            // Create smaller documents for each page in the PDF document
            for i in 0..<pdfDocument.pageCount {
                group.enter()
                queue.async {
                    defer { group.leave() }
                    if let page = pdfDocument.page(at: i), let text = page.string {
                        let documentURL = URL(fileURLWithPath: "\(documentURL.path)_\(i)")
                        let documentRef = SKDocumentCreateWithURL(documentURL as CFURL).takeRetainedValue()
                        lock.lock()
                        defer { lock.unlock() }
                        SKIndexAddDocumentWithText(index, documentRef, text as CFString, true)
                    }
                }
            }
            files.append(documentURL.path)
        } else if compatibleFileExtensions.contains(pathExtension) {
            // treat other file types as plaintext files
            group.enter()
            queue.async {
                defer {
                    group.leave()
                    lock.unlock()
                }
                var mimeTypeHint: CFString?
                switch pathExtension {
                case "txt":
                    mimeTypeHint = "text/plain" as CFString
                case "md":
                    mimeTypeHint = "text/plain" as CFString
                default:
                    mimeTypeHint = nil
                }
                let documentRef = SKDocumentCreateWithURL(documentURL as CFURL).takeRetainedValue()
                lock.lock()
                SKIndexAddDocument(index, documentRef, mimeTypeHint, true)
            }
            files.append(documentURL.path)
        }
    }

    group.wait()

    guard SKIndexFlush(index) else {
        throw IndexError.flushFailed("Error occurred while saving changes to index.")
    }

    return IndexResult(messages: messages, indexedFiles: files)
}

/// Extracts the file path and page number from a URL where the page number is assumed to be after the last underscore in the filename.
/// - Parameter url: The URL containing the filepath and page number.
/// - Returns: A tuple containing the filepath and the page number as an integer.
func extractFilePathAndPageNumber(from url: URL) -> (filepath: String, pageIndex: Int)? {
    let fullpath = url.path

    guard let pageIdxStr = url.lastPathComponent.split(separator: "_").last else {
        // No underscore found in the filepath
        return nil
    }

    // Attempt to extract page number from the last part of the filename
    if let pageIndex = Int(pageIdxStr) {
        // Build the file path excluding the page number
        let filePathWithoutPageNumber = fullpath.dropLast(pageIdxStr.count + 1)
        return (filepath: String(filePathWithoutPageNumber), pageIndex: pageIndex)
    } else {
        // Last part of filename is not numeric
        return nil
    }
}

@raycast func searchCollection(query: String, collectionName: String, supportPath: String) throws -> [Document] {
    guard let index = openIndex(collectionName, supportPath) else {
        throw IndexError.unableToOpenOrCreateIndex("Index \(collectionName) does not exist.")
    }

    // Flush the index to make sure all documents have been added
    guard SKIndexFlush(index) else {
        throw IndexError.flushFailed("Error occurred while saving changes to index.")
    }

    let options = SKSearchOptions(kSKSearchOptionFindSimilar) // find purely based on similarity instead of boolean query
    let search = SKSearchCreate(index, query as CFString, options).takeRetainedValue()
    let k = 25
    var returnDocuments = [Document]()
    var documentIDs = UnsafeMutablePointer<SKDocumentID>.allocate(capacity: k)
    var scores = UnsafeMutablePointer<Float>.allocate(capacity: k)
    var numResults: CFIndex = 0
    let numSummarySentences: Int = 1

    // Returns the search results by every k items until no results are left
    var hasMore = true
    repeat {
        hasMore = SKSearchFindMatches(search, k, documentIDs, scores, 4, &numResults)
        if numResults > 0 {
            var documentURLs = UnsafeMutablePointer<Unmanaged<CFURL>?>.allocate(capacity: numResults)
            SKIndexCopyDocumentURLsForDocumentIDs(index, numResults, documentIDs, documentURLs)
            for i in 0..<numResults {
                if let unmanagedURL = documentURLs[i] {
                    let score = scores[i]
                    let url = unmanagedURL.takeRetainedValue() as URL
                    if let (filepath, pageidx) = extractFilePathAndPageNumber(from: url) {
                        guard let pdfDocument = PDFDocument(url: URL(fileURLWithPath: filepath)) else {
                            throw SearchError.missingFile("Failed to load pdf document.")
                        }

                        let selection = pdfDocument.findString(query, withOptions: [.caseInsensitive, NSString.CompareOptions .diacriticInsensitive]).first
                        guard let content = pdfDocument.page(at: pageidx)?.string else {
                            continue
                        }
                        let range = (content as NSString).range(of: query)
                        if range.location != NSNotFound {
                            returnDocuments.append(Document(
                                id: documentIDs[i],
                                page: pageidx,
                                file: filepath,
                                score: score,
                                lower: range.location,
                                upper: range.upperBound
                            ))
                        } else {
                            returnDocuments.append(Document(
                                id: documentIDs[i],
                                page: pageidx,
                                file: filepath,
                                score: score
                            ))
                        }
                    } else {
                        returnDocuments.append(Document(id: documentIDs[i], page: 0, file: url.path, score: score))
                    }

//                    if let summary = SKSummaryCreateWithString(content as CFString)?.takeRetainedValue(),
//                       let highlightedSummary = SKSummaryCopyParagraphSummaryString(summary, numSummarySentences)?.takeRetainedValue() {
//                        returnDocuments.append(Document(id: documentIDs[i], page: pageidx, file: filepath, score: score, summary: content))
//                    }
                }
            }
            documentURLs.deallocate()
        }
    } while hasMore && numResults > 0

    documentIDs.deallocate()
    scores.deallocate()
    return returnDocuments
}

@raycast func deleteCollection(collectionName: String, supportPath: String) throws -> Void {
    let supportDirectoryURL = URL(fileURLWithPath: supportPath)
    if !isDirectory(url: supportDirectoryURL) {
        throw IndexError.deletionFailed("Invalid support directory \(supportPath)")
    }
    let indexURL = supportDirectoryURL.appendingPathComponent("\(collectionName).index")
    guard FileManager.default.fileExists(atPath: indexURL.path) else {
        throw IndexError.deletionFailed("Index file for collection not found \(indexURL.path)")
    }
    try FileManager.default.removeItem(at: indexURL)
}
