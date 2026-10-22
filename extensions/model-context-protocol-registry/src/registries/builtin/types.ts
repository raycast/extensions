import { Image } from "@raycast/api";
import { MCPServerConfig } from "../../shared/mcp";

export type RegistryEntry = {
  name: string;
  title: string;
  description?: string;
  icon?: Image.ImageLike;
  homepage?: string;
  configuration: MCPServerConfig;
  /** Direct HTTP endpoint for Raycast; configuration remains the fallback for other clients. */
  remoteUrl?: string;
};
