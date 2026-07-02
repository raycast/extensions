export type DiagnosticMeta = Record<string, string | number | boolean | undefined>;

export interface DiagnosticLogger {
  checkpoint: (event: string, meta?: DiagnosticMeta) => void;
  finish: (event: string, meta?: DiagnosticMeta) => void;
}

function cleanMeta(meta: DiagnosticMeta | undefined) {
  return Object.fromEntries(Object.entries(meta ?? {}).filter(([, value]) => value !== undefined));
}

export function createDiagnosticLogger(enabled: boolean, scope: string, meta: DiagnosticMeta = {}): DiagnosticLogger {
  const startedAt = Date.now();
  let lastAt = startedAt;
  const baseMeta = cleanMeta(meta);

  function log(event: string, eventMeta?: DiagnosticMeta) {
    if (!enabled) {
      return;
    }
    const now = Date.now();
    const payload = {
      scope,
      event,
      elapsedMs: now - startedAt,
      deltaMs: now - lastAt,
      ...baseMeta,
      ...cleanMeta(eventMeta),
    };
    lastAt = now;
    console.log(`[kraft:diagnostics] ${JSON.stringify(payload)}`);
  }

  return {
    checkpoint: log,
    finish: log,
  };
}

export const noopDiagnosticLogger: DiagnosticLogger = {
  checkpoint() {
    // noop
  },
  finish() {
    // noop
  },
};
