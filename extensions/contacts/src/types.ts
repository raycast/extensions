export interface EmailWithLabel {
  address: string;
  label: string;
}

export interface PhoneWithLabel {
  number: string;
  label: string;
}

export interface Contact {
  id: string;
  givenName: string;
  familyName: string;
  emails: string[];
  phones: string[];
  emailsWithLabels?: EmailWithLabel[];
  phonesWithLabels?: PhoneWithLabel[];
}

export interface ErrorResponse {
  error: boolean;
  type: string;
  status?: string;
  message: string;
}

export interface EmailField {
  address: string;
  label: string;
}

export interface PhoneField {
  number: string;
  label: string;
}

export interface FormValues {
  givenName: string;
  familyName: string;
  "emails[0].address": string;
  "emails[0].label": string[];
  "emails[1].address": string;
  "emails[1].label": string[];
  "phones[0].number": string;
  "phones[0].label": string[];
  "phones[1].number": string;
  "phones[1].label": string[];
}

export interface SuccessResponse {
  success: boolean;
  id: string;
  message: string;
}
