import { useAPIFetch } from "./useCanvasFetch";

interface ModuleItem {
  id: number;
  title: string;
  html_url: string;
  type: string;
}

interface Module {
  id: number;
  name: string;
  items: ModuleItem[];
}

/**
 * Fetch and process course modules.
 */
export function useCourseModules(courseId: string) {
  const { data, isLoading, error, revalidate } = useAPIFetch<Module[]>(`courses/${courseId}/modules?include[]=items`);

  const modules =
    data?.map((module) => ({
      id: module.id,
      name: module.name,
      items: module.items
        .filter((item) => item.type !== "SubHeader")
        .map((item) => ({
          id: item.id,
          title: item.title,
          htmlUrl: item.html_url,
          type: item.type as "Assignment" | "Discussion" | "File" | "Quiz" | "Page", // Ensuring correct type
        })),
    })) || [];

  return { modules, isLoading, error, revalidate };
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export function useMockCourseModules(courseId: string) {
  const mockModules = [
    {
      id: 1,
      name: "Week 1: Introduction",
      items: [
        {
          id: 101,
          title: "Course Overview",
          htmlUrl: "https://canvas.example.com/pages/101",
          type: "Page",
        },
        {
          id: 102,
          title: "Welcome Quiz",
          htmlUrl: "https://canvas.example.com/quizzes/102",
          type: "Quiz",
        },
      ],
    },
    {
      id: 2,
      name: "Week 2: Fundamentals",
      items: [
        {
          id: 201,
          title: "Reading Assignment",
          htmlUrl: "https://canvas.example.com/assignments/201",
          type: "Assignment",
        },
        {
          id: 202,
          title: "Lecture Notes",
          htmlUrl: "https://canvas.example.com/files/202",
          type: "File",
        },
        {
          id: 203,
          title: "Topic Discussion",
          htmlUrl: "https://canvas.example.com/discussions/203",
          type: "Discussion",
        },
      ],
    },
    {
      id: 3,
      name: "Week 3: Advanced Topics",
      items: [
        {
          id: 301,
          title: "Group Project Guidelines",
          htmlUrl: "https://canvas.example.com/files/301",
          type: "File",
        },
        {
          id: 302,
          title: "Mid-term Assignment",
          htmlUrl: "https://canvas.example.com/assignments/302",
          type: "Assignment",
        },
      ],
    },
  ];

  return {
    modules: mockModules,
    isLoading: false,
    error: null,
    revalidate: () => Promise.resolve(),
  };
}
