import { getPreferenceValues } from "@raycast/api";

export interface SupervocPreferences {
  prefill: boolean;
  supervocServerURL: string;
  supervocAccessToken: string;
}

export function supervocPreferences(): SupervocPreferences {
  const raw = getPreferenceValues<Partial<SupervocPreferences>>();
  return {
    prefill: raw.prefill !== false,
    supervocServerURL: (raw.supervocServerURL?.trim() ?? "").replace(/\/$/, ""),
    supervocAccessToken: raw.supervocAccessToken?.trim() ?? "",
  };
}
