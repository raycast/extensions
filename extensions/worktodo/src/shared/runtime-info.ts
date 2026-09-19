import manifest from "../../package.json";

const MCP_VERSION = "0.0.0";

export type RuntimeInfo = {
  app: string;
  version: string;
  runtime: {
    node: string;
    sqlite: string | null;
  };
};

export function getRuntimeInfo(): RuntimeInfo {
  return {
    app: manifest.title,
    version: MCP_VERSION,
    runtime: {
      node: process.versions.node,
      sqlite: process.versions.sqlite ?? null,
    },
  };
}
