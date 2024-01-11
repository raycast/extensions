import CoreML

struct ModelInput {
    // Maximum number of tokens the model can process.
    static let maxTokens = 128

    // There is 1 sentinel token before the document, 1 [CLS] token.
    static let inputTokenOverhead = 1

    // There are 2 sentinel tokens total, 1 [CLS] token and 1 [SEP] token.
    static let totalTokenOverhead = 2

    var modelInput: EmbeddingModelInput?
    let input: TokenisedString

    private let inputOffset: Int

    var documentRange: Range<Int> {
        return inputOffset..<inputOffset + input.tokens.count
    }

    var totalTokenSize: Int {
        return ModelInput.totalTokenOverhead + input.tokens.count
    }

    init(inputString: String) {
        input = TokenisedString(inputString)
        inputOffset = ModelInput.inputTokenOverhead

        // Early return if the total token size exceeds the maximum allowed tokens
        guard input.tokens.count + ModelInput.totalTokenOverhead <= ModelInput.maxTokens else {
            fatalError("Input size \(input.tokens.count + ModelInput.totalTokenOverhead) exceeds max token size of \(ModelInput.maxTokens)")
        }

        var wordIDs = [Int32](repeating: Vocabulary.paddingTokenID, count: ModelInput.maxTokens)
        var attentionMask = [Int32](repeating: 0, count: ModelInput.maxTokens)

        // Place [CLS] token at the beginning
        wordIDs[0] = Vocabulary.classifyStartTokenID
        attentionMask[0] = 1

        // Add input tokens and attention mask
        for (index, tokenID) in input.tokenIDs.enumerated() {
            wordIDs[index + ModelInput.inputTokenOverhead] = Int32(tokenID)
            attentionMask[index + ModelInput.inputTokenOverhead] = 1
        }

        // Place [SEP] token at the end of the input tokens
        let sepIndex = input.tokens.count + ModelInput.inputTokenOverhead
        if sepIndex < ModelInput.maxTokens {
            wordIDs[sepIndex] = Vocabulary.separatorTokenID
            attentionMask[sepIndex] = 1
        }

        // Create MLMultiArrays with precomputed shape
        guard let tokenIDMultiArray = createMultiArray(from: wordIDs),
              let attentionMaskMultiArray = createMultiArray(from: attentionMask) else {
            fatalError("Couldn't create MLMultiArray inputs")
        }

        modelInput = EmbeddingModelInput(input_ids: tokenIDMultiArray, attention_mask: attentionMaskMultiArray)
    }

    private func createMultiArray(from array: [Int32]) -> MLMultiArray? {
        do {
            // Create a MLMultiArray with shape [1, 128]
            let multiArray = try MLMultiArray(shape: [1, ModelInput.maxTokens as NSNumber], dataType: .int32)

            // Fill the multiArray with the elements from 'array'
            // The stride is not necessary as we are dealing with a 2D array with a leading dimension of 1
            for (index, element) in array.enumerated() {
                multiArray[[0, index] as [NSNumber]] = NSNumber(value: element)
            }
            return multiArray
        } catch {
            print("Error creating MLMultiArray: \(error)")
            return nil
        }
    }

    // init(inputString: String) {
    //     input = TokenisedString(inputString)

    //     // Save the number of tokens before the document tokens for later.
    //     inputOffset = ModelInput.inputTokenOverhead
        
    //     guard totalTokenSize < ModelInput.maxTokens else {
    //         return
    //     }

    //     // Start the wordID array with the `classification start` token.
    //     var wordIDs = [Vocabulary.classifyStartTokenID]

    //     // Add the input tokens and a separator.
    //     wordIDs += input.tokenIDs
    //     wordIDs += [Vocabulary.separatorTokenID]

    //     // Fill the remaining token slots with padding tokens.
    //     let tokenIDPadding = ModelInput.maxTokens - wordIDs.count
    //     wordIDs += Array(repeating: Vocabulary.paddingTokenID, count: tokenIDPadding)

    //     guard wordIDs.count == ModelInput.maxTokens else {
    //         fatalError("`wordIDs` array size isn't the right size.")
    //     }

    //     // Build the token types array in the same order.
    //     // The input tokens are type 1 and all others are type 0.
        
    //     // Set all of the token types before the document to 0.
    //     var wordTypes = Array(repeating: 0, count: inputOffset)
        
    //     // Set all of the document token types to 1.
    //     wordTypes += Array(repeating: 1, count: input.tokens.count)
        
    //     // Set the remaining token types to 0.
    //     let tokenTypePadding = ModelInput.maxTokens - wordTypes.count
    //     wordTypes += Array(repeating: 0, count: tokenTypePadding)

    //     guard wordTypes.count == ModelInput.maxTokens else {
    //         fatalError("`wordTypes` array size isn't the right size.")
    //     }

    //     // Create the MLMultiArray instances.
    //     let tokenIDMultiArray = try? MLMultiArray(wordIDs)
    //     let wordTypesMultiArray = try? MLMultiArray(wordTypes)
        
    //     // Unwrap the MLMultiArray optionals.
    //     guard let tokenIDInput = tokenIDMultiArray else {
    //         fatalError("Couldn't create wordID MLMultiArray input")
    //     }
        
    //     guard let tokenTypeInput = wordTypesMultiArray else {
    //         fatalError("Couldn't create wordType MLMultiArray input")
    //     }

    //     // Create the BERT input MLFeatureProvider.
    //     let modelInput = EmbeddingModelInput(input_ids: tokenIDInput,
    //                                          attention_mask: tokenTypeInput)
    //     self.modelInput = modelInput
    // }
}