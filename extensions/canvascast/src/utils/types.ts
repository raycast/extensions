import { Color } from "@raycast/api";

export interface course {
  name: string;
  code: string;
  id: number;
  color: Color;
  assignments: assignment[];
}

export interface assignment {
  name: string;
  id: number;
  description: string;
  date: string;
  course: string;
  course_id: number;
  color: Color;
}

export interface announcement {
  course_id: number;
  title: string;
  color: string;
  course: string;
  id: number;
  markdown: string;
  date: string;
}

export interface modulesection {
  name: string;
  items: moduleitem[];
}

export interface moduleitem {
  id: string;
  name: string;
  type: string;
  url: string;
  passcode?: string;
  download?: string;
}

export interface Preferences {
  token: string;
  domain: string;
  showRecent: boolean;
  numRecent: string;
}
