import { Color, Icon, type Image } from "@raycast/api";
import type { CatalogKind } from "./catalog";

export const INTEGRATION_KIND_ICON: Record<CatalogKind, Image.ImageLike> = {
  mcp: { source: "mcp.svg", tintColor: Color.PrimaryText },
  openapi: Icon.Code,
  graphql: { source: { light: "graphql-light.svg", dark: "graphql-dark.svg" } },
};
