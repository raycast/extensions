import { SocksProxyAgent } from "socks-proxy-agent";

export type TranslateMode = "translate" | "polishing" | "summarize" | "what";

export interface TranslateQuery {
  text: string;
  detectFrom: string;
  detectTo: string;
  mode: TranslateMode;
  onMessage: (message: { content: string; role: string; isWordMode: boolean; isFullText?: boolean }) => void;
  onError: (error: string) => void;
  onFinish: (reason: string) => void;
  signal: AbortSignal;
  agent?: SocksProxyAgent;
}

export interface TranslateResult {
  original: string;
  text: string;
  from: string;
  to: string;
  error?: string;
}
