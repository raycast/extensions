export interface Module {
  name: string;
  npm: string;
  description: string;
  icon: string;
  github: string;
  website: string;
  category: string;
  readme: string;
  type: "official" | "3rd-party" | "community";
  maintainers?: {
    name: string;
    github: string;
  }[];
  stats: {
    version: string;
    downloads: number;
    stars: number;
    watchers: number;
    forks: number;
    issues: number;
    defaultBranch: string;
  };
  compatibility?: {
    nuxt: string;
  };
}

export interface ApiResponse {
  modules: Module[];
}
