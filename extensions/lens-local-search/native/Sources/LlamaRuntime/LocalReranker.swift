import CLlama
import DigUpKit
import Foundation

/// Query/content cross-attention, separate from the reusable discovery embeddings.
public final class LocalReranker {
    private let folder: URL
    private var model: OpaquePointer?
    private var context: OpaquePointer?
    private var media: OpaquePointer?

    public init(folder: URL, log: URL) throws {
        self.folder = folder
        _ = LlamaEmbedder.backend
        LlamaLog.shared.send(to: log)
        var mp = llama_model_default_params()
        mp.n_gpu_layers = 999
        guard let model = llama_model_load_from_file(folder.appendingPathComponent("Qwen3-VL-Reranker-2B.Q8_0.gguf").path, mp) else {
            throw LlamaError("Local relevance model is unavailable")
        }
        self.model = model
        guard llama_model_n_cls_out(model) == 2, let label = llama_model_cls_label(model, 0), String(cString: label) == "yes" else {
            close(); throw LlamaError("Local relevance model has an incompatible ranking head")
        }
        var cp = llama_context_default_params()
        cp.n_ctx = 2048; cp.n_batch = 512; cp.n_ubatch = 256
        cp.n_seq_max = 1; cp.embeddings = true; cp.pooling_type = LLAMA_POOLING_TYPE_RANK
        cp.n_threads = 2; cp.n_threads_batch = 2
        guard let context = llama_init_from_model(model, cp) else { close(); throw LlamaError("Cannot initialize local relevance model") }
        self.context = context
    }

    private func visualContext() throws -> OpaquePointer {
        if let media { return media }
        guard let model else { throw LlamaError("Local relevance model is closed") }
        var vp = mtmd_context_params_default()
        vp.use_gpu = true; vp.print_timings = false; vp.warmup = false
        vp.image_min_tokens = 64; vp.image_max_tokens = 256; vp.n_threads = 2
        let optimized = folder.appendingPathComponent(ModelFiles.rerankerVisionQ8.name)
        let useQ8 = (try? FileManager.default.attributesOfItem(atPath: optimized.path)[.size] as? Int64) == ModelFiles.rerankerVisionQ8.bytes
        let original = folder.appendingPathComponent("Qwen3-VL-Reranker-2B.mmproj-f16.gguf")
        for projector in useQ8 ? [optimized, original] : [original] {
            if let media = mtmd_init_from_file(projector.path, model, vp) {
                self.media = media
                return media
            }
        }
        throw LlamaError("Cannot initialize local visual relevance model")
    }

    /// One-time setup, never part of a search; retain the verified F16 file for recovery.
    public static func prepareVision(in folder: URL) throws {
        let file = ModelFiles.rerankerVisionQ8, final = folder.appendingPathComponent(ModelFiles.rerankerVisionQ8.name)
        if (try? ModelFiles.sha256(of: final)) == file.sha256 { return }
        let source = folder.appendingPathComponent(ModelFiles.reranker[1].name)
        guard try ModelFiles.sha256(of: source) == ModelFiles.reranker[1].sha256 else { throw LlamaError("Visual model checksum mismatch") }
        let partial = folder.appendingPathComponent(file.name + ".\(UUID().uuidString).partial")
        defer { try? FileManager.default.removeItem(at: partial) }
        var params = llama_model_quantize_default_params()
        params.ftype = LLAMA_FTYPE_MOSTLY_Q8_0; params.nthread = 2
        guard llama_model_quantize(source.path, partial.path, &params) == 0,
              try ModelFiles.sha256(of: partial) == file.sha256 else { throw LlamaError("Optimized visual model checksum mismatch") }
        if FileManager.default.fileExists(atPath: final.path) { try FileManager.default.removeItem(at: final) }
        try FileManager.default.moveItem(at: partial, to: final)
    }

    deinit { close() }
    public func close() {
        if let media { mtmd_free(media) }; if let context { llama_free(context) }; if let model { llama_model_free(model) }
        media = nil; context = nil; model = nil
    }

