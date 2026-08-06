"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.search = search;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const paths_1 = require("./paths");
/**
 * Budget for the partial-match pass. Truncating it drops the END OF THE FILE,
 * and which sessions that costs depends on how the corpus was last written: a
 * full rebuild writes files in mtime-descending order, so the tail holds the
 * OLDEST sessions, while later incremental appends land the newest sessions
 * there. So this is a runaway guard for a corpus far larger than today's, not a
 * routine limit: the worst common-word query measured here streams the whole
 * corpus in ~0.4s, and pass 1 (the top of the ranking) has already completed.
 * Whenever it does fire, {@link SearchCallbacks.onTruncated} reports it.
 */
const PARTIAL_BUDGET_MS = 2000;
const RG_BASE = [
    "--no-config",
    "--no-messages",
    "--color=never",
    "-F",
    "-i",
    "-N",
    // Without this a single stray NUL makes rg abandon the whole corpus and print
    // one "binary file matches" line, which reads downstream as zero results.
    "--text",
];
/**
 * Splits a stdout stream into lines, delivering them in chunk-sized batches.
 * `stop` ends the stream when a batch returns false, and records that the
 * teardown was deliberate so the exit code is not read as a failure.
 */
function pump(proc, onBatch, stop) {
    let rest = "";
    proc.stdout.setEncoding("utf8");
    proc.stdout.on("data", (chunk) => {
        const combined = rest + chunk;
        const cut = combined.lastIndexOf("\n");
        if (cut === -1) {
            rest = combined;
            return;
        }
        rest = combined.slice(cut + 1);
        const lines = combined.slice(0, cut).split("\n");
        if (!onBatch(lines))
            stop(proc);
    });
    proc.stdout.on("end", () => {
        if (rest)
            onBatch([rest]);
        rest = "";
    });
}
/**
 * Two streaming passes over the derived corpus.
 *
 * Pass 1 chains one `rg` per word, so it emits exactly the lines containing
 * every word — the top of the ranking, delivered first and in full. Pass 2 then
 * sweeps for any single word to surface partial matches below them. Both are
 * consumed incrementally; nothing waits for a process to exit.
 *
 * Pass 2 necessarily re-emits every pass 1 line: excluding them means matching
 * "not (word1 and ... and wordN)", which no chain of rg filters can express.
 * Re-scoring them is harmless — a session keeps its best line either way.
 */
function search(words, callbacks) {
    const procs = [];
    /** Streams torn down on purpose; their non-zero exit is not a failure. */
    const stopped = new Set();
    let cancelled = false;
    let failed = false;
    // Nothing to grep for, and pass 1 would index words[0] blind.
    if (words.length === 0) {
        callbacks.onDone();
        return { cancel() { } };
    }
    if (!(0, node_fs_1.existsSync)(paths_1.CORPUS_PATH)) {
        callbacks.onError(new Error(`Search index not found at ${paths_1.CORPUS_PATH}`));
        callbacks.onDone();
        return { cancel() { } };
    }
    const stop = (proc) => {
        stopped.add(proc);
        proc.stdout.destroy();
    };
    const kill = () => {
        for (const p of procs) {
            stop(p);
            try {
                p.kill("SIGKILL");
            }
            catch {
                // Already exited.
            }
        }
        procs.length = 0;
    };
    const spawnRg = (args) => {
        const proc = (0, node_child_process_1.spawn)(paths_1.RG_BIN, args, {
            stdio: ["pipe", "pipe", "ignore"],
            env: paths_1.SPAWN_ENV,
        });
        // A killed upstream stage makes downstream writes fail; that is expected.
        proc.stdin.on("error", () => undefined);
        proc.on("error", (err) => {
            if (!cancelled)
                callbacks.onError(err);
        });
        proc.on("close", (code) => {
            // 1 means "no matches", a normal result, as does a stream we tore down
            // ourselves; only 2 and up (unreadable corpus, bad arguments) are faults.
            if (cancelled || stopped.has(proc) || code === null || code < 2)
                return;
            failed = true;
            callbacks.onError(new Error(`ripgrep failed (exit ${code})`));
        });
        procs.push(proc);
        return proc;
    };
    let stage = spawnRg([...RG_BASE, "-e", words[0], "--", paths_1.CORPUS_PATH]);
    for (let i = 1; i < words.length; i++) {
        const next = spawnRg([...RG_BASE, "-e", words[i]]);
        stage.stdout.pipe(next.stdin);
        stage = next;
    }
    const startPartial = () => {
        if (cancelled)
            return;
        // After a pass 1 failure the same corpus read would only fail again.
        if (failed || words.length < 2) {
            callbacks.onDone();
            return;
        }
        const deadline = Date.now() + PARTIAL_BUDGET_MS;
        const args = [...RG_BASE];
        for (const word of words)
            args.push("-e", word);
        args.push("--", paths_1.CORPUS_PATH);
        const proc = spawnRg(args);
        pump(proc, (lines) => {
            if (cancelled)
                return false;
            callbacks.onLines(lines);
            if (Date.now() < deadline)
                return true;
            callbacks.onTruncated?.();
            return false;
        }, stop);
        proc.on("close", () => {
            if (cancelled)
                return;
            callbacks.onPassDone("partial");
            callbacks.onDone();
        });
    };
    pump(stage, (lines) => {
        if (cancelled)
            return false;
        callbacks.onLines(lines);
        return true;
    }, stop);
    stage.on("close", () => {
        if (cancelled)
            return;
        callbacks.onPassDone("all");
        startPartial();
    });
    return {
        cancel() {
            cancelled = true;
            kill();
        },
    };
}
