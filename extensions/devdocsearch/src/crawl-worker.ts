import { crawlDocs, crawlWithFirecrawl, type CrawlProgress } from "./docs";
import { beginSnapshot, type Collection } from "./library";

type ImportRequest = { rootUrl: string; engine: "built-in" | "firecrawl"; firecrawlUrl: string; maxPages?: number };
type WorkerMessage = { kind: "progress"; progress: CrawlProgress } | { kind: "complete"; collection: Collection } | { kind: "error"; error: string };

function send(message: WorkerMessage) { process.stdout.write(`${JSON.stringify(message)}\n`); }

export async function runImport(request: ImportRequest): Promise<Collection> {
  const url = new URL(request.rootUrl);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Enter an HTTP or HTTPS documentation URL.");
  url.hash = "";
  url.search = "";
  const snapshot = await beginSnapshot(url.toString());
  try {
    const progress = (value: CrawlProgress) => send({ kind: "progress", progress: value });
    const maxPages = request.maxPages ?? 2000;
    const result = request.engine === "firecrawl"
      ? await crawlWithFirecrawl(url.toString(), request.firecrawlUrl, progress, maxPages, snapshot.addPage, false)
      : await crawlDocs(url.toString(), progress, maxPages, snapshot.addPage, false);
    if (result.errors.length || result.truncated) {
      throw new Error(`${result.pageCount} pages saved in an incomplete snapshot; ${result.errors.length} fetch errors${result.truncated ? "; page limit reached" : ""}. Previous searchable collection was kept. ${result.errors[0] ?? ""}`);
    }
    send({ kind: "progress", progress: { done: result.pageCount, queued: 0, current: "Publishing offline index" } });
    const collection = await snapshot.publish(result.errors, result.truncated, result.skipped);
    send({ kind: "complete", collection });
    return collection;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await snapshot.abandon(message);
    throw error;
  }
}

if (require.main === module) {
  const request = JSON.parse(process.argv[2] ?? "null") as ImportRequest;
  runImport(request).catch((error) => {
    send({ kind: "error", error: error instanceof Error ? error.message : String(error) });
    process.exitCode = 1;
  });
}
