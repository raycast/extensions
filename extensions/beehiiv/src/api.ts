import { getPreferenceValues } from "@raycast/api";
import fetch from 'node-fetch';

interface Preferences {
  apiKey: string;
  publicationId: string;
}

const preferences = getPreferenceValues<Preferences>();

const headers = {
  'Authorization': `Bearer ${preferences.apiKey}`,
  'Content-Type': 'application/json'
};

export async function fetchSubscriberCount(): Promise<number> {
  const response = await fetch(`https://api.beehiiv.com/v2/publications/${preferences.publicationId}/subscriptions?limit=1`, {
    headers: headers
  });
  // console.info(await response.text());
  const data = await response.json();
  console.info(data);
  return data.total_results || 0;
}

export async function fetchPosts() {
  const response = await fetch(`https://api.beehiiv.com/v2/publications/${preferences.publicationId}/posts`, {
    headers: headers
  });
  const data = await response.json();
  return data.data;
}

export async function searchSubscribers(query: string) {
  const response = await fetch(`https://api.beehiiv.com/v2/publications/${preferences.publicationId}/subscriptions?email=${encodeURIComponent(query)}`, {
    headers: headers
  });
  const data = await response.json();
  return data.data;
}
