// GitHub Release API response
export type GitHubRelease = {
  id: string | number;
  tag_name: string;
  name?: string;
  body?: string;
  published_at?: string;
  created_at?: string;
  prerelease: boolean;
  html_url?: string;
};

// Biome Schema structure
export type BiomeSchema = {
  $schema?: string;
  properties?: {
    linter?: {
      properties?: {
        rules?: {
          properties?: Record<string, BiomeCategorySchema>;
        };
      };
    };
  };
  $defs?: Record<string, BiomeCategorySchema>;
};

export type BiomeCategorySchema = {
  properties?: Record<string, BiomeRuleSchema>;
};

export type BiomeRuleSchema = {
  description?: string;
  type?: string;
  anyOf?: Array<{ type: string; description?: string }>;
  oneOf?: Array<{ type: string; description?: string }>;
};

// Cache structure
export type BiomeRulesCache = {
  version: string;
  rules: BiomeRule[];
  fetchedAt: number;
  changelog?: string;
};

// BiomeRule type
export type BiomeRule = {
  id: string;
  name: string;
  category:
    | "A11y"
    | "Complexity"
    | "Correctness"
    | "Performance"
    | "Security"
    | "Style"
    | "Suspicious"
    | "Nursery";
  description: string;
  recommended: boolean;
  fixable: boolean;
  docUrl?: string;
  version?: string;
};
