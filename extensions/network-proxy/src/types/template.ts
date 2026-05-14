import { ProxySettings } from "./proxy";

export interface ProxyTemplate {
  id: string;
  name: string;
  description?: string;
  settings: ProxySettings;
  createdAt: Date;
  isLastUsed?: boolean;
}

export interface TemplateStorageData {
  templates: ProxyTemplate[];
  lastUsedSettings?: ProxySettings;
}
