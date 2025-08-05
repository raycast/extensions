export interface TvModelFlag {
  tvModel: TvModel;
  title: string;
  flag: string;
  resolution: string;
}

export interface TvModel {
  name: string;
  tvg: Tvg;
  group: Group;
  http: HTTP;
  url: string;
  raw: string;
  line: number;
  catchup: Catchup;
  timeshift: string;
  flag: string;
}

interface Catchup {
  type: string;
  days: string;
  source: string;
}

interface Group {
  title: string;
}

interface HTTP {
  referrer: string;
  "user-agent": string;
}

interface Tvg {
  id: string;
  name: string;
  language: string;
  country: string;
  logo: string;
  url: string;
  rec: string;
}

export interface ChannelCategory {
  name: string;
  value: string;
  count: number;
}

export interface Dictionary<T> {
  [Key: string]: T;
}

export const categoriesURLS: ChannelCategory[] = [
  {
    name: "Auto",
    value: "auto",
    count: 12,
  },
  {
    name: "Animation",
    value: "animation",
    count: 20,
  },
  {
    name: "Business",
    value: "business",
    count: 31,
  },
  {
    name: "Classic",
    value: "classic",
    count: 46,
  },
  {
    name: "Comedy",
    value: "comedy",
    count: 43,
  },
  {
    name: "Cooking",
    value: "cooking",
    count: 24,
  },
  {
    name: "Culture",
    value: "culture",
    count: 10,
  },
  {
    name: "Documentary",
    value: "documentary",
    count: 38,
  },
  {
    name: "Education",
    value: "education",
    count: 29,
  },
  {
    name: "Entertainment",
    value: "entertainment",
    count: 165,
  },
  {
    name: "Family",
    value: "family",
    count: 17,
  },
  {
    name: "General",
    value: "general",
    count: 298,
  },
  {
    name: "Kids",
    value: "kids",
    count: 125,
  },
  {
    name: "Legislative",
    value: "legislative",
    count: 32,
  },
  {
    name: "Lifestyle",
    value: "lifestyle",
    count: 63,
  },
  {
    name: "Movies",
    value: "movies",
    count: 177,
  },
  {
    name: "Music",
    value: "music",
    count: 299,
  },
  {
    name: "News",
    value: "news",
    count: 328,
  },
  {
    name: "Outdoor",
    value: "outdoor",
    count: 32,
  },
  {
    name: "Relax",
    value: "relax",
    count: 17,
  },
  {
    name: "Religious",
    value: "religious",
    count: 200,
  },
  {
    name: "Series",
    value: "series",
    count: 147,
  },
  {
    name: "Science",
    value: "science",
    count: 12,
  },
  {
    name: "Shop",
    value: "shop",
    count: 44,
  },
  {
    name: "Sports",
    value: "sports",
    count: 155,
  },
  {
    name: "Travel",
    value: "travel",
    count: 14,
  },
  {
    name: "Weather",
    value: "weather",
    count: 7,
  },
  {
    name: "XXX",
    value: "xxx",
    count: 38,
  },
  {
    name: "Undefined",
    value: "undefined",
    count: 4871,
  },
];
