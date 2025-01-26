import { formatDate } from "../utils/formatDate";
import { useAPIFetch } from "./useCanvasFetch";

interface Assignment {
  id: number;
  name: string;
  html_url: string;
  due_at: string;
}

/**
 * Fetch and process upcoming assignments.
 */
export function useCourseAssignments(courseId: string) {
  const { data, isLoading, error, revalidate } = useAPIFetch<Assignment[]>(`courses/${courseId}/assignments`);

  const assignments =
    data
      ?.map((item) => ({
        id: item.id.toString(),
        name: item.name,
        dueAt: item.due_at,
        formattedDueAt: formatDate(item.due_at),
        htmlUrl: item.html_url,
      }))
      .sort((a, b) => {
        if (!a.dueAt) return 1;
        if (!b.dueAt) return -1;
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      }) || [];

  return { assignments, isLoading, error, revalidate };
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export function useMockCourseAssignments(courseId: string) {
  const now = Date.now();
  const mockAssignments = [
    {
      id: "1",
      name: "Weekly Quiz 1",
      dueAt: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
      formattedDueAt: "In 2 days",
      htmlUrl: "https://canvas.example.com/courses/1/assignments/1",
    },
    {
      id: "2",
      name: "Research Paper Draft",
      dueAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
      formattedDueAt: "In 1 week",
      htmlUrl: "https://canvas.example.com/courses/1/assignments/2",
    },
    {
      id: "3",
      name: "Group Presentation",
      dueAt: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
      formattedDueAt: "In 2 weeks",
      htmlUrl: "https://canvas.example.com/courses/1/assignments/3",
    },
    {
      id: "4",
      name: "Final Project",
      dueAt: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(), // 1 month from now
      formattedDueAt: "In 1 month",
      htmlUrl: "https://canvas.example.com/courses/1/assignments/4",
    },
    {
      id: "5",
      name: "Extra Credit Assignment",
      dueAt: null,
      formattedDueAt: "No due date",
      htmlUrl: "https://canvas.example.com/courses/1/assignments/5",
    },
  ].sort((a, b) => {
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });

  return {
    assignments: mockAssignments,
    isLoading: false,
    error: null,
    revalidate: () => Promise.resolve(),
  };
}
