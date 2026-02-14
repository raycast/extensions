export type QuickQueryPreset = {
  id: string;
  title: string;
  subtitle: string;
  query: string;
};

export const QUICK_QUERY_PRESETS: QuickQueryPreset[] = [
  {
    id: "tonight",
    title: "Tonight Nearby",
    subtitle: "Immediate plans in your town",
    query: "what's on tonight",
  },
  {
    id: "weekend",
    title: "This Weekend",
    subtitle: "Best options for Saturday and Sunday",
    query: "what's on this weekend",
  },
  {
    id: "kids",
    title: "Kids and Family",
    subtitle: "Family-friendly ideas",
    query: "kids and family events this weekend",
  },
  {
    id: "free",
    title: "Free Events",
    subtitle: "No-cost options",
    query: "free events this week",
  },
  {
    id: "music",
    title: "Live Music",
    subtitle: "Gigs and live sets",
    query: "live music this week",
  },
];

