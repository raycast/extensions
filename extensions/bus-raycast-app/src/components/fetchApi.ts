import { getPreferenceValues } from "@raycast/api";

export default async function fetchAPI(path: string) {
  const { API_URL, API_KEY } = getPreferenceValues();

  const req = await fetch(`${API_URL}/${path}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });
  const res = await req.json();
  return res;
}
