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
  abbr: string;
  name: string;
  publisher: string;
  type: string;
  rank: string;
  category_id: number;
}
