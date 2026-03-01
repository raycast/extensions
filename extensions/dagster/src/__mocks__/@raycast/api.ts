export function getPreferenceValues() {
  return {
    dagsterUrl: process.env.SB_DAGSTER_URL!,
    extraHeaders: process.env.SB_DAGSTER_EXTRA_HEADERS,
  };
}
