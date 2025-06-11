import type React from "react";

export interface Person {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  login: string;
  roles: string[];
  avatar_url: string;
  archived: boolean;
}

export interface Client {
  id: number;
  name: string;
  archived: boolean;
  updated_at: string;
  updated_by_id: number;
  harvest_id: number;
}

export interface Project {
  id: number;
  name: string;
  color: string;
  code: string | null;
  notes: string | null;
  start_date: string;
  end_date: string | null;
  harvest_id: number;
  client_id: number;
  archived: boolean;
  updated_at: string;
  updated_by_id: number;
  tags: string[];
}

export interface Assignment {
  id: number;
  start_date: string;
  end_date: string;
  allocation: number;
  notes: string | null;
  updated_at: string;
  updated_by_id: number;
  project_id: number;
  person_id: number;
  placeholder_id: number | null;
}

export interface ForecastEntry {
  id: number;
  title: string;
  client: string;
  notes: string;
  urls: { url: string; linearId: string | false }[];
  duration: string;
  hasLinear: boolean;
  isDone: boolean;
  allocation: number;
  personName: string;
  personId: number;
}

export interface EntryListItemProps {
  entry: ForecastEntry;
  showDetails: boolean;
  toggleDone: (id: number) => void;
  setShowDetails: React.Dispatch<React.SetStateAction<boolean>>;
  filteredPerson: string;
  webUrl: string;
  viewDate: Date;
  changeViewDate: (date: Date) => void;
}
