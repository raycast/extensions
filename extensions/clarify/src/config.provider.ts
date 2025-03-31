export type Endpoints = {
  web: string;
  api: string;
};

export const environments: {
  prod: Endpoints;
  dev: Endpoints;
  local: Endpoints;
} = {
  local: {
    api: "http://localhost:3001/v1",
    web: "http://localhost:3000",
  },
  dev: {
    api: "https://api.dev.getclarify.ai/v1",
    web: "https://app.dev.getclarify.ai",
  },
  prod: {
    api: "https://api.getclarify.ai/v1",
    web: "https://app.getclarify.ai",
  },
};
