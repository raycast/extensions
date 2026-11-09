import { Toast } from "@raycast/api";

export function formatCharacterCount(count: number) {
  return `${count} ${count === 1 ? "character" : "characters"}`;
}

export function formatProgressTitle(remaining: number) {
  return `Typing clipboard, ${formatCharacterCount(remaining)} remaining`;
}

/** Throttles toast title updates, since progress can arrive faster than the toast should re-render. */
export function createProgressToast(toast: Toast) {
  let latestRemaining = 0;
  let updateTimer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    updateTimer = undefined;
    toast.title = formatProgressTitle(latestRemaining);
  };

  return {
    update(remaining: number) {
      latestRemaining = remaining;
      updateTimer ??= setTimeout(flush, 100);
    },
    finish() {
      if (updateTimer) {
        clearTimeout(updateTimer);
        updateTimer = undefined;
      }
    },
  };
}
