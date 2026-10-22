/**
 * Detail views that are open, innermost last. A pushed detail keeps the item it was opened with, so
 * after an action that changes or removes that item (list screens revalidate for it) the detail must
 * close, or it would keep offering actions on something that is gone or already advanced.
 */
const closers: Array<() => void> = [];

export function registerDetail(close: () => void) {
  closers.push(close);

  return () => {
    const index = closers.lastIndexOf(close);
    if (index >= 0) closers.splice(index, 1);
  };
}

export function closeTopDetail() {
  closers.at(-1)?.();
}

/**
 * Captures the detail open when an action starts. The returned function closes it only if it is
 * still the innermost detail: after an await, the user may have left it or opened another one.
 */
export function captureTopDetail() {
  const close = closers.at(-1);
  return () => {
    if (close && closers.at(-1) === close) close();
  };
}
