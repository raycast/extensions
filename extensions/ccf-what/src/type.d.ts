interface CCFRanking {
  year: number;
  name: string;
  organization: string;
  category: Category[];
  list: Publication[];
}

interface Category {
  id: number;
  abbr: string;
  chinese: string;
  english: string;
}

interface Publication {
  id: string;
  abbr: string;
  name: string;
  publisher: string;
  type: "Journal" | "Conference";
  rank: "A" | "B" | "C";
  category_id: number;
}
