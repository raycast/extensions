import { Cache, Tool } from "@raycast/api";
import { lstat } from "node:fs/promises";
import { canonicalTags, FileBatch, normalizeTags } from "./models";
import { canonicalizeForFiles, loadCatalog, mutateFiles, readBatches, resolvePaths } from "./service";
import { planKey, readPlan, WriteInput, WritePlan } from "./confirmation-plan";

const cache = new Cache({ namespace: "write-confirmations" });

export function writeConfirmation(kind: "add" | "remove"): Tool.Confirmation<WriteInput> {
  return async (input) => {
    if (!input.tags.length) throw new Error("Provide at least one tag.");
    normalizeTags(input.tags);
    const key = planKey(kind, input);
    const pending = cache.get(key);
    if (pending) {
      let active = false;
      try {
        readPlan(pending);
        active = true;
      } catch {
        cache.remove(key);
      }
      if (active)
        throw new Error(
          "A confirmation for this change is already pending. Complete it, or retry after its two-minute expiry.",
        );
    }
    const paths = await resolvePaths(input.paths);
    const current = await readBatches(paths);
    let tags = await canonicalizeForFiles(input.tags, current.files);
    // Reuse spelling from files elsewhere in the scope too. Index availability must not block a direct write.
    try {
      tags = canonicalTags(tags, (await loadCatalog()).tags);
    } catch {
      /* Direct paths still work without Spotlight. */
    }
    const plan: WritePlan = { createdAt: Date.now(), tags, paths: [], failures: [...current.failures] };
    for (const file of current.files) {
      try {
        const info = await lstat(file.path);
        plan.paths.push({ path: file.path, device: info.dev, inode: info.ino });
      } catch (error) {
        plan.failures.push({ path: file.path, message: error instanceof Error ? error.message : String(error) });
      }
    }
    if (!plan.paths.length)
      throw new Error(
        plan.failures.map((failure) => `${failure.path}: ${failure.message}`).join("\n") ||
          "No readable files selected.",
      );
    cache.set(key, JSON.stringify(plan));
    return {
      message: `${kind === "add" ? "Add" : "Remove"} ${tags.map((tag) => `“${tag}”`).join(", ")} ${kind === "add" ? "on" : "from"} ${plan.paths.length} files? Other tags are kept. This preview expires in two minutes.`,
      info: [
        { name: "Files", value: plan.paths.map((file) => file.path).join("\n") },
        { name: "Tags", value: tags.join(", ") },
        ...(plan.failures.length
          ? [
              {
                name: "Skipped Files",
                value: plan.failures.map((failure) => `${failure.path}: ${failure.message}`).join("\n"),
              },
            ]
          : []),
      ],
    };
  };
}

export async function executeWrite(kind: "add" | "remove", input: WriteInput): Promise<FileBatch> {
  const key = planKey(kind, input);
  const plan = readPlan(cache.get(key));
  cache.remove(key);
  const paths: string[] = [];
  const failures = [...plan.failures];
  for (const file of plan.paths) {
    try {
      const current = await lstat(file.path);
      if (current.dev !== file.device || current.ino !== file.inode)
        throw new Error("The file changed since confirmation. Confirm it again.");
      paths.push(file.path);
    } catch (error) {
      failures.push({ path: file.path, message: error instanceof Error ? error.message : String(error) });
    }
  }
  const result = await mutateFiles(paths, { kind, tags: plan.tags });
  return { files: result.files, failures: [...failures, ...result.failures] };
}
