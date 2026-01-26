export interface DexContact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  emails: DexEmail[];
  phones: DexPhone[];
  job_title?: string | null;
  description?: string | null;
  website?: string | null;
  linkedin?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  telegram?: string | null;
  image_url?: string | null;
  birthday?: string | null;
  education?: string | null;
  last_seen_at?: string | null;
  next_reminder_at?: string | null;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DexEmail {
  email: string;
}

export interface DexPhone {
  phone_number: string;
  label?: string | null;
}

export interface DexContactUpdate {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  emails?: DexEmail[];
  phones?: DexPhone[];
  job_title?: string | null;
  description?: string | null;
  website?: string | null;
  linkedin?: string | null;
}

export interface DexContactsResponse {
  contacts: DexContact[];
  pagination: {
    total: {
      count: number;
    };
  };
}

export interface Preferences {
  apiKey: string;
}

export interface DexReminder {
  id: string;
  contact_id: string;
  reminder_at: string;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
  contact?: DexContact;
}

export interface DexRemindersResponse {
  reminders: DexReminder[];
  total?: {
    aggregate: {
      count: number;
    };
  };
}
