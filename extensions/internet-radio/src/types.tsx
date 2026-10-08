export interface WebsiteData {
  title: string;
  url: string;
}

export interface ContactData {
  type: string;
  title: string;
  value: string;
}

export interface CallsignData {
  fm: string;
  am: string;
  sign: string;
  inspectionFile: string;
}

export interface SocialProfileData {
  type: string;
  handle: string;
  url: string;
}

export interface PolicyData {
  title: string;
  url: string;
}

export interface StationData {
  [key: string]:
    | string
    | string[]
    | boolean
    | WebsiteData[]
    | ContactData[]
    | CallsignData[]
    | SocialProfileData[]
    | PolicyData[]
    | undefined;
  name: string;
  shortname: string;
  website: string;
  alternateSites: WebsiteData[];
  outdatedSites: WebsiteData[];
  stream: string;
  alternateStreams: string[];
  outdatedStreams: string[];
  genres: string[];
  slogan: string;
  description: string;
  discontinued: boolean;
  location: string;
  contacts: ContactData[];
  callsigns: CallsignData[];
  socialProfiles: SocialProfileData[];
  logo: string;
  otherImages: string[];
  policies: PolicyData[];
}

export interface StationListObject {
  [key: string]: StationData;
}
