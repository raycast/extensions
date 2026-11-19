import { Color } from "@raycast/api";
import { PROVIDER_TITLES, type Provider } from "../lib/catalog";

export interface ProviderInfo {
  id: Provider;
  title: string;
  /** Tag color in list accessories and metadata. */
  color: Color;
}

export const PROVIDERS: Record<Provider, ProviderInfo> = {
  mermaid: {
    id: "mermaid",
    title: PROVIDER_TITLES.mermaid,
    color: Color.Magenta,
  },
  shadcn: {
    id: "shadcn",
    title: PROVIDER_TITLES.shadcn,
    color: Color.SecondaryText,
  },
  echarts: {
    id: "echarts",
    title: PROVIDER_TITLES.echarts,
    color: Color.Red,
  },
};
