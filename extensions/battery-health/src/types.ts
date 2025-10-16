interface StatsItem {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  section: number;
}

interface SectionItem {
  id: number;
  title: string;
  items?: StatsItem[];
}

export type { StatsItem, SectionItem };
