export type RaycastTown = {
  name: string;
  slug: string;
  timezone: string;
  countryCode?: string;
};

export type RaycastEvent = {
  id: string;
  title: string;
  startTime: string;
  endTime: string | null;
  venueName: string;
  startLabel: string;
  tags: string[];
  url: string;
};

export type RaycastResponse = {
  answer: string;
  events: RaycastEvent[];
  town: RaycastTown;
  suggestions: string[];
};

export type AskPayload = {
  query: string;
  townSlug: string;
  locale: string;
  limit?: number;
  conversation?: string[];
  apiBaseUrl: string;
};
