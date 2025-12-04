export interface CompetitionClub {
  [competition: string]: Club[];
}

export interface Club {
  id: string;
  name: Name;
  threeLetterCode: string;
  colors: Colors;
  stadium: Stadium;
  founded: string;
  contact: Contact;
  logos: Logo[];
  externalClubIds: ExternalClubIDS;
  playedMatches: PlayedMatch[];
}

export interface Colors {
  club: ClubColor;
  jersey: Jersey;
}

export interface Jersey {
  home: ClubColor;
  away: ClubColor;
  alternative: ClubColor;
}

export interface ClubColor {
  primary: Color;
  primaryText: Color;
  secondary: Color;
  secondaryText: Color;
  number: Color;
}

export interface Color {
  hex: string;
}

export interface Contact {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  email: string;
  phone: string;
  fax: string;
  homepage: string;
  tickets: string;
  twitter: string;
  facebook: string;
  instagram?: string;
}

export interface ExternalClubIDS {
  dflDatalibraryClubId: string;
  deltatreId: string;
}

export interface Logo {
  id: ID;
  uri: string;
}

export enum ID {
  Standard = "standard",
}

export interface Name {
  alias: null | string;
  shortName: null;
  full: string;
  small: string;
  slugifiedFull: string;
  slugifiedShort: string;
  first: string;
  last: string;
  withFormOfCompany: string;
}

export interface PlayedMatch {
  matchId: string;
}

export interface Stadium {
  name: string;
  capacity: string;
  imageUrl: string;
  mapsUrl: string;
  stadiumIconUrlBlack: string;
  stadiumIconUrlWhite: string;
}

export interface ClubPerson {
  roles: Roles;
  players: Players;
}

export interface Players {
  [position: string]: Player[];
}

export interface Player {
  name: Name;
  id: string;
  singlePlayerImage: string;
  shirtNumber: string;
  playertext?: Playertext[];
  playertextGenerationDate: Date;
  names: Name;
  club: Club;
  nationality: Nationality;
  birth: Birth;
  bio: Bio;
  externalPersonIds: ExternalPersonIDS;
  canceled: boolean;
  lastUpdate: Date;
  playerImages: PlayerImages;
  apprentice: string;
  modelType: string;
  position: string;
}

export interface ExternalPersonIDS {
  dflDatalibraryPersonId: string;
}

export interface Nationality {
  firstNationality: string;
  firstNationalityCode: string;
  secondNationality: null | string;
  secondNationalityCode: null | string;
  thirdNationality: null | string;
  thirdNationalityCode: null | string;
}

export interface PlayerImages {
  PORTRAIT_XXS: string;
  PORTRAIT_XS: string;
  PORTRAIT_S: string;
  PORTRAIT_M: string;
  PORTRAIT_L: string;
  FACE_CIRCLE: string;
  HALF_BODY: string;
}

export interface Roles {
  DL_OTHER_OFFICIAL: DL[];
  DL_HEAD_COACH: DL[];
  DL_ASSISTANT_HEAD_COACH: DL[];
}

export interface DL {
  name: Name;
  externalPersonIds: ExternalPersonIDS;
  id: string;
}

export interface Bio {
  height: Height;
  weight: Weight;
  sex: string;
}

export interface Height {
  unit: string;
  height: number;
}

export interface Weight {
  unit: string;
  weight: number;
}

export interface Birth {
  country: string;
  date: Date;
  place: string;
  countryCode: string;
}

export interface Playertext {
  paragraphs: string[];
  heading?: string;
}

export interface Broadcasts {
  broadcasts: Broadcast[];
}

export interface Broadcast {
  logo: string;
  logoCategory: string;
  logoDark: string;
  logoCategoryDark: string;
  link: Link;
  broadcasterId: string;
  broadcasterName: string;
  dflDatalibraryMatchId: string;
}

export interface Link {
  rel: string;
  href: string;
}
