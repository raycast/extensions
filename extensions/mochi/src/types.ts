export type DeckResponse = {
  "updated-at": {
    date: string;
  };
  tags: string[];
  content: string;
  name: null | string;
  "deck-id": string;
  pos: string;
  references: string[];
  id: string;
  reviews: string[];
  "created-at": {
    date: string;
  };
  "new?": boolean;
  "archived?": boolean;
  "template-id": null | string;
};

export type TemplateResponse = {
  id: string;
  name: string;
  content: string;
  pos: string;
  fields: {
    [key: string]: {
      id: string;
      name: string;
      pos: string;
      type: string;
      options?: {
        "multi-line?"?: boolean;
        "boolean-default"?: boolean;
      };
    };
  };
};

export type CardResponse = {
  "updated-at": {
    date: string;
  };
  tags: string[];
  content: string;
  name: null | string;
  "deck-id": string;
  pos: string;
  references: string[];
  id: string;
  reviews: string[];
  "created-at": {
    date: string;
  };
  "new?": false;
  "archived?": boolean;
  "template-id": null | string;
};

export type Deck = {
  "sort-by-direction": boolean;
  name: string;
  "cards-view": string;
  id: string;
  "sort-by": string;
  "archived?": boolean;
  sort: 0;
  "trashed?"?: {
    date: string;
  };
};

export type DecksResponse = {
  bookmark: string;
  docs: Deck[];
};

export type FormFieldsData = {
  deckId: string;
  deckName: string;
  templateId: string;
  content: string;
  fields: {
    id: string;
    name: string;
    type: string;
    multiline: boolean;
    defaultCheck: boolean;
  }[];
};

export type Field = {
  id: string;
  name: string;
  type: string;
  multiline?: boolean;
  defaultCheck?: boolean;
};
