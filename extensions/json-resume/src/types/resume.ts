// JSON Resume Type Definitions

export interface Location {
  address?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
  region?: string;
}

export interface Profile {
  network?: string;
  username?: string;
  url?: string;
}

export interface Basics {
  name?: string;
  label?: string;
  image?: string;
  email?: string;
  phone?: string;
  website?: string;
  summary?: string;
  location?: Location;
  profiles?: Profile[];
}

export interface Skill {
  name?: string;
  level?: string;
  keywords?: string[];
}

export interface Work {
  company?: string;
  position?: string;
  website?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
}

export interface Education {
  institution?: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
  courses?: string[];
}

export interface Language {
  language?: string;
  fluency?: string;
}

export interface Resume {
  basics?: Basics;
  skills?: Skill[];
  work?: Work[];
  education?: Education[];
  languages?: Language[];
  [key: string]: unknown; // Allow additional properties for extensibility
}
