type Common = {
  id: string;
  links: {
    self: string;
  };
};

export type Book = Common & {
  type: "book";
  attributes: {
    slug: string;
    author: string;
    cover: string;
    dedication: string;
    pages: number;
    release_date: string;
    summary: string;
    title: string;
    wiki: string;
  };
  relationships: {
    chapters: {
      data: { id: string; type: string }[];
    };
  };
};

export type Chapter = Common & {
  type: "chapter";
  attributes: {
    slug: string;
    order: number;
    summary: string;
    title: string;
  };
  relationships: {
    book: {
      data: {
        id: string;
        type: "book";
      };
    };
  };
};

export type Character = Common & {
  type: "character";
  attributes: {
    slug: string;
    alias_names: string[];
    animagus: string | null;
    blood_status: string;
    boggart: string;
    born: string;
    died: string;
    eye_color: string;
    family_members: string[];
    gender: string;
    hair_color: string;
    height: string | null;
    house: string;
    image: string;
    jobs: [];
    marital_status: string;
    name: string;
    nationality: string;
    patronus: string;
    romances: [];
    skin_color: string;
    species: string;
    titles: string[];
    wands: string[];
    weight: string | null;
    wiki: string;
  };
};

export type Movie = Common & {
  type: "movies";
  attributes: {
    slug: string;
    box_office: string;
    budget: string;
    cinematographers: string[];
    directors: string[];
    distributors: string[];
    editors: string[];
    music_composers: string[];
    poster: string;
    producers: string[];
    rating: string;
    release_date: string;
    running_time: string;
    screenwriters: string[];
    summary: string;
    title: string;
    trailer: string;
    wiki: string;
  };
  links: {
    self: string;
  };
};

export type Potion = {
  id: string;
  type: "potion";
  attributes: {
    slug: string;
    characteristics: string | null;
    difficulty: string | null;
    effect: string | null;
    image: string | null;
    inventors: string | null;
    ingredients: string | null;
    manufacturers: string | null;
    name: string;
    side_effects: string | null;
    time: string | null;
    wiki: string;
  };
  links: {
    self: string;
  };
};

export type Spell = Common & {
  type: "spell";
  attributes: {
    slug: string;
    category: string;
    creator: string | null;
    effect: string;
    hand: string | null;
    image: string | null;
    incantation: string | null;
    light: string;
    name: string;
    wiki: string;
  };
};

export type SuccessResponse<T> = {
  data: T[];
  meta: {
    pagination: {
      current: number;
      next?: number;
      last?: number;
      records: number;
    };
    copyright: string;
    generated_at: string;
  };
  links: {
    self: string;
    current: string;
    next?: string;
    last?: string;
  };
};
