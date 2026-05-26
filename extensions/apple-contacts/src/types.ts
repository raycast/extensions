export interface ContactField {
  value: string;
  type?: string;
}

export interface ContactAddress {
  formattedValue: string;
  type?: string;
}

export interface UnifiedContact {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  emails: ContactField[];
  phones: ContactField[];
  company?: string;
  primaryPhone?: string;
  primaryEmail?: string;
  jobTitle?: string;
  addresses?: ContactAddress[];
  birthday?: string;
  notes?: string;
  photoUrl?: string;
}
