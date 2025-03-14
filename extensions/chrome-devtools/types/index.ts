export type DebugTarget = {
  id: string;
  title: string;
  url: string;
  webSocketDebuggerUrl: string;
  devtoolsFrontendUrl: string;
  type: string;
};

export type LogEntry =
  | { type: "console"; message: string; level: "log" | "warning" | "error" }
  | { type: "network"; url: string; method: string; status?: number };
