type Group = "Popularity" | "Location" | "Type";

export interface Category {
  label: string;
  value: string;
  group: Group;
}

export const categories: Category[] = [
  {
    label: "Top news",
    value: "ap-top-news",
    group: "Popularity",
  },
  {
    label: "Trending News",
    value: "trending-news",
    group: "Popularity",
  },
  {
    label: "World",
    value: "world-news",
    group: "Location",
  },
  {
    label: "North America",
    value: "us-news",
    group: "Location",
  },
  {
    label: "Europe",
    value: "europe",
    group: "Location",
  },
  {
    label: "Latin America",
    value: "latin-america",
    group: "Location",
  },
  {
    label: "Middle East",
    value: "middle-east",
    group: "Location",
  },
  {
    label: "Africa",
    value: "africa",
    group: "Location",
  },
  {
    label: "Asia Pacific",
    value: "asia-pacific",
    group: "Location",
  },
  {
    label: "Australia",
    value: "australia",
    group: "Location",
  },
  {
    label: "Business",
    value: "business",
    group: "Type",
  },
  {
    label: "Technology",
    value: "technology",
    group: "Type",
  },
  {
    label: "Sports",
    value: "sports",
    group: "Type",
  },
  {
    label: "Entertainment",
    value: "entertainment",
    group: "Type",
  },
  {
    label: "Science",
    value: "science",
    group: "Type",
  },
  {
    label: "Movies",
    value: "movies",
    group: "Type",
  },
  {
    label: "Music",
    value: "music",
    group: "Type",
  },
  {
    label: "Politics",
    value: "politics",
    group: "Type",
  },
  {
    label: "Health",
    value: "health",
    group: "Type",
  },
];

export const defaultCategory = categories[0];
