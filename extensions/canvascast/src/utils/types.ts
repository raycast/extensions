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
  description: string | Promise<string>;
  date: Date;
  pretty_date: string;
  course: string;
  course_id: number;
  color: Color;
  time?: boolean;
  submitted: boolean;
  filter?: string;
}

export interface announcement {
  course_id: number;
  title: string;
  color: string;
  course: string;
  id: number;
  markdown: string | Promise<string>;
  date: Date;
  pretty_date: string;
  time?: boolean;
  filter?: string;
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
  content_id?: string;
  download?: string;
}

export interface Preferences {
  token: string;
  domain: string;
  showRecent: boolean;
  numRecent: string;
}

export interface plannernote {
  id: number;
  title: string;
  type: string;
  creation_date: Date | string;
  due_date?: Date | string;
  custom_type?: string;
  custom_object?: assignment | announcement;
  announcement?: announcement;
  assignment?: assignment;
  submission?: submission;
}

export interface datefeed {
  date: Date;
  pretty_date: string;
  items: plannernote[];
  today: boolean;
}

export interface submission {
  submitted: boolean;
  excused: boolean;
  graded: boolean;
  late: boolean;
  missing: boolean;
  needs_grading: boolean;
  with_feedback: boolean;
}
