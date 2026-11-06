// Word and Translation actions share one playback slot within a command.
let activeController: AbortController | null = null;

export function createPronunciationSession() {
  let controller: AbortController | null = null;

  return {
    start(): AbortSignal {
      const previous = activeController;
      const next = new AbortController();
      controller = next;
      activeController = next;
      previous?.abort();
      return next.signal;
    },
    finish(signal: AbortSignal): void {
      if (controller?.signal !== signal) return;
      if (activeController === controller) activeController = null;
      controller = null;
    },
    cancel(): void {
      const current = controller;
      controller = null;
      if (activeController === current) activeController = null;
      current?.abort();
    },
  };
}
