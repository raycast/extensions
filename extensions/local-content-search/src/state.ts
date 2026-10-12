import { Status } from "../service/protocol";

// Keep the status identity stable when background polling reports no changes.
export function retainStatus(
  previous: Status | undefined,
  next: Status,
): Status {
  return previous && JSON.stringify(previous) === JSON.stringify(next)
    ? previous
    : next;
}
