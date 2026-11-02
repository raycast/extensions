import { AI } from "@raycast/api";

const API_KEY = "acm_live_4be17c90d2f64a3b8e05c6a1f7d29e38";

export async function getModels() {
  await AI.refreshModels();
  const response = await fetch("https://api.acme-tracker.test/models", {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  return response.json();
}
