declare module 'lighthouse' {
  interface LighthouseOptions {
    logLevel?: 'silent' | 'error' | 'info' | 'verbose';
    output?: 'json' | 'html' | 'csv';
    onlyCategories?: string[];
    port?: number;
    formFactor?: 'mobile' | 'desktop';
    throttling?: {
      cpuSlowdownMultiplier?: number;
    };
    throttlingMethod?: 'simulate' | 'devtools' | 'provided';
    screenEmulation?: {
      mobile: boolean;
      width: number;
      height: number;
      deviceScaleFactor: number;
      disabled?: boolean;
    };
    emulatedUserAgent?: string;
    preset?: 'perf' | 'desktop' | 'experimental';
    config?: Record<string, unknown>;
  }

  interface LighthouseResult {
    lhr: {
      finalDisplayedUrl: string;
      fetchTime: string;
      categories: {
        [key: string]: {
          title: string;
          score: number;
          description: string;
        };
      };
      audits: {
        [key: string]: {
          title: string;
          description: string;
          score: number | null;
          displayValue?: string;
          numericValue?: number;
          details?: {
            type: string;
            items?: Array<Record<string, unknown>>;
          };
        };
      };
    };
    report: string;
    artifacts?: Record<string, unknown>;
  }

  function lighthouse(
    url: string,
    options?: LighthouseOptions,
    config?: any
  ): Promise<LighthouseResult>;

  export = lighthouse;
}
