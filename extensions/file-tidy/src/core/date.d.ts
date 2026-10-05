import type { Granularity } from "./config.js";
import type { SourceFile } from "./scan.js";

export function resolveDateBucket(
  file: SourceFile,
  granularity?: Granularity,
): Promise<{ bucket: string; source: "exif" | "fs" | "none" }>;
