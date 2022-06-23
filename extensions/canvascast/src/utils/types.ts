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
  date: any;
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
  date: any;
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
  recent: boolean;
  numRecent: string;
}
