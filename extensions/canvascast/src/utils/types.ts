import { Color } from "@raycast/api";

export interface course {
  name: string;
  code: string;
  id: number;
  color: Color;
  assignments: assignment[];
  announcements: announcement[];
}

export interface assignment {
  name: string;
  id: number;
  description?: string | Promise<string>;
  date: Date;
  pretty_date: string;
  course: string;
  course_id: number;
  color: Color;
  time?: boolean;
  submitted: boolean;
  filter?: string;
  special_missing?: boolean;
  course_color?: Color.ColorLike;
}

export interface quiz {
  name: string;
  id: number;
  description?: string | Promise<string>;
  date: Date;
  pretty_date: string;
  course: string;
  course_id: number;
  color: Color;
  time?: boolean;
  submitted: boolean;
  filter?: string;
  special_missing?: boolean;
  course_color?: Color.ColorLike;
}

export interface announcement {
  course_id: number;
  title: string;
  color: string;
  course: string;
  id: number;
  markdown?: string | Promise<string>;
  date: Date;
  pretty_date: string;
  time?: boolean;
  filter?: string;
  course_color?: Color.ColorLike;
}

export interface modulesection {
  name: string;
  items: moduleitem[];
}

export interface moduleitem {
  id: string;
  name: string;
  type: string;
  url?: string;
  passcode?: string;
  content_id?: string;
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
  quiz?: quiz;
  submission?: submission;
  plannable_date?: Date | string;
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

export interface apiAnnouncement {
  title: string;
  message: string;
  created_at: string;
}

export interface apiAssignment {
  name: string;
  description: string;
  points_possible: number;
  submission?: {
    submitted_at: string;
    graded_at: string;
    score: number;
    grade: string;
  };
}

export interface apiQuiz {
  title: string;
  description: string;
  points_possible: number;
  quiz_submissions?: Array<{
    kept_score: number;
    quiz_points_possible: number;
  }>;
}
