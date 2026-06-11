const PREFIX = "[Frame.io]";

function timestamp(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

export const debug = {
  info(message: string, data?: unknown): void {
    if (data !== undefined) {
      console.log(`${PREFIX} ${timestamp()} ${message}`, data);
    } else {
      console.log(`${PREFIX} ${timestamp()} ${message}`);
    }
  },

  api(method: string, path: string, status?: number, durationMs?: number): void {
    const statusPart = status !== undefined ? ` → ${status}` : "";
    const durationPart = durationMs !== undefined ? ` (${durationMs}ms)` : "";
    console.log(`${PREFIX} ${timestamp()} API ${method} ${path}${statusPart}${durationPart}`);
  },

  apiError(method: string, path: string, status: number, body: string): void {
    console.error(`${PREFIX} ${timestamp()} API ${method} ${path} → ${status}`);
    try {
      const parsed = JSON.parse(body);
      console.error(`${PREFIX}   Error detail:`, JSON.stringify(parsed, null, 2));
    } catch {
      console.error(`${PREFIX}   Raw response:`, body);
    }
  },

  error(message: string, error?: unknown): void {
    console.error(`${PREFIX} ${timestamp()} ERROR: ${message}`);
    if (error !== undefined) {
      console.error(`${PREFIX}   Detail:`, error);
    }
  },
};
