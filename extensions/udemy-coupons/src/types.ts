export interface CourseAuthor {
  displayName: string;
  image?: string | null;
  profileLink?: string | null;
}

// Shape returned by the list endpoint `/api/courses`
export interface CourseSummary {
  courseid?: string;
  title: string;
  image: string;
  author: CourseAuthor;
  category: string;
  rating: string | null;
  slug: string;
  expired: boolean;
  updatedAt: string;
  enrollments?: string | null;
}

// Shape returned by the detail endpoint `/api/courses/:slug`
export interface CourseDetail extends CourseSummary {
  couponCode?: string;
  language?: string;
  courseLength?: string;
  body?: string;
  href?: string;
}

export interface CourseListResponse {
  data: CourseSummary[];
  pagination: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
}

export interface CourseDetailResponse {
  data: CourseDetail;
}
