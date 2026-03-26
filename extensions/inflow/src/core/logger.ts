// --- DEV SWITCH ---
// Instead of UI or package.json, you can toggle debug here when in development.
const ENABLE_DEBUG = false;
const IS_DEV = process.env.NODE_ENV === "development" && ENABLE_DEBUG;

/**
 * Logger utility that automatically becomes a no-op in production.
 * This helps the bundler (esbuild) to tree-shake and removes logs from the release.
 */
export const logger = {
  isEnabled(): boolean {
    return IS_DEV;
  },

  log: IS_DEV ? (message: string, ...args: unknown[]) => console.log(message, ...args) : () => {},

  info: IS_DEV ? (message: string, ...args: unknown[]) => console.info(`[INFO] ${message}`, ...args) : () => {},

  warn: IS_DEV ? (message: string, ...args: unknown[]) => console.warn(message, ...args) : () => {},

  error: IS_DEV ? (message: string, ...args: unknown[]) => console.error(message, ...args) : () => {},

  logErrorDetail(prefix: string, e: unknown) {
    if (!IS_DEV) return;
    this.error(`${prefix} threw an error`);
    if (e instanceof Error) {
      this.error(`  Error message: ${e.message}`);
      this.error(`  Error stack: ${e.stack}`);
    }
  },

  logPrompt(prompt: string) {
    if (!IS_DEV) return;
    const previewLength = 2000;
    if (prompt.length > previewLength) {
      this.log(
        `[runPrompt] FULL PROMPT (truncated):\n${prompt.substring(0, previewLength / 2)}... [TRUNCATED] ...${prompt.substring(prompt.length - previewLength / 2)}`,
      );
    } else {
      this.log(`[runPrompt] FULL PROMPT:\n------------------\n${prompt}\n------------------`);
    }
  },

  logInput(input: string) {
    if (!IS_DEV) return;
    const preview = input.substring(0, 50).replace(/\n/g, " ");
    this.log(`[runPrompt] Input (first 50 chars): "${preview}..."`);
  },

  logAIResponse(raw: string, processed: string) {
    if (!IS_DEV) return;
    this.log(`[runPrompt] Raw response length: ${raw.length}`);
    if (processed.length === 0) {
      this.warn("[runPrompt] WARNING: Processed result is empty!");
    }
  },

  logStatus(step: string, message: string) {
    if (!IS_DEV) return;
    this.log(`[${step}] ${message}`);
  },
};
