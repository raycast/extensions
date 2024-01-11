import Foundation
import CoreML
import Accelerate
import PDFKit
import NaturalLanguage

public struct Document: Codable {
    var content: String
    var page: Int32
    var file: String
    var id: Int32?
    var score: Double?
}

public class DocumentIndex {
    private var embeddingModel: EmbeddingModel
    private let db: EmbeddingDatabase

    public init(withDatabase databasePath: String) throws {
        let defaultConfig = MLModelConfiguration()
        // Assuming the model URL is correctly retrieved from the resources
        if let url = Bundle.module.url(forResource: "EmbeddingModel", withExtension: "mlmodelc") {
            self.embeddingModel = try EmbeddingModel(contentsOf: url, configuration: defaultConfig)
        } else {
            throw NSError(domain: "DocumentIndex", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to initialise EmbeddingModel."])
        }
        db = EmbeddingDatabase(withPath: databasePath)
    }

    public func clearIndex() {
        db.clearDocumentsTable()
    }

    public func indexDocument(atPath filePath: String) throws {
        if let pdfDoc = PDFDocument(url: URL(fileURLWithPath: filePath)) {
            var documents = [Document]()
            let tokenizer = NLTokenizer(unit: .paragraph)

            for pageIndex in 0..<pdfDoc.pageCount {
                guard let page = pdfDoc.page(at: pageIndex), let pageContent = page.string else { continue }
                tokenizer.string = pageContent
                tokenizer.enumerateTokens(in: pageContent.startIndex..<pageContent.endIndex) { tokenRange, _ in
                    let string = String(pageContent[tokenRange].trimmingCharacters(in: .whitespacesAndNewlines))
                    if !string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        documents.append(Document(content: string, page: Int32(pageIndex + 1), file: filePath))
                    }
                    return true
                }
            }

            #if DEBUG
            print("\(documents.count) Documents Parsed.")
            #endif


            var embeddings = [[Double]]()
            for document in documents {
                let predict = { () -> [Double]? in
                    guard let modelInput = ModelInput(inputString: document.content).modelInput else {
                        #if DEBUG
                        print("Failed to create model input for document \(document)")
                        #endif

                        return nil
                    }

                    do {
                        let prediction = try self.embeddingModel.prediction(input: modelInput)
                        let embedding = DocumentIndex.normalise(vector: prediction.pooler_output.doubleArray())
                        if embedding.contains(where: { $0.isNaN }) {
                            #if DEBUG
                            print("NaN values found in normalized output for document \(document.content)")
                            #endif

                            return nil
                        }
                        return embedding
                    } catch {
                        #if DEBUG
                        print("Error embedding document \(document): \(error)")
                        #endif

                        return nil
                    }
                }

                // retry creating sentence embedding if model gives erroneous output
                let maxRetries = 10
                var retryCount = 0
                var embedding: [Double]?
                while retryCount < maxRetries, embedding == nil {
                    embedding = predict()
                    retryCount += 1

                    #if DEBUG
                    if embedding == nil {
                        print("Retry \(retryCount) for document \(document.content)")
                    }
                    #endif
                }

                if let embedding {
                    #if DEBUG
                    print("Embedding saved: \(embedding[0])")
                    #endif
                    embeddings.append(embedding)
                } else {
                    #if DEBUG
                    print("Failed to obtain a valid prediction for document \(document.content) after \(maxRetries) retries.")
                    #endif
                }
            }

            db.batchInsert(embeddings: embeddings, documents: documents)
        } else {
            throw NSError(domain: "DocumentIndex", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to load PDF."])
        }
    }

    public func retrieveTopKDocuments(query: String, topK: Int = 25) throws -> [Document] {
        let queryModelInput = ModelInput(inputString: query).modelInput!
        let queryPrediction = try embeddingModel.prediction(input: queryModelInput)
        let queryEmbedding = DocumentIndex.normalise(vector: queryPrediction.pooler_output.doubleArray())

        var scores = [Int32: Double]()
        let embeddings = db.getAllEmbeddings()
        #if DEBUG
        print("\(embeddings.count) embeddings retrieved.")
        #endif

        for id in embeddings.keys {
            if let documentEmbedding = embeddings[id] {
                scores[id] = DocumentIndex.dotProduct(vectorA: documentEmbedding, vectorB: queryEmbedding)
            } else {
                scores[id] = 0.0
            }
        }

        let topDocumentIds = scores.sorted { $0.value > $1.value }.prefix(topK).map { $0.key }
        var documents = db.getDocuments(withIds: topDocumentIds)

        // Add scores to their corresponding documents
        for i in 0..<documents.count {
            documents[i].score = scores[documents[i].id ?? 0] 
        }

        return documents
    }

    static func normalise(vector: [Double]) -> [Double] {
        if vector.allSatisfy({ $0.isNaN }) { return vector.map { _ in 0.0 } }
        var norm: Double = 0.0
        vDSP_svesqD(vector, 1, &norm, vDSP_Length(vector.count))
        if norm == 0 { return vector.map { _ in 0.0 } }
        norm = sqrt(norm)
        var normalizedVector = vector
        vDSP_vsdivD(vector, 1, &norm, &normalizedVector, 1, vDSP_Length(vector.count))
        return normalizedVector
    }

    static func dotProduct(vectorA: [Double], vectorB: [Double]) -> Double {
        var dotProduct: Double = 0.0
        vDSP_dotprD(vectorA, 1, vectorB, 1, &dotProduct, vDSP_Length(vectorA.count))
        if dotProduct.isNaN { return 0.0 }
        return dotProduct
    }
}

extension MLMultiArray {
    /// Creates a copy of the multi-array's contents into a Doubles array.
    ///
    /// - returns: An array of Doubles.
    func doubleArray() -> [Double] {
        // Bind the underlying `dataPointer` memory to make a native swift `Array<Double>`
        let unsafeMutablePointer = dataPointer.bindMemory(to: Double.self, capacity: count)
        let unsafeBufferPointer = UnsafeBufferPointer(start: unsafeMutablePointer, count: count)
        return [Double](unsafeBufferPointer)
    }
}
