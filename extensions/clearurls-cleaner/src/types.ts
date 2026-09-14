export interface Provider {
  urlPattern: string;
  completeProvider: boolean;
  rules: string[];
  referralMarketing: string[];
  rawRules: string[];
  exceptions: string[];
  redirections: string[];
  forceRedirection: boolean;
}

export interface ClearUrlsData {
  providers: Record<string, Provider>;
}
