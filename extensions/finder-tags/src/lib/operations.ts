import { FileBatch, Mutation } from "./models";

export async function mutateInBatches(
  paths: string[],
  mutation: Mutation,
  write: (paths: string[], mutation: Mutation) => Promise<FileBatch>,
  onProgress?: (done: number, total: number) => void,
): Promise<FileBatch> {
  const result: FileBatch = { files: [], failures: [] };
  const unique = [...new Set(paths)];
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    try {
      const batch = await write(chunk, mutation);
      result.files.push(...batch.files);
      result.failures.push(...batch.failures);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      result.failures.push(
        ...chunk.map((path) => ({
          path,
          message: `Could not verify the write result. Check this file's tags before retrying. ${reason}`,
        })),
      );
    }
    onProgress?.(Math.min(i + 100, unique.length), unique.length);
  }
  return result;
}
