import type { CourseDetail, CourseListResponse, CourseSummary } from "./types";

export const API_BASE_URL = "https://couponcode.dev";
export const TELEGRAM_URL = "https://t.me/couponcodedev";
export const PAGE_SIZE = 50;

// Canonical category set (mirrors couponcode.dev). Used directly for the filter dropdown
// so the list is complete regardless of how many courses are loaded at once.
export const CATEGORIES = [
  "Development",
  "Business",
  "Finance & Accounting",
  "IT & Software",
  "Office Productivity",
  "Personal Development",
  "Design",
  "Marketing",
  "Health & Fitness",
  "Music",
  "Teaching & Academics",
  "Photography & Video",
  "Lifestyle",
];

export interface CourseListParams {
  search?: string;
  category?: string;
}

export function courseListUrl(page: number, params: CourseListParams = {}): string {
  const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (params.search) query.set("search", params.search);
  if (params.category) query.set("category", params.category);
  return `${API_BASE_URL}/api/courses?${query.toString()}`;
}

export function courseDetailUrl(slug: string): string {
  return `${API_BASE_URL}/api/courses/${encodeURIComponent(slug)}`;
}

export function courseCouponUrl(slug: string): string {
  return `${API_BASE_URL}/udemy/course/${slug}/`;
}

export async function parseCourseList(response: Response): Promise<CourseListResponse> {
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return (await response.json()) as CourseListResponse;
}

export async function parseCourseDetail(response: Response): Promise<CourseDetail> {
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  const result = (await response.json()) as { data: CourseDetail };
  return result.data;
}

export function transformCourse(item: Partial<CourseSummary>): CourseSummary {
  return {
    courseid: item.courseid,
    title: item.title || "Untitled Course",
    image: item.image || "",
    author: item.author || { displayName: "Unknown Author" },
    category: item.category || "General",
    rating: item.rating ?? null,
    slug: item.slug || "",
    expired: item.expired || false,
    updatedAt: item.updatedAt || new Date().toISOString(),
    enrollments: item.enrollments ?? null,
  };
}

// Load every page of a (optionally filtered) result set. The catalogue is paginated
// server-side, so favorites and global sorts need the complete set to be accurate. Page 1
// is fetched first to learn pageCount, then the remaining pages run in parallel.
export async function fetchAllCourses(params: CourseListParams = {}): Promise<CourseSummary[]> {
  const first = await fetchCoursePage(1, params);
  if (first.pageCount <= 1) return first.courses;

  const remaining = await Promise.all(
    Array.from({ length: first.pageCount - 1 }, (_, index) => fetchCoursePage(index + 2, params)),
  );
  return remaining.reduce((acc, page) => acc.concat(page.courses), first.courses);
}

async function fetchCoursePage(
  page: number,
  params: CourseListParams,
): Promise<{ courses: CourseSummary[]; pageCount: number }> {
  const response = await fetch(courseListUrl(page, params));
  const result = await parseCourseList(response);
  return { courses: result.data.map(transformCourse), pageCount: result.pagination.pageCount };
}

// Build the Udemy enrollment URL from a course's stored href. The href is validated to
// guard against authority-confusion (e.g. a leading "@" could otherwise redirect to a
// host the attacker controls); only https://(www.)?udemy.com is accepted.
export function buildUdemyUrl(course: { href?: string; couponCode?: string }): string | undefined {
  if (!course.href) return undefined;

  const raw = course.href.startsWith("http") ? course.href : `https://www.udemy.com${course.href}`;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return undefined;
  }

  if (url.protocol !== "https:" || (url.hostname !== "www.udemy.com" && url.hostname !== "udemy.com")) {
    return undefined;
  }

  if (course.couponCode) url.searchParams.set("couponCode", course.couponCode);
  return url.toString();
}
