export interface ComponentInfo {
  exists: boolean;
  isBase: boolean;
  isPro: boolean;
  isProse: boolean;
}

export interface ComponentContext {
  name: string;
  sanitizedName: string;
  hasProsePrefix: boolean;
  componentInfo: ComponentInfo;
}
