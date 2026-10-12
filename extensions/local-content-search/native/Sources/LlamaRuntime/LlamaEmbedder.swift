import CLlama
import DigUpKit
import Foundation

/// EmbeddingGemma 2 on llama.cpp (Metal), in this process: the image and audio encoders (mtmd) feed the text model, and
/// its mean-pooled, L2-normalized output is the vector.
///
/// Inputs are framed as the reference (mlx-vlm, transformers) frames them: `<bos> text <eos>`,
/// `<bos> <|image> soft tokens <image|> <eos>` and the same for audio. The model is non-causal with no KV cache, so
/// each input, token ids and encoder rows together, goes through one `llama_process` call, as llama-server's mixed
/// batches do. Measured against mlx-vlm bf16: cosine ≥ 0.999 on text and images, 0.9998 on a 30 s audio window.
/// Audio past 30 s is dropped, as in the reference.
///
/// One thread at a time; `close()` frees the model (about 1 GB, or 0.25 GB text-only).
public final class LlamaEmbedder: Embedder {
    public static let budgets = [70, 140, 280, 560, 1120]

    /// Which vectors this pipeline makes (the model files, llama.cpp, the resizing here, the prompts). It changes only
    /// when the vectors do, and `ReferenceVectorTests` says when that is: every llama.cpp update must reproduce the
    /// reference vectors, or come with a new version here (then every index embeds again). Indexes record this, not the
    /// llama.cpp build, so an update that leaves the vectors alone keeps them (b11461 made version 1).
    public static let vectorVersion = 1

    /// The llama.cpp release this was built with (`scripts/build-llama.sh`), for logs.
    public static let buildTag = LLAMA_BUILD_TAG

    /// What every LlamaEmbedder reports (its `vectorSource` goes into index fingerprints), known without loading it.
    public static let modelInfo = WorkerInfo(model: "google/embeddinggemma-2", revision: LlamaModels.revision,
                                             runtime: "llama.cpp-vectors\(vectorVersion)",
                                             dtype: "text-q8_0+mmproj-q8_0", dim: 768, textOnly: false,
                                             loadSeconds: nil)

    public private(set) var info: WorkerInfo
    private var model: OpaquePointer?
    private var context: OpaquePointer?
    private var media: OpaquePointer?
    private var batch: OpaquePointer?
    private let vocab: OpaquePointer?
    private let embeddingSize: Int   // 768: the output projection
    private let rowSize: Int         // the width of encoder rows fed to the text model
    private let maxTokens: Int
    private static let maxSequences = 16
    // Bound CPU work even when indexing on a many-core Mac; Metal still handles model inference.
    private static let maxCPUThreads: Int32 = 4
    private var sequences: Int32 = 0  // in `batch`
    private var tokens = 0            // in `batch`
    private var position: llama_pos = 0

