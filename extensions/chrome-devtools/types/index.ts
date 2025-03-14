export type DebugTarget = {
  id: string;
  title: string;
  url: string;
  webSocketDebuggerUrl: string;
  devtoolsFrontendUrl: string;
  type: 'page' | 'background_page' | 'service_worker' | 'node' | 'browser';
};

export type LogEntry =
  | { type: "console"; message: string; level: "log" | "warning" | "error" }
  | { type: "network"; url: string; method: string; status?: number };
