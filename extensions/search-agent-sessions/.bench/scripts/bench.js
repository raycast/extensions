"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Benchmarks the shipped search path: cold full re-index, then time-to-first-row
 * for representative queries. Run with `npm run bench`.
 */
const node_fs_1 = require("node:fs");
const corpus_1 = require("../src/lib/corpus");
const filter_1 = require("../src/lib/filter");
const paths_1 = require("../src/lib/paths");
const query_1 = require("../src/lib/query");
const format_1 = require("../src/lib/format");
const results_1 = require("../src/lib/results");
const search_1 = require("../src/lib/search");
function fmt(ms) {
    return `${ms.toFixed(0)}ms`;
}
/**
 * Drives the shipped ResultStore over both ripgrep passes with the hook's own
 * throttle, so "first paint" here is the list the user actually sees first.
 */
function measure(raw, sessions) {
    const query = (0, query_1.parseQuery)(raw);
    const store = new results_1.ResultStore();
    store.sessions = sessions;
    store.allow = (0, filter_1.makeFilter)(query, {
        searchRoot: "~/code",
        ignore: ["node_modules", "dist", ".build", "vendor", ".git"],
        includeOutsideRoot: false,
    });
    store.startQuery(query.words);
    const started = process.hrtime.bigint();
    const since = () => Number(process.hrtime.bigint() - started) / 1e6;
    return new Promise((resolve) => {
        let firstHitMs = -1;
        let firstRowMs = -1;
        let allWordsPassMs = -1;
        let lines = 0;
        let firstPaint;
        let timer;
        const flush = () => {
            timer = undefined;
            const rows = store.buildRows(since() < results_1.RESORT_WINDOW_MS);
            if (firstRowMs === -1 && rows.length > 0) {
                firstRowMs = since();
                firstPaint = { rows: rows.length, top: rows[0] };
            }
        };
        // Same rule as the hook: nothing on screen yet means paint now, otherwise
        // coalesce onto the throttle.
        const scheduleFlush = () => {
            if (timer)
                return;
            const delay = store.order.length === 0 ? 0 : results_1.FLUSH_INTERVAL_MS;
            timer = setTimeout(flush, delay);
        };
        const handle = (0, search_1.search)(query.words, {
            onLines(batch) {
                lines += batch.length;
                // Batch granularity, unlike the per-line reading this replaced: the
                // hook cannot react mid-batch either.
                if (store.ingestLines(batch)) {
                    if (firstHitMs === -1)
                        firstHitMs = since();
                    scheduleFlush();
                }
            },
            onPassDone(pass) {
                if (pass === "all")
                    allWordsPassMs = since();
                scheduleFlush();
            },
            onDone() {
                if (timer)
                    clearTimeout(timer);
                timer = undefined;
                flush();
                // A final free re-sort, matching the settle flush the hook fires as the
                // re-order window closes.
                const top = store.buildRows(true);
                handle.cancel();
                resolve({
                    firstHitMs,
                    firstRowMs,
                    allWordsPassMs,
                    totalMs: since(),
                    sessions: store.hits.size,
                    lines,
                    top: top.slice(0, 5),
                    firstPaint,
                });
            },
            onError(err) {
                throw err;
            },
        });
    });
}
async function main() {
    console.log("--- cold full re-index ---");
    (0, node_fs_1.rmSync)(paths_1.CACHE_DIR, { recursive: true, force: true });
    const cold = await (0, corpus_1.refresh)();
    const corpusBytes = (0, node_fs_1.statSync)(paths_1.CORPUS_PATH).size;
    console.log(`rebuilt=${cold.rebuilt} transcripts=${cold.filesIndexed} read=${(cold.bytesRead / 1e6).toFixed(0)}MB ` +
        `corpus=${(corpusBytes / 1e6).toFixed(1)}MB sessions=${cold.sessions.length} wall=${fmt(cold.ms)}`);
    console.log("\n--- warm incremental refresh ---");
    // Mirrors how the extension opens: parse the manifest once for the first
    // paint, then hand that same copy to refresh.
    const warm = await (0, corpus_1.refresh)({ manifest: (0, corpus_1.loadManifest)() });
    console.log(`transcripts=${warm.filesIndexed} read=${(warm.bytesRead / 1e6).toFixed(1)}MB wall=${fmt(warm.ms)}`);
    const sessions = new Map(warm.sessions.map((s) => [s.key, s]));
    for (const q of process.argv.slice(2).length
        ? process.argv.slice(2)
        : DEFAULT_QUERIES) {
        console.log(`\n--- query: ${q} ---`);
        const r = await measure(q, sessions);
        console.log(`first hit=${fmt(r.firstHitMs)} first row=${fmt(r.firstRowMs)} all-words pass=${fmt(r.allWordsPassMs)} ` +
            `complete=${fmt(r.totalMs)} sessions=${r.sessions} lines scanned=${r.lines}`);
        if (r.firstPaint) {
            const t = r.firstPaint.top;
            console.log(`first paint: ${r.firstPaint.rows} row(s), top = [${t?.hit?.words}w span=${t?.hit?.span}] ` +
                `${t?.session.project} mtime=${(0, format_1.relativeTime)(t?.session.mtimeMs ?? 0)}`);
        }
        for (const row of r.top) {
            console.log(`  [${row.hit?.words}w span=${row.hit?.span}] ${row.session.project} — ${row.session.title.slice(0, 70)}`);
        }
    }
}
const DEFAULT_QUERIES = [
    "orbit controls camera dir:pixie",
    "hibernation terminal",
    "raycast",
];
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