    /// `textOnly`: just the text model (queries). `log`: where llama.cpp's warnings and errors go (stderr when nil).
    public init(models: LlamaModels, textOnly: Bool, log: URL? = nil) throws {
        let started = Date()
        LlamaLog.shared.send(to: log)
        _ = Self.backend
        guard textOnly || models.media != nil else {
            throw WorkerError.notFound("\(LlamaModels.mediaFile) (images and audio) isn't downloaded yet")
        }
        var modelParams = llama_model_default_params()
        modelParams.n_gpu_layers = 999
        guard let model = llama_model_load_from_file(models.text.path, modelParams) else {
            throw WorkerError.failed("can't load \(models.text.path)")
        }
        // One input must fit one micro-batch: 2048 tokens (the reference's cut), which also holds a 1120-token image or
        // a 750-token 30 s clip. Queries are short, so the query encoder reserves less and cuts at 512.
        let maxTokens = textOnly ? 512 : 2048
        var params = llama_context_default_params()
        params.n_threads = Self.maxCPUThreads
        params.n_threads_batch = Self.maxCPUThreads
        params.n_ctx = UInt32(maxTokens)
        params.n_batch = UInt32(maxTokens)
        params.n_ubatch = UInt32(maxTokens)
        params.n_seq_max = UInt32(Self.maxSequences)
        params.kv_unified = true   // each input may use the whole context, as in llama-embedding
        params.embeddings = true
        params.pooling_type = LLAMA_POOLING_TYPE_MEAN
        guard let context = llama_init_from_model(model, params) else {
            llama_model_free(model)
            throw WorkerError.failed("can't create a llama.cpp context")
        }
        var media: OpaquePointer?
        if let mediaFile = models.media, !textOnly {
            var mediaParams = mtmd_context_params_default()
            mediaParams.n_threads = Self.maxCPUThreads
            mediaParams.use_gpu = true
            mediaParams.print_timings = false
            mediaParams.warmup = true
            mediaParams.image_min_tokens = 1      // never rescale: images arrive at their final size (ImageSizing)
            mediaParams.image_max_tokens = 1120
            media = mtmd_init_from_file(mediaFile.path, model, mediaParams)
            if media == nil {
                llama_free(context)
                llama_model_free(model)
                throw WorkerError.failed("can't load \(mediaFile.path)")
            }
        }
        self.model = model
        self.context = context
        self.media = media
        batch = llama_batch_ext_init(context)
        vocab = llama_model_get_vocab(model)
        embeddingSize = Int(llama_model_n_embd_out(model))
        rowSize = Int(llama_model_n_embd_inp(model))
        self.maxTokens = maxTokens
        let known = Self.modelInfo
        info = WorkerInfo(model: known.model, revision: known.revision, runtime: known.runtime, dtype: known.dtype,
                          dim: embeddingSize, textOnly: textOnly, loadSeconds: nil)
        // The first calls build the Metal pipelines: pay that now (the panel is opening).
        do {
            for _ in 0..<2 { _ = try embedTexts([Prompts.query("warm up")]) }
        } catch {
            close()
            throw error
        }
        let seconds = (Date().timeIntervalSince(started) * 100).rounded() / 100
        info = WorkerInfo(model: info.model, revision: info.revision, runtime: info.runtime, dtype: info.dtype,
                          dim: info.dim, textOnly: textOnly, loadSeconds: seconds)
        LlamaLog.shared.line("ready in \(seconds) s (\(textOnly ? "text-only" : "full"), llama.cpp \(Self.buildTag), "
                             + "vectors \(Self.vectorVersion))")
    }

    deinit { close() }

    public func close() {
        if let batch { llama_batch_ext_free(batch) }
        if let media { mtmd_free(media) }
        if let context { llama_free(context) }
        if let model { llama_model_free(model) }
        (batch, media, context, model) = (nil, nil, nil, nil)
    }

    // MARK: Embedder

    public func embedTexts(_ texts: [String]) throws -> [[Float]] {
        reset()
        var vectors: [[Float]] = []
        for text in texts {
            let tokens = tokenize(text)
            if sequences == Self.maxSequences || self.tokens + tokens.count > maxTokens { vectors += try run() }
            begin()
            for token in tokens { try add(token: token) }
        }
        if sequences > 0 { vectors += try run() }
        return vectors
    }

    public func embedImages(_ paths: [String], budget: Int) throws -> [Embedding] {
        guard media != nil else { throw WorkerError.failed("this embedder was started text-only") }
        guard Self.budgets.contains(budget) else { throw WorkerError.failed("budget must be one of \(Self.budgets)") }
        return paths.map { path in embedding { try embedMedia(path, image: true, budget: budget) } }
    }

    public func embedAudio(_ paths: [String]) throws -> [Embedding] {
        guard media != nil else { throw WorkerError.failed("this embedder was started text-only") }
        return paths.map { path in embedding { try embedMedia(path, image: false, budget: 0) } }
    }

    /// One file's vector, or why it has none (an unreadable file must not sink its neighbours).
    private func embedding(_ make: () throws -> [Float]) -> Embedding {
        do {
            return Embedding(vector: try make(), error: nil)
        } catch {
            return Embedding(vector: nil, error: String("\(error)".prefix(300)))
        }
    }

    // MARK: Media

