//
// EmbeddingModel.swift
//
// This file was automatically generated and should not be edited.
//

import CoreML


/// Model Prediction Input Type
@available(macOS 12.0, iOS 15.0, tvOS 15.0, watchOS 8.0, *)
class EmbeddingModelInput : MLFeatureProvider {

    /// Indices of input sequence tokens in the vocabulary as 1 by 128 matrix of 32-bit integers
    var input_ids: MLMultiArray

    /// Mask to avoid performing attention on padding token indices (1 = not masked, 0 = masked) as 1 by 128 matrix of 32-bit integers
    var attention_mask: MLMultiArray

    var featureNames: Set<String> {
        get {
            return ["input_ids", "attention_mask"]
        }
    }
    
    func featureValue(for featureName: String) -> MLFeatureValue? {
        if (featureName == "input_ids") {
            return MLFeatureValue(multiArray: input_ids)
        }
        if (featureName == "attention_mask") {
            return MLFeatureValue(multiArray: attention_mask)
        }
        return nil
    }
    
    init(input_ids: MLMultiArray, attention_mask: MLMultiArray) {
        self.input_ids = input_ids
        self.attention_mask = attention_mask
    }

    convenience init(input_ids: MLShapedArray<Int32>, attention_mask: MLShapedArray<Int32>) {
        self.init(input_ids: MLMultiArray(input_ids), attention_mask: MLMultiArray(attention_mask))
    }

}


/// Model Prediction Output Type
@available(macOS 12.0, iOS 15.0, tvOS 15.0, watchOS 8.0, *)
class EmbeddingModelOutput : MLFeatureProvider {

    /// Source provided by CoreML
    private let provider : MLFeatureProvider

    /// Sequence of hidden-states at the output of the last layer of the model as 1 × 128 × 512 3-dimensional array of floats
    var last_hidden_state: MLMultiArray {
        return self.provider.featureValue(for: "last_hidden_state")!.multiArrayValue!
    }

    /// Sequence of hidden-states at the output of the last layer of the model as 1 × 128 × 512 3-dimensional array of floats
    var last_hidden_stateShapedArray: MLShapedArray<Float> {
        return MLShapedArray<Float>(self.last_hidden_state)
    }

    /// Last layer hidden-state of the first token of the sequence as 1 by 512 matrix of floats
    var pooler_output: MLMultiArray {
        return self.provider.featureValue(for: "pooler_output")!.multiArrayValue!
    }

    /// Last layer hidden-state of the first token of the sequence as 1 by 512 matrix of floats
    var pooler_outputShapedArray: MLShapedArray<Float> {
        return MLShapedArray<Float>(self.pooler_output)
    }

    var featureNames: Set<String> {
        return self.provider.featureNames
    }
    
    func featureValue(for featureName: String) -> MLFeatureValue? {
        return self.provider.featureValue(for: featureName)
    }

    init(last_hidden_state: MLMultiArray, pooler_output: MLMultiArray) {
        self.provider = try! MLDictionaryFeatureProvider(dictionary: ["last_hidden_state" : MLFeatureValue(multiArray: last_hidden_state), "pooler_output" : MLFeatureValue(multiArray: pooler_output)])
    }

    init(features: MLFeatureProvider) {
        self.provider = features
    }
}


/// Class for model loading and prediction
@available(macOS 12.0, iOS 15.0, tvOS 15.0, watchOS 8.0, *)
class EmbeddingModel {
    let model: MLModel

    /// URL of model assuming it was installed in the same bundle as this class
    class var urlOfModelInThisBundle : URL {
        let bundle = Bundle(for: self)
        return bundle.url(forResource: "EmbeddingModel", withExtension:"mlmodelc")!
    }

    /**
        Construct EmbeddingModel instance with an existing MLModel object.

        Usually the application does not use this initializer unless it makes a subclass of EmbeddingModel.
        Such application may want to use `MLModel(contentsOfURL:configuration:)` and `EmbeddingModel.urlOfModelInThisBundle` to create a MLModel object to pass-in.

        - parameters:
          - model: MLModel object
    */
    init(model: MLModel) {
        self.model = model
    }

    /**
        Construct a model with configuration

        - parameters:
           - configuration: the desired model configuration

        - throws: an NSError object that describes the problem
    */
    convenience init(configuration: MLModelConfiguration = MLModelConfiguration()) throws {
        try self.init(contentsOf: type(of:self).urlOfModelInThisBundle, configuration: configuration)
    }

    /**
        Construct EmbeddingModel instance with explicit path to mlmodelc file
        - parameters:
           - modelURL: the file url of the model

        - throws: an NSError object that describes the problem
    */
    convenience init(contentsOf modelURL: URL) throws {
        try self.init(model: MLModel(contentsOf: modelURL))
    }

    /**
        Construct a model with URL of the .mlmodelc directory and configuration

        - parameters:
           - modelURL: the file url of the model
           - configuration: the desired model configuration

        - throws: an NSError object that describes the problem
    */
    convenience init(contentsOf modelURL: URL, configuration: MLModelConfiguration) throws {
        try self.init(model: MLModel(contentsOf: modelURL, configuration: configuration))
    }

    /**
        Construct EmbeddingModel instance asynchronously with optional configuration.

        Model loading may take time when the model content is not immediately available (e.g. encrypted model). Use this factory method especially when the caller is on the main thread.

        - parameters:
          - configuration: the desired model configuration
          - handler: the completion handler to be called when the model loading completes successfully or unsuccessfully
    */
    class func load(configuration: MLModelConfiguration = MLModelConfiguration(), completionHandler handler: @escaping (Swift.Result<EmbeddingModel, Error>) -> Void) {
        return self.load(contentsOf: self.urlOfModelInThisBundle, configuration: configuration, completionHandler: handler)
    }

