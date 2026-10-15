import type { Status } from "../../engine/api";

/** Changes that can alter a search, rather than every progress/status update. */
export function searchRevision(status: Status | null, code: boolean): string {
  if (!status) return "starting";
  const index = code ? status.code : status.main;
  return JSON.stringify([
    status.startedAt,
    status.setup.state,
    status.encoder,
    code ? status.codeFolders : status.folders,
    index?.total.files,
    index?.total.done,
    index?.total.partial,
    index?.vectors,
    index?.segments,
  ]);
}
