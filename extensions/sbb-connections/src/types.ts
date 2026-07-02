export type Station = {
  id: string;
  name: string;
};

export type FavoriteRoute = {
  id: string;
  label: string;
  from: Station;
  to: Station;
};

export type SearchParams = {
  from: Station;
  to: Station;
  date: string;
  time: string;
  page?: number;
};

export type ConnectionStop = {
  station: Station;
  departure: string | null;
  arrival: string | null;
  platform?: string;
  prognosis?: {
    platform?: string | null;
    departure?: string | null;
    arrival?: string | null;
  };
};

export type ConnectionSection = {
  journey?: {
    category?: string;
    number?: string;
    to?: string;
  };
  walk?: unknown;
  departure: ConnectionStop;
  arrival: ConnectionStop;
};

export type Connection = {
  from: ConnectionStop;
  to: ConnectionStop;
  duration: string;
  transfers: number | string;
  products: string[];
  sections: ConnectionSection[];
};
