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
    api: "https://api.dev.clarify.ai/v1",
    web: "https://app.dev.clarify.ai",
  },
  prod: {
    api: "https://api.clarify.ai/v1",
    web: "https://app.clarify.ai",
  },
};
