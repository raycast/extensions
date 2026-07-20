export type Gifts = {
  name: string;
  image: string;
};

export type Character = {
  name: string;
  birthday: string;
  loves: Gifts[];
  likes: Gifts[];
  hates: Gifts[];
  dislikes: Gifts[];
};

export interface GiftData {
  characters: Character[];
}
