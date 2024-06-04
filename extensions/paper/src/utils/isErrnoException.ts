import { ErrnoException, ArbitraryObject } from "../types";

export function isErrnoException(error: unknown): error is ErrnoException {
  return (
    isArbitraryObject(error) &&
    error instanceof Error &&
    (typeof error.errno === "number" || typeof error.errno === "undefined") &&
    (typeof error.code === "string" || typeof error.code === "undefined") &&
    (typeof error.path === "string" || typeof error.path === "undefined") &&
    (typeof error.syscall === "string" || typeof error.syscall === "undefined")
  );
}

function isArbitraryObject(potentialObject: unknown): potentialObject is ArbitraryObject {
  return typeof potentialObject === "object" && potentialObject !== null;
}
