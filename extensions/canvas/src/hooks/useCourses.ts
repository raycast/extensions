import { useAPIFetch } from "./useCanvasFetch";

interface CourseResponse {
  id: number;
  course_code: string;
  name: string;
  is_favorite: boolean;
  workflow_state: string;
}

/**
 * Fetch and process courses.
 */
export function useCourses() {
  const endpoint = "courses?state[]=unpublished&state[]=available&include[]=favorites&per_page=100";

  const { data, isLoading, error, revalidate } = useAPIFetch<CourseResponse[]>(endpoint);

  const courses =
    data?.map((course) => ({
      id: course.id.toString(),
      courseCode: course.course_code,
      name: course.name,
      isFavorite: course.is_favorite,
      published: course.workflow_state === "available",
    })) || [];

  const sortedCourses = courses.sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return b.isFavorite ? 1 : -1;
    if (a.published !== b.published) return b.published ? 1 : -1;
    return 0;
  });

  return { data: sortedCourses, isLoading, error, revalidate };
}

export function useMockCourses() {
  const mockCourses = [
    {
      id: "1",
      courseCode: "CS101",
      name: "Introduction to Programming",
      isFavorite: true,
      published: true,
    },
    {
      id: "2",
      courseCode: "MATH201",
      name: "Advanced Mathematics",
      isFavorite: true,
      published: true,
    },
    {
      id: "3",
      courseCode: "ENG102",
      name: "Academic Writing",
      isFavorite: false,
      published: true,
    },
    {
      id: "4",
      courseCode: "HIST100",
      name: "World History",
      isFavorite: false,
      published: true,
    },
    {
      id: "5",
      courseCode: "PHYS202",
      name: "Physics II",
      isFavorite: false,
      published: false,
    },
  ];

  const sortedCourses = mockCourses.sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return b.isFavorite ? 1 : -1;
    if (a.published !== b.published) return b.published ? 1 : -1;
    return 0;
  });

  return {
    data: sortedCourses,
    isLoading: false,
    error: null,
    revalidate: () => Promise.resolve(),
  };
}