    public func score(query: String, text: String, image: String? = nil) throws -> Double {
        guard let context, let model else { throw LlamaError("Local relevance model is closed") }
        let media = image != nil ? try visualContext() : nil
        var bitmap: OpaquePointer?
        if let image, let media {
            let loaded = mtmd_helper_bitmap_init_from_file(media, image, false, mtmd_helper_init_opt_default())
            guard loaded.video_ctx == nil, let picture = loaded.bitmap, !mtmd_bitmap_is_audio(picture) else {
                if let b = loaded.bitmap { mtmd_bitmap_free(b) }
                if let v = loaded.video_ctx { mtmd_helper_video_free(v) }
                throw LlamaError("Cannot read candidate picture")
            }
            bitmap = picture
        }
        defer { if let bitmap { mtmd_bitmap_free(bitmap) } }
        // Qwen's published reranker chat framing; content is evidence, never executable instructions.
        let clean = { (s: String) in s.replacingOccurrences(of: "<|", with: "< ").replacingOccurrences(of: "|>", with: " >") }
        let framed = { (document: String) in "<|im_start|>system\nJudge whether the Document meets the requirements based on the Query and the Instruct provided. Note that the answer can only be \"yes\" or \"no\".<|im_end|>\n<|im_start|>user\n<Instruct>: Retrieve candidates satisfying the complete search request. The requested object or topic must be present; its attributes must belong to that object, not merely its surroundings. Consider all requirements together.<Query>:\(clean(String(query.prefix(512))))\n<Document>:\(bitmap == nil ? "" : String(cString: mtmd_default_marker()))\(clean(document))<|im_end|>\n<|im_start|>assistant\n" }
        let body = String(text.prefix(4500))
        var prompt = framed(body)
        let vocab = llama_model_get_vocab(model)
        let budget: Int32 = image == nil ? 2048 : 1760
        let countTokens = { (input: String) in input.withCString { c in
            -llama_tokenize(vocab, c, Int32(strlen(c)), nil, 0, true, true)
        } }
        if countTokens(prompt) > budget {
            // Preserve the complete query and chat framing; trim only evidence by its actual tokenizer budget.
            var low = 0, high = body.count
            while low < high {
                let middle = (low + high + 1) / 2
                if countTokens(framed(String(body.prefix(middle)))) <= budget { low = middle } else { high = middle - 1 }
            }
            prompt = framed(String(body.prefix(low)))
        }
        llama_memory_clear(llama_get_memory(context), true)
        let status: Int32
        if let media {
            let chunks = mtmd_input_chunks_init()
            defer { mtmd_input_chunks_free(chunks) }
            var pictures: [OpaquePointer?] = bitmap.map { [$0] } ?? []
            let tokenized = prompt.withCString { c in
                var input = mtmd_input_text(text: c, text_len: strlen(c), add_special: true, parse_special: true)
                return mtmd_tokenize(media, chunks, &input, &pictures, pictures.count)
            }
            guard tokenized == 0, mtmd_helper_get_n_tokens(chunks) <= 2048 else { throw LlamaError("Candidate exceeds relevance context budget") }
            var past: llama_pos = 0
            status = mtmd_helper_eval_chunks(media, context, chunks, 0, 0, 512, true, &past)
        } else {
            let bytes = Array(prompt.utf8CString)
            var tokens = [llama_token](repeating: 0, count: bytes.count + 8)
            let count = llama_tokenize(llama_model_get_vocab(model), bytes, Int32(bytes.count - 1), &tokens, Int32(tokens.count), true, true)
            guard count > 0, count <= 2048 else { throw LlamaError("Candidate exceeds relevance context budget") }
            var result: Int32 = 0
            for start in stride(from: 0, to: Int(count), by: 512) {
                result = tokens.withUnsafeMutableBufferPointer { buffer in
                    llama_decode(context, llama_batch_get_one(buffer.baseAddress!.advanced(by: start), Int32(min(512, Int(count) - start))))
                }
                if result != 0 { break }
            }
            status = result
        }
        guard status == 0, let scores = llama_get_embeddings_seq(context, 0), scores[0].isFinite,
              scores[0] >= 0, scores[0] <= 1 else { throw LlamaError("Invalid local relevance score") }
        return Double(scores[0])
    }
}