    private func embedMedia(_ path: String, image: Bool, budget: Int) throws -> [Float] {
        let bitmap = try load(path, image: image, budget: budget)
        defer { mtmd_bitmap_free(bitmap) }
        let chunks = mtmd_input_chunks_init()
        defer { mtmd_input_chunks_free(chunks) }
        var bitmaps: [OpaquePointer?] = [bitmap]
        let status = String(cString: mtmd_default_marker()).withCString { marker in
            var text = mtmd_input_text(text: marker, text_len: strlen(marker), add_special: true, parse_special: true)
            return mtmd_tokenize(media, chunks, &text, &bitmaps, 1)
        }
        guard status == 0 else { throw LlamaError("can't tokenize \(path) (\(status))") }
        reset()
        begin()
        for index in 0..<mtmd_input_chunks_size(chunks) {
            let chunk = mtmd_input_chunks_get(chunks, index)
            if mtmd_input_chunk_get_type(chunk) == MTMD_INPUT_CHUNK_TYPE_TEXT {
                var count = 0
                guard let tokens = mtmd_input_chunk_get_tokens_text(chunk, &count) else { continue }
                for i in 0..<count { try add(token: tokens[i]) }
            } else {
                guard mtmd_encode_chunk(media, chunk) == 0, let rows = mtmd_get_output_embd(media) else {
                    throw LlamaError("the encoder failed on \(path)")
                }
                try add(rows: rows, count: mtmd_input_chunk_get_n_tokens(chunk))
            }
        }
        return try run()[0]
    }

    /// Reads an image or audio file with mtmd's helpers (stb_image, miniaudio at 16 kHz), resizes images for `budget`
    /// and cuts audio at 30 s. The caller frees the bitmap.
    private func load(_ path: String, image: Bool, budget: Int) throws -> OpaquePointer {
        let wrapper = mtmd_helper_bitmap_init_from_file(media, path, false, mtmd_helper_init_opt_default())
        if let video = wrapper.video_ctx {
            if let bitmap = wrapper.bitmap { mtmd_bitmap_free(bitmap) }
            mtmd_helper_video_free(video)
            throw LlamaError("video goes in as frames and sound, not as a file: \(path)")
        }
        guard let bitmap = wrapper.bitmap else { throw LlamaError("can't read \(path)") }
        guard mtmd_bitmap_is_audio(bitmap) != image else {
            mtmd_bitmap_free(bitmap)
            throw LlamaError("not \(image ? "an image" : "audio"): \(path)")
        }
        if image {
            let width = Int(mtmd_bitmap_get_nx(bitmap)), height = Int(mtmd_bitmap_get_ny(bitmap))
            guard let target = ImageSizing.targetSize(height: height, width: width, budget: budget) else {
                mtmd_bitmap_free(bitmap)
                throw LlamaError("image too thin to embed: \(path)")
            }
            guard target != (height, width) else { return bitmap }
            defer { mtmd_bitmap_free(bitmap) }
            let pixels = ImageSizing.resizeBicubic(mtmd_bitmap_get_data(bitmap), width: width, height: height,
                                                   toWidth: target.width, toHeight: target.height)
            guard let resized = mtmd_bitmap_init(UInt32(target.width), UInt32(target.height), pixels) else {
                throw LlamaError("can't resize \(path)")
            }
            return resized
        }
        let samples = mtmd_bitmap_get_n_bytes(bitmap) / MemoryLayout<Float>.size
        let limit = 30 * Int(mtmd_get_audio_sample_rate(media))
        guard samples > limit else { return bitmap }
        defer { mtmd_bitmap_free(bitmap) }
        let prefix = mtmd_bitmap_get_data(bitmap).withMemoryRebound(to: Float.self, capacity: limit) {
            mtmd_bitmap_init_from_audio(limit, $0)
        }
        guard let prefix else { throw LlamaError("can't cut \(path) at 30 s") }
        return prefix
    }

    // MARK: Text model

    /// `<bos> text <eos>`, cut to `maxTokens` the way transformers cuts (keeping both special tokens).
    private func tokenize(_ text: String) -> [llama_token] {
        let utf8 = Array(text.utf8CString)
        var tokens = [llama_token](repeating: 0, count: utf8.count + 8)
        var count = llama_tokenize(vocab, utf8, Int32(utf8.count - 1), &tokens, Int32(tokens.count), true, true)
        if count < 0 {
            tokens = [llama_token](repeating: 0, count: Int(-count))
            count = llama_tokenize(vocab, utf8, Int32(utf8.count - 1), &tokens, Int32(tokens.count), true, true)
        }
        tokens.removeLast(tokens.count - Int(max(count, 0)))
        if tokens.count > maxTokens {
            tokens = Array(tokens[0..<(maxTokens - 1)]) + [llama_vocab_eos(vocab)]
        }
        return tokens
    }

