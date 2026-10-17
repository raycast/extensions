import { opendir } from "node:fs/promises";
import path from "node:path";

import { directorySize, modifiedAt, pathExists } from "../lib/fs";
import type { CleanupProvider, ScanContext, ScanResult } from "../types";

export class XcodeProvider implements CleanupProvider {
  readonly id = "xcode" as const;

  async scan(context: ScanContext): Promise<ScanResult> {
    context.signal?.throwIfAborted();
    const derivedData = path.join(context.homeDirectory, "Library/Developer/Xcode/DerivedData");
    if (!(await pathExists(derivedData))) return { candidates: [], issues: [] };
    try {
      const directory = await opendir(derivedData);
      const candidates: ScanResult["candidates"] = [];
      for await (const entry of directory) {
        context.signal?.throwIfAborted();
        if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
        const child = path.join(derivedData, entry.name);
        candidates.push({
          id: `xcode:derived-data:${entry.name}`,
          providerId: "xcode",
          section: "Xcode DerivedData",
          title: entry.name,
          subtitle: child,
          description: "Xcode will rebuild this project data when needed.",
          cleanupPolicy: "trash",
          risk: "review",
          selectedByDefault: false,
          bytes: await directorySize(child, context.signal),
          modifiedAt: await modifiedAt(child),
          path: child,
        });
      }
      return { candidates, issues: [] };
    } catch (error) {
      return { candidates: [], issues: [{ providerId: this.id, message: (error as Error).message }] };
    }
  }
}
