import { open as _open, getPreferenceValues } from "@raycast/api";

export async function open(target: Parameters<typeof _open>[0]) {
  return await _open(target, getPreferenceValues<Preferences>().openWith);
}

export function formatLoadingValue<T extends ({ isLoading: boolean } | { loading: boolean }) & { data: unknown }>(
  value: T,
  dataProp: keyof NonNullable<T["data"]> | keyof NonNullable<T> | null = null,
  loadingText = "loading",
  nullishText = "unknown",
) {
  const loading = "isLoading" in value ? value.isLoading : value.loading;

  if (loading) {
    return loadingText;
  }

  if (dataProp) {
    // @ts-expect-error
    return value.data?.[dataProp] || value[dataProp] || nullishText;
  }
  return value.data || nullishText;
}
