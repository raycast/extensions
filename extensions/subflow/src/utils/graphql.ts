import { getPreferenceValues } from "@raycast/api";

const API_URL = "https://api.subflow.ing";

export interface StartDate {
  year: number;
  month: number;
  date: number;
}

export interface CoSubscriber {
  email: string;
  confirm: boolean;
  amount: number | null;
  currency: string | null;
}

export interface Subscription {
  id: string;
  name: string;
  price: number;
  currency: string;
  startDate: StartDate;
  paymentCycle: "monthly" | "quarterly" | "yearly";
  serviceId: string | null;
  coSubscribers: CoSubscriber[];
}

const QUERY = `
  query {
    subscriptions {
      id name price currency paymentCycle serviceId
      startDate { year month date }
      coSubscribers { email confirm amount currency }
    }
    coSubscriptions {
      id name price currency paymentCycle serviceId
      startDate { year month date }
      coSubscribers { email confirm amount currency }
    }
  }
`;

export async function fetchSubscriptions(): Promise<Subscription[]> {
  const { apiKey } = getPreferenceValues<Preferences>();

  const res = await fetch(`${API_URL}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query: QUERY }),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("Invalid API key. Please check your Subflow API key in preferences.");
    }
    throw new Error(`API error: ${res.status}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(json.errors[0]?.message ?? "GraphQL error");
  }

  if (!json.data) {
    throw new Error("Invalid API key. Please check your Subflow API key in preferences.");
  }

  const own: Subscription[] = json.data.subscriptions ?? [];
  const co: Subscription[] = json.data.coSubscriptions ?? [];

  const seen = new Set<string>();
  return [...own, ...co].filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}
