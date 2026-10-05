export interface ComponentInfo {
  exists: boolean;
  isBase: boolean;
  isProse: boolean;
}

export interface ComponentContext {
  name: string;
  sanitizedName: string;
  hasProsePrefix: boolean;
  componentInfo: ComponentInfo;
}
