/** A heartbeat reports elapsed time, not a guessed percentage of unknown work. */
export function setupProgress(publish: (message: string) => void) {
  let phase = "";
  let detail = "";
  let started = Date.now();
  let budget = 0;
  const duration = (ms: number) => {
    const seconds = Math.floor(Math.max(0, ms) / 1000);
    return seconds < 60
      ? seconds + "s"
      : Math.floor(seconds / 60) + "m " + (seconds % 60) + "s";
  };
  const emit = () =>
    publish(
      [
        phase,
        detail,
        duration(Date.now() - started) + " elapsed",
        "up to " + duration(budget),
      ]
        .filter(Boolean)
        .join(" · "),
    );
  const timer = setInterval(() => {
    if (phase) emit();
  }, 1000);
  return {
    phase(label: string, budgetMs: number) {
      phase = label;
      detail = "";
      started = Date.now();
      budget = budgetMs;
      emit();
    },
    update(message: string) {
      detail = message;
      emit();
    },
    stop() {
      clearInterval(timer);
    },
  };
}