    /// Starts the next input in the batch (each input is its own sequence).
    private func begin() {
        sequences += 1
        position = 0
    }

    /// Drops everything added so far, including an input that failed halfway.
    private func reset() {
        llama_batch_ext_clear(batch)
        sequences = 0
        tokens = 0
    }

    private func add(token: llama_token) throws {
        try place(llama_batch_ext_add_token(batch, sequences - 1, token))
    }

    private func add(rows: UnsafeMutablePointer<Float>, count: Int) throws {
        for row in 0..<count {
            let embd = llama_embd(data: rows + row * rowSize, n_rows: 1, n_embd: rowSize)   // copied by the batch
            try place(llama_batch_ext_add_embd(batch, sequences - 1, embd))
        }
    }

    private func place(_ index: Int32) throws {
        guard index >= 0 else { throw LlamaError("batch full (\(index))") }
        var pos: [llama_pos] = [position, 0, 0, 0]
        guard llama_batch_ext_set_pos(batch, index, &pos), llama_batch_ext_set_output_embd(batch, index, true) else {
            throw LlamaError("can't place token \(index)")
        }
        position += 1
        tokens += 1
    }

    /// Runs the text model over the batch and returns one L2-normalized vector per input, in order.
    private func run() throws -> [[Float]] {
        defer { reset() }
        let status = llama_process(context, LLAMA_PROCESS_TYPE_ENCODE, batch)
        guard status == 0 else { throw WorkerError.failed("llama_process failed (\(status))") }
        return try (0..<sequences).map { sequence in
            guard let pooled = llama_get_embeddings_seq(context, sequence) else {
                throw WorkerError.failed("no pooled embedding for input \(sequence)")
            }
            var sum = 0.0
            for i in 0..<embeddingSize { sum += Double(pooled[i]) * Double(pooled[i]) }
            let scale = sum > 0 ? Float(1 / sum.squareRoot()) : 0
            return (0..<embeddingSize).map { pooled[$0] * scale }
        }
    }

    /// llama.cpp's process-wide setup, once.
    private static let backend: Void = {
        llama_log_set(LlamaLog.callback, LlamaLog.userData)
        mtmd_helper_log_set(LlamaLog.callback, LlamaLog.userData)
        llama_backend_init()
    }()
}

/// A problem with one input (it gets no vector; its neighbours go on).
struct LlamaError: Error, CustomStringConvertible {
    let description: String
    init(_ description: String) { self.description = description }
}

/// llama.cpp's log is process-wide: warnings and errors go to one file (or stderr), the rest is dropped (it logs a lot
/// at load time).
final class LlamaLog: @unchecked Sendable {
    static let shared = LlamaLog()
    nonisolated(unsafe) static let userData = Unmanaged.passUnretained(shared).toOpaque()
    nonisolated(unsafe) static let callback: ggml_log_callback = { level, text, userData in
        guard let text, let userData else { return }
        Unmanaged<LlamaLog>.fromOpaque(userData).takeUnretainedValue().write(level, String(cString: text))
    }

    private let lock = NSLock()
    private var file: FileHandle?             // nil: stderr
    private var level = GGML_LOG_LEVEL_INFO   // CONT continues the previous message, at its level

    func send(to url: URL?) {
        lock.withLock {
            try? file?.close()
            file = nil
            guard let url else { return }
            if !FileManager.default.fileExists(atPath: url.path) {
                FileManager.default.createFile(atPath: url.path, contents: nil)
            }
            file = try? FileHandle(forWritingTo: url)
            file?.seekToEndOfFile()
        }
    }

    /// One of our own lines.
    func line(_ message: String) {
        lock.withLock { (file ?? .standardError).write(Data("[llama.cpp worker] \(message)\n".utf8)) }
    }

    private func write(_ level: ggml_log_level, _ text: String) {
        lock.withLock {
            if level != GGML_LOG_LEVEL_CONT { self.level = level }
            guard self.level.rawValue >= GGML_LOG_LEVEL_WARN.rawValue else { return }
            (file ?? .standardError).write(Data(text.utf8))
        }
    }
}
