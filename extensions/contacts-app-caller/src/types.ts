export interface PhoneNumber {
  label: string;
  number: string;
}

export interface Contact {
  id: string;
  name: string;
  phones: PhoneNumber[];
}

export interface ContactListItem {
  id: string;
  contactId: string;
  name: string;
  phone: string;
  label: string;
}

export interface Preferences {
  defaultAction: "call" | "message" | "facetime" | "facetime-audio" | "copy";
  actionMode: "direct" | "choose";
  showPhoneLabels: boolean;
}
