export interface Suggestion {
  id: string;
  w: string;
  dict: 1 | 2 | 3; // 1: bokmål, 2: nynorsk, 3: both
}

export interface ArticleLookupResponse {
  meta: {
    bm?: { total: number };
    nn?: { total: number };
  };
  articles: {
    bm?: number[];
    nn?: number[];
  };
}

export interface ArticleResponse {
  article_id: number;
  submitted: string;
  suggest: string[];
  lemmas: Array<{
    final_lexeme: string;
    hgno: number;
    id: number;
    inflection_class?: string;
    lemma: string;
    paradigm_info?: Array<{
      from: string;
      inflection: Array<{
        tags: string[];
        word_form: string | null;
      }>;
      inflection_group: string;
      paradigm_id: number;
      standardisation: string;
      tags: string[];
      to: string | null;
    }>;
    split_inf: boolean;
  }>;
  body: {
    pronunciation: Array<{
      type_: string;
      content: string;
      items: Array<{
        type_: string;
        id?: string;
        text?: string;
      }>;
    }>;
    etymology: Array<{
      type_: string;
      content: string;
      items: Array<{
        type_: string;
        id?: string;
        text?: string;
      }>;
    }>;
    definitions: Array<{
      type_: string;
      elements: Array<{
        type_: string;
        content?: string;
        items?: Array<{
          type_: string;
          id?: string;
          text?: string;
          article_id?: number;
          lemmas?: Array<{
            type_: string;
            hgno: number;
            id: number;
            lemma: string;
          }>;
          definition_id?: number | null;
        }>;
        quote?: {
          content: string;
          items: Array<{
            type_: string;
            text?: string;
          }>;
        };
        explanation?: {
          content: string;
          items: Array<{
            type_: string;
            id?: string;
            text?: string;
          }>;
        };
        id?: number;
        sub_definition?: boolean;
        elements?: Array<{
          type_: string;
          content?: string;
          items?: Array<{
            type_: string;
            id?: string;
            text?: string;
          }>;
        }>;
      }>;
      id: number;
    }>;
  };
  to_index: string[];
  author: string;
  edit_state: string;
  referers?: Array<{
    article_id: number;
    hgno: number;
    lemma: string;
  }>;
  status: number;
  updated: string | null;
}

export interface ArticleData {
  bm?: ArticleResponse[];
  nn?: ArticleResponse[];
}

export interface Preferences {
  includeBokmal: boolean;
  includeNynorsk: boolean;
}
