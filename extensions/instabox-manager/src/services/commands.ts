import { ExecRequest, ExecResult } from "../types";
import { machinePath, request } from "./instabox";

/** Runs `bash -lc <cmd>` in a running machine. Not idempotent: a retry runs the command again. */
export function execCommand(machineId: string, body: ExecRequest) {
  return request<ExecResult>("POST", machinePath(machineId, "/exec"), { body });
}
