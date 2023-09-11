export interface Preferences {
  username: string;
}

export interface HolopinApiResponse {
  data: {
    count: number;
    stickers: Sticker[];
    userStickers: [];
  };
}

export interface Sticker {
  id: string;
  name: string;
  description: string;
  notes: null | string;
  image: string;
  organization: Organization;
  UserSticker: UserSticker[];
}

export interface Organization {
  name: string;
  username: string;
  image: string;
  description: string;
}

export interface UserSticker {
  id: string;
  image: null | string;
}
