import type { CourseDetail, CourseListResponse, CourseSummary } from "./types";

export const API_BASE_URL = "https://couponcode.dev";
export const TELEGRAM_URL = "https://t.me/couponcodedev";
export const PAGE_SIZE = 50;

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

export function courseCategoriesUrl(): string {
  return `${API_BASE_URL}/api/courses?page=1&pageSize=100`;
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

export function buildUdemyUrl(course: { href?: string; couponCode?: string }): string | undefined {
  if (!course.href) return undefined;
  const url = new URL(`https://www.udemy.com${course.href}`);
  if (course.couponCode) url.searchParams.set("couponCode", course.couponCode);
  return url.toString();
}
