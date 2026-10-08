export interface MedalResult {
  country: Country;
  medals: Medals;
  rank: number;
}

export interface Medal {
  RankGold: string;
  RankMedal: string;
  OrganisationCode: string;
  OrganisationLogo: string;
  OrganisationName: string;
  Gold: string;
  Silver: string;
  Bronze: string;
  Medal: string;
}

export interface Country {
  code: string;
  iso_alpha_2?: string;
  iso_alpha_3?: string;
  name: string;
}

export interface Medals {
  bronze: number;
  gold: number;
  silver: number;
  total: number;
}
