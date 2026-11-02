import { Status } from "../service/protocol";

// One command joins duplicate effects/actions; the kernel lock still excludes separate commands.
export function createSetupTask() {
  let pending: Promise<void> | undefined;
  return (task: () => Promise<void>): Promise<void> => {
    if (pending) {
      return pending;
    }
    pending = Promise.resolve()
      .then(task)
      .finally(() => {
        pending = undefined;
      });
    return pending;
  };
}

// Keep the status identity stable when background polling reports no changes.
export function retainStatus(
  previous: Status | undefined,
  next: Status,
): Status {
  return previous && JSON.stringify(previous) === JSON.stringify(next)
    ? previous
    : next;
}
