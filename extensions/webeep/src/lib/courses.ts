import { callWs } from "./moodle";
import { htmlToText } from "./html";
import { Lang, resolveMlang } from "./mlang";

export interface RawCourse {
  id: number;
  fullname: string;
  shortname: string;
  idnumber?: string;
  startdate: number;
  enddate: number;
  visible?: boolean;
  hidden?: boolean;
  isfavourite?: boolean;
  viewurl: string;
  coursecategory?: string;
  progress?: number | null;
}

export interface Course {
  id: number;
  /** Full display name, multi-language tags resolved. */
  fullName: string;
  /** Course name without code, teachers and year, when the Polimi naming pattern matches. */
  name: string;
  code?: string;
  teachers?: string;
  year?: string;
  category?: string;
  viewUrl: string;
  isFavourite: boolean;
  hidden: boolean;
  inProgress: boolean;
  startDate: Date;
  endDate?: Date;
}

export interface ParsedCourseName {
  name: string;
  code?: string;
  teachers?: string;
  year?: string;
}

/** Parses the Polimi naming convention `051479 - COURSE NAME (TEACHER ONE, TEACHER TWO) [2024-25]`. */
export function parseCourseName(fullName: string): ParsedCourseName {
  const trimmed = fullName.trim();
  const match = /^(\d{6})\s*-\s*(.+?)(?:\s*\(([^()]*)\))?\s*(?:\[([^\]]+)\])?$/.exec(trimmed);
  if (!match) {
    const yearOnly = /^(.*?)\s*\[([^\]]*\d{4}[^\]]*)\]$/.exec(trimmed);
    if (yearOnly) return { name: yearOnly[1].trim(), year: yearOnly[2].trim() };
    return { name: trimmed };
  }
  const [, code, name, teachers, year] = match;
  return {
    code,
    name: name.trim(),
    teachers: teachers?.trim() || undefined,
    year: year?.trim() || undefined,
  };
}

export function isInProgress(raw: Pick<RawCourse, "startdate" | "enddate">, now = Date.now()): boolean {
  const nowSeconds = Math.floor(now / 1000);
  const started = !raw.startdate || raw.startdate <= nowSeconds;
  const ended = raw.enddate > 0 && raw.enddate < nowSeconds;
  return started && !ended;
}

export function toCourse(raw: RawCourse, lang: Lang, now = Date.now()): Course {
  const fullName = htmlToText(resolveMlang(raw.fullname, lang));
  const parsed = parseCourseName(fullName);
  return {
    id: raw.id,
    fullName,
    name: parsed.name,
    code: parsed.code,
    teachers: parsed.teachers,
    year: parsed.year,
    category: raw.coursecategory,
    viewUrl: raw.viewurl,
    isFavourite: Boolean(raw.isfavourite),
    hidden: Boolean(raw.hidden),
    inProgress: isInProgress(raw, now),
    startDate: new Date(raw.startdate * 1000),
    endDate: raw.enddate ? new Date(raw.enddate * 1000) : undefined,
  };
}

/** In-progress courses first (alphabetically), then past courses by most recent year. */
export function sortCourses(courses: Course[]): Course[] {
  return [...courses].sort((a, b) => {
    if (a.inProgress !== b.inProgress) return a.inProgress ? -1 : 1;
    if (a.isFavourite !== b.isFavourite) return a.isFavourite ? -1 : 1;
    if (!a.inProgress) {
      const byYear = (b.year ?? "").localeCompare(a.year ?? "");
      if (byYear !== 0) return byYear;
    }
    return a.name.localeCompare(b.name);
  });
}

export type CourseClassification = "all" | "inprogress" | "past" | "future" | "favourites" | "hidden";

export async function fetchCourses(lang: Lang, classification: CourseClassification = "all"): Promise<Course[]> {
  const data = await callWs<{ courses: RawCourse[] }>("core_course_get_enrolled_courses_by_timeline_classification", {
    classification,
    limit: 0,
    offset: 0,
    sort: "fullname",
  });
  return sortCourses(data.courses.map((raw) => toCourse(raw, lang)));
}

export async function fetchCoursesInProgress(lang: Lang): Promise<Course[]> {
  return fetchCourses(lang, "inprogress");
}

export async function setCourseFavourite(courseId: number, favourite: boolean): Promise<void> {
  await callWs("core_course_set_favourite_courses", { courses: [{ id: courseId, favourite }] });
}

export interface CatalogCourse {
  id: number;
  fullName: string;
  name: string;
  code?: string;
  teachers?: string;
  year?: string;
  categoryName?: string;
  viewUrl: string;
}

interface RawSearchResult {
  total: number;
  courses: { id: number; fullname: string; displayname: string; categoryname?: string }[];
}

/** Site-wide course search (also returns courses the user is not enrolled in). */
export async function searchCourseCatalog(query: string, lang: Lang, perPage = 50): Promise<CatalogCourse[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const data = await callWs<RawSearchResult>("core_course_search_courses", {
    criterianame: "search",
    criteriavalue: trimmed,
    page: 0,
    perpage: perPage,
  });
  return data.courses.map((raw) => {
    const fullName = htmlToText(resolveMlang(raw.fullname, lang));
    const parsed = parseCourseName(fullName);
    return {
      id: raw.id,
      fullName,
      name: parsed.name,
      code: parsed.code,
      teachers: parsed.teachers,
      year: parsed.year,
      categoryName: raw.categoryname,
      viewUrl: `https://webeep.polimi.it/course/view.php?id=${raw.id}`,
    };
  });
}
