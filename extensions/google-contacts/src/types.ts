// The Filter enum for contact list filtering
/* eslint-disable no-unused-vars */
export enum Filter {
  All = "all",
  Favorites = "favorites",
  Recent = "recent",
}
/* eslint-enable no-unused-vars */

// For storing local favorites
export type LocalFavorites = {
  [resourceName: string]: boolean;
};

// Base interfaces
export interface Source {
  type?: string;
  id?: string;
}

export interface FieldMetadata {
  primary?: boolean;
  verified?: boolean;
  source?: Source;
}

export interface ContactMetadata {
  sources?: Source[];
  starred?: boolean;
}

// Contact field interfaces
export interface ContactName {
  metadata?: FieldMetadata;
  displayName?: string;
  familyName?: string;
  givenName?: string;
  middleName?: string;
  honorificPrefix?: string;
  honorificSuffix?: string;
  phoneticFamilyName?: string;
  phoneticGivenName?: string;
  phoneticMiddleName?: string;
}

export interface ContactEmail {
  metadata?: FieldMetadata;
  value?: string;
  type?: string;
  formattedType?: string;
  displayName?: string;
}

export interface ContactPhone {
  metadata?: FieldMetadata;
  value?: string;
  type?: string;
  formattedType?: string;
}

export interface ContactAddress {
  metadata?: FieldMetadata;
  formattedValue?: string;
  type?: string;
  formattedType?: string;
  poBox?: string;
  streetAddress?: string;
  extendedAddress?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
}

export interface ContactOrganization {
  metadata?: FieldMetadata;
  name?: string;
  department?: string;
  title?: string;
  jobDescription?: string;
  symbol?: string;
  domain?: string;
  location?: string;
  type?: string;
  formattedType?: string;
}

export interface ContactBiography {
  metadata?: FieldMetadata;
  value?: string;
  contentType?: string;
}

export interface ContactPhoto {
  metadata?: FieldMetadata;
  url?: string;
  default?: boolean;
}

export interface ContactUrl {
  metadata?: FieldMetadata;
  value?: string;
  type?: string;
  formattedType?: string;
}

export interface ContactBirthday {
  metadata?: FieldMetadata;
  date?: {
    year?: number;
    month?: number;
    day?: number;
  };
  text?: string;
}

export interface ContactUserDefined {
  metadata?: FieldMetadata;
  key?: string;
  value?: string;
}

// Main Contact interface
export interface Contact {
  resourceName: string; // The identifier for the contact
  etag?: string;
  names?: ContactName[];
  emailAddresses?: ContactEmail[];
  phoneNumbers?: ContactPhone[];
  addresses?: ContactAddress[];
  organizations?: ContactOrganization[];
  biographies?: ContactBiography[];
  photos?: ContactPhoto[];
  urls?: ContactUrl[];
  birthdays?: ContactBirthday[];
  userDefined?: ContactUserDefined[];
  metadata?: ContactMetadata;
}

export interface ContactForm {
  names?: {
    givenName?: string;
    familyName?: string;
    middleName?: string;
    honorificPrefix?: string;
    honorificSuffix?: string;
  };
  emailAddresses?: {
    value: string;
    type?: string;
  }[];
  phoneNumbers?: {
    value: string;
    type?: string;
  }[];
  addresses?: {
    streetAddress?: string;
    extendedAddress?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    type?: string;
  }[];
  organizations?: {
    name?: string;
    title?: string;
    department?: string;
    jobDescription?: string;
    location?: string;
  }[];
  biographies?: {
    value: string;
    contentType?: string;
  }[];
  birthdays?: {
    date?: {
      year?: number;
      month?: number;
      day?: number;
    };
    text?: string;
  }[];
  urls?: {
    value: string;
    type?: string;
  }[];
  userDefined?: {
    key: string;
    value: string;
  }[];
  metadata?: {
    starred?: boolean;
  };
}

export interface ContactGroup {
  resourceName: string;
  etag?: string;
  metadata?: {
    updateTime?: string;
  };
  groupType?: string;
  name?: string;
  formattedName?: string;
  memberCount?: number;
  clientData?: {
    key?: string;
    value?: string;
  }[];
}
