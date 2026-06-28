import { SocksProxyAgent } from "socks-proxy-agent";

export type TranslateMode = "translate" | "polishing" | "summarize" | "what";

export interface TranslateQuery {
  text: string;
  detectFrom: string;
  detectTo: string;
  mode: TranslateMode;
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

export interface IModel {
  id: string;
  name: string;
  description?: string;
}

export interface IConfig {
  requireModel: boolean;
  defaultModel: IModel | undefined;
  supportCustomModel: boolean;
  listModels(apikey: string | undefined, entrypoint: string | undefined): Promise<IModel[]>;

  defaultEntrypoint: string;
  supportCustomEntrypoint: boolean;

  requireApiKey: boolean;
  hasApiKey: boolean;
}

export interface ProviderProps {
  name: string;
  apikey: string | undefined;
  apiModel: string | undefined;
  entrypoint: string;
}
