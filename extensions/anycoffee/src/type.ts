export interface Preferences {
  coffeeRoasterSort: string;
}

export type APIResponse = {
  items: Array<Roaster>;
};

export type Roaster = {
  id: string;
  name: string;
  contact?: RoasterContact;
  location?: RoasterLocation;
  image?: RoasterImage;
};

export type RoasterLocation = {
  city?: string;
  state?: string;
  country?: string;
};

export type RoasterContact = {
  instagram?: string;
  website?: string;
};

export type RoasterImage = {
  url?: string;
};
