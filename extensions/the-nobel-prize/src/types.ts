type TranslationStrings = {
  en: string;
  se?: string;
  no?: string;
};

type Location = {
  city: TranslationStrings;
  country: TranslationStrings;
  cityNow: TranslationStrings & {
    sameAs: string[];
    latitude?: string;
    longitude?: string;
  };
  countryNow: TranslationStrings & {
    sameAs: string[];
    latitude?: string;
    longitude?: string;
  };
  continent: TranslationStrings;
  locationString: TranslationStrings;
};
type Entity = Location & {
  name: TranslationStrings;
  nameNow: TranslationStrings;
  nativeName: string;
  locationString: TranslationStrings;
};
type Residence = Location & {
  locationString: TranslationStrings;
};
export type NobelPrizePerLaureate = {
  awardYear: string;
  category: TranslationStrings;
  categoryFullName: TranslationStrings;
  sortOrder: "1" | "2" | "3";
  portion: "1" | "1/2" | "1/3" | "1/4";
  dateAwarded: string;
  prizeStatus: "received" | "declined" | "restricted";
  motivation: TranslationStrings;
  prizeAmount: number;
  prizeAmountAdjusted: number;
  affiliations?: Entity[];
  residences?: Residence[];
  links: ItemLink[];
};

type Event = {
  date: string;
  place?: Location;
};

type LaureatePerson = {
  knownName: TranslationStrings;
  givenName: TranslationStrings;
  familyName?: TranslationStrings;
  fullName: TranslationStrings;
  fileName: string;
  penname?: string;
  gender: "female" | "male";
  birth: Event;
  death?: Event;
};
type LaureateOrganization = {
  orgName: TranslationStrings;
  nativeName: string;
  fileName?: string;
  acronym?: string;
  founded: Event;
  dissolution?: string;
  headquarters?: Location;
};
type ItemLink = {
  rel: string;
  href: string;
  title?: string;
  action: string;
  types: string;
  class?: string[];
};
type Laureate = {
  id: number;
  wikipedia: {
    slug: string;
    english: string;
  };
  wikidata: {
    id: string;
    url: string;
  };
  sameAs: string[];
  links: ItemLink[];
  nobelPrizes: NobelPrizePerLaureate[];
  meta?: {
    terms: string;
    license: string;
    disclaimer: string;
  };
} & (LaureatePerson | LaureateOrganization);

export type LaureatesResult = {
  laureates: Laureate[];
} & CommonResult;

type LaureateBasic = {
  id: number;
  portion: "1" | "1/2" | "1/3" | "1/4";
  sortOrder: "1" | "2" | "3";
  motivation: TranslationStrings;
  links: {
    rel: string;
    href: string;
    action: string;
    types: string;
  }[];
} & ({ knownName: TranslationStrings; fullName: TranslationStrings } | { orgName: TranslationStrings });
export type NobelPrize = {
  awardYear: number;
  category: TranslationStrings;
  categoryFullName: TranslationStrings;
  dateAwarded?: string;
  topMotivation?: TranslationStrings;
  prizeAmount: number;
  prizeAmountAdjusted: number;
  links: ItemLink[];
  laureates?: LaureateBasic[];
};
export type NobelPrizesResult = {
  nobelPrizes: NobelPrize[];
} & CommonResult;

type CommonResult = {
  meta: {
    offset: number;
    limit: number;
    count: number;
    terms: string;
    license: string;
    disclaimer: string;
  };
  links?: {
    first: string;
    prev?: string;
    self: string;
    next?: string;
    last: string;
  };
};
