type Env = {
  [key: string]: {
    ALGOLIA_APP_ID: string;
    ALGOLIA_API_KEY: string;
    ALGOLIA_INDEX: string;
  };
};

export const ENV: Env = {
  "v3.8.0": {
    ALGOLIA_APP_ID: "BH4D9OD16A",
    ALGOLIA_API_KEY: "8bca76b0664b04581dc9f9854e844a90",
    ALGOLIA_INDEX: "helm",
  },
  "v2.16.7": {
    ALGOLIA_APP_ID: "BH4D9OD16A",
    ALGOLIA_API_KEY: "e53da48b1097ca611dcbe7b0ac0611c9",
    ALGOLIA_INDEX: "helm_v2",
  },
  "v2.14.0": {
    ALGOLIA_APP_ID: "BH4D9OD16A",
    ALGOLIA_API_KEY: "e53da48b1097ca611dcbe7b0ac0611c9",
    ALGOLIA_INDEX: "helm_v2",
  },
};