    /**
        Construct EmbeddingModel instance asynchronously with optional configuration.

        Model loading may take time when the model content is not immediately available (e.g. encrypted model). Use this factory method especially when the caller is on the main thread.

        - parameters:
          - configuration: the desired model configuration
    */
    class func load(configuration: MLModelConfiguration = MLModelConfiguration()) async throws -> EmbeddingModel {
        return try await self.load(contentsOf: self.urlOfModelInThisBundle, configuration: configuration)
    }

    /**
        Construct EmbeddingModel instance asynchronously with URL of the .mlmodelc directory with optional configuration.

        Model loading may take time when the model content is not immediately available (e.g. encrypted model). Use this factory method especially when the caller is on the main thread.

        - parameters:
          - modelURL: the URL to the model
          - configuration: the desired model configuration
          - handler: the completion handler to be called when the model loading completes successfully or unsuccessfully
    */
    class func load(contentsOf modelURL: URL, configuration: MLModelConfiguration = MLModelConfiguration(), completionHandler handler: @escaping (Swift.Result<EmbeddingModel, Error>) -> Void) {
        MLModel.load(contentsOf: modelURL, configuration: configuration) { result in
            switch result {
            case .failure(let error):
                handler(.failure(error))
            case .success(let model):
                handler(.success(EmbeddingModel(model: model)))
            }
        }
    }

    /**
        Construct EmbeddingModel instance asynchronously with URL of the .mlmodelc directory with optional configuration.

        Model loading may take time when the model content is not immediately available (e.g. encrypted model). Use this factory method especially when the caller is on the main thread.

        - parameters:
          - modelURL: the URL to the model
          - configuration: the desired model configuration
    */
    class func load(contentsOf modelURL: URL, configuration: MLModelConfiguration = MLModelConfiguration()) async throws -> EmbeddingModel {
        let model = try await MLModel.load(contentsOf: modelURL, configuration: configuration)
        return EmbeddingModel(model: model)
    }

    /**
        Make a prediction using the structured interface

        - parameters:
           - input: the input to the prediction as EmbeddingModelInput

        - throws: an NSError object that describes the problem

        - returns: the result of the prediction as EmbeddingModelOutput
    */
    func prediction(input: EmbeddingModelInput) throws -> EmbeddingModelOutput {
        return try self.prediction(input: input, options: MLPredictionOptions())
    }

    /**
        Make a prediction using the structured interface

        - parameters:
           - input: the input to the prediction as EmbeddingModelInput
           - options: prediction options 

        - throws: an NSError object that describes the problem

        - returns: the result of the prediction as EmbeddingModelOutput
    */
    func prediction(input: EmbeddingModelInput, options: MLPredictionOptions) throws -> EmbeddingModelOutput {
        let outFeatures = try model.prediction(from: input, options:options)
        return EmbeddingModelOutput(features: outFeatures)
    }

    /**
        Make a prediction using the convenience interface

        - parameters:
            - input_ids: Indices of input sequence tokens in the vocabulary as 1 by 128 matrix of 32-bit integers
            - attention_mask: Mask to avoid performing attention on padding token indices (1 = not masked, 0 = masked) as 1 by 128 matrix of 32-bit integers

        - throws: an NSError object that describes the problem

        - returns: the result of the prediction as EmbeddingModelOutput
    */
    func prediction(input_ids: MLMultiArray, attention_mask: MLMultiArray) throws -> EmbeddingModelOutput {
        let input_ = EmbeddingModelInput(input_ids: input_ids, attention_mask: attention_mask)
        return try self.prediction(input: input_)
    }

    /**
        Make a prediction using the convenience interface

        - parameters:
            - input_ids: Indices of input sequence tokens in the vocabulary as 1 by 128 matrix of 32-bit integers
            - attention_mask: Mask to avoid performing attention on padding token indices (1 = not masked, 0 = masked) as 1 by 128 matrix of 32-bit integers

        - throws: an NSError object that describes the problem

        - returns: the result of the prediction as EmbeddingModelOutput
    */

    func prediction(input_ids: MLShapedArray<Int32>, attention_mask: MLShapedArray<Int32>) throws -> EmbeddingModelOutput {
        let input_ = EmbeddingModelInput(input_ids: input_ids, attention_mask: attention_mask)
        return try self.prediction(input: input_)
    }

    /**
        Make a batch prediction using the structured interface

        - parameters:
           - inputs: the inputs to the prediction as [EmbeddingModelInput]
           - options: prediction options 

        - throws: an NSError object that describes the problem

        - returns: the result of the prediction as [EmbeddingModelOutput]
    */
    func predictions(inputs: [EmbeddingModelInput], options: MLPredictionOptions = MLPredictionOptions()) throws -> [EmbeddingModelOutput] {
        let batchIn = MLArrayBatchProvider(array: inputs)
        let batchOut = try model.predictions(from: batchIn, options: options)
        var results : [EmbeddingModelOutput] = []
        results.reserveCapacity(inputs.count)
        for i in 0..<batchOut.count {
            let outProvider = batchOut.features(at: i)
            let result =  EmbeddingModelOutput(features: outProvider)
            results.append(result)
        }
        return results
    }
}
