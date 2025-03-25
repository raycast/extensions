import crypto from "crypto";

export type Model = {
  id: string;
  version: string;
  url: string;
  name: string;
  latest_version?: ModelVersion;
  owner: string;
  github_user?: string;
  description?: string;
  visibility?: string;
  github_url?: string;
};

export type ModelVersion = {
  id: string;
  openapi_schema: OpenApiSchema;
};

export type OpenApiSchema = {
  [key: string]: any;
};

export const models: Model[] = [
  {
    id: crypto.randomUUID(),
    version: "db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
    url: "https://replicate.com/stability-ai/stable-diffusion",
    name: "stable-diffusion",
    owner: "stability-ai",
  },
  {
    id: crypto.randomUUID(),
    version: "a42692c54c0f407f803a0a8a9066160976baedb77c91171a01730f9b0d7beeff",
    url: "https://replicate.com/tstramer/material-diffusion",
    name: "material-diffusion",
    owner: "tstramer",
  },
  {
    id: crypto.randomUUID(),
    version: "9936c2001faa2194a261c01381f90e65261879985476014a0a37a334593a05eb",
    url: "https://replicate.com/prompthero/openjourney",
    name: "openjourney",
    owner: "prompthero",
  },
  {
    id: crypto.randomUUID(),
    version: "28cea91bdfced0e2dc7fda466cc0a46501c0edc84905b2120ea02e0707b967fd",
    url: "https://replicate.com/22-hours/vintedois-diffusion/versions/28cea91bdfced0e2dc7fda466cc0a46501c0edc84905b2120ea02e0707b967fd",
    name: "vintedois-diffusion",
    owner: "22-hours",
  },
];
