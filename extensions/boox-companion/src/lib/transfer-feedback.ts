import { TransferMode, TransferResult } from "../models/boox";

export function describeTransferSuccess(result: TransferResult, deviceModel: string, mode: TransferMode): string {
  const noun = mode === "library" ? "document" : "file";
  const target = mode === "library" ? `${deviceModel} Library` : deviceModel;
  const notIndexed = result.items.filter((item) => item.status === "uploaded" && item.indexed === false).length;
  const completed = result.uploaded
    ? `${mode === "library" ? "Added" : "Sent"} ${result.uploaded} ${noun}${result.uploaded === 1 ? "" : "s"} to ${target}`
    : `No ${noun}s ${mode === "library" ? "added" : "sent"} to ${target}`;
  const details = [
    result.skipped ? `${result.skipped} skipped` : undefined,
    notIndexed ? `${notIndexed} awaiting Library indexing` : undefined,
  ].filter(Boolean);
  return [completed, ...details].join(" · ");
}
