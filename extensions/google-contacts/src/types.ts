import { Icon } from "@raycast/api";

// UI types

export type ViewMode = "list" | "detail" | "grid";

export const VIEW_MODE_OPTIONS: { title: string; value: ViewMode; icon: Icon }[] = [
  { title: "List", value: "list", icon: Icon.AppWindowList },
  { title: "Detail", value: "detail", icon: Icon.AppWindowSidebarRight },
  { title: "Grid", value: "grid", icon: Icon.AppWindowGrid3x3 },
];

// Google People API response types

export interface FieldMetadata {
  primary?: boolean;
  source?: { type: string; id: string };
}

export interface Name {
  displayName?: string;
  familyName?: string;
  givenName?: string;
  middleName?: string;
  metadata?: FieldMetadata;
}

export interface EmailAddress {
  value?: string;
  type?: string;
  metadata?: FieldMetadata;
}

export interface PhoneNumber {
  value?: string;
  type?: string;
  canonicalForm?: string;
  metadata?: FieldMetadata;
}

export interface Photo {
  url?: string;
  default?: boolean;
  metadata?: FieldMetadata;
}

export interface Address {
  formattedValue?: string;
  streetAddress?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  type?: string;
  metadata?: FieldMetadata;
}

export interface Organization {
  name?: string;
  title?: string;
  metadata?: FieldMetadata;
}

export interface Biography {
  value?: string;
  contentType?: string;
  metadata?: FieldMetadata;
}

export interface Membership {
  contactGroupMembership?: {
    contactGroupId?: string;
    contactGroupResourceName?: string;
  };
  metadata?: FieldMetadata;
}

export interface Birthday {
  date?: { year?: number; month?: number; day?: number };
  text?: string;
  metadata?: FieldMetadata;
}

export interface Person {
  resourceName: string;
  etag: string;
  names?: Name[];
  emailAddresses?: EmailAddress[];
  phoneNumbers?: PhoneNumber[];
  photos?: Photo[];
  organizations?: Organization[];
  addresses?: Address[];
  biographies?: Biography[];
  birthdays?: Birthday[];
  memberships?: Membership[];
}

export interface ConnectionsListResponse {
  connections?: Person[];
  nextPageToken?: string;
  totalPeople?: number;
  totalItems?: number;
}

export interface SearchResponse {
  results?: { person: Person }[];
}

export interface ContactGroup {
  resourceName: string;
  etag: string;
  name: string;
  groupType: "USER_CONTACT_GROUP" | "SYSTEM_CONTACT_GROUP";
  memberCount?: number;
}

export interface ContactGroupsListResponse {
  contactGroups?: ContactGroup[];
  totalItems?: number;
  nextPageToken?: string;
}

export interface ContactFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  notes: string;
  address: string;
  email2: string;
  phone2: string;
  birthday: string;
  labels: string[];
}
