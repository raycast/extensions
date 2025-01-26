import { formatDate } from "../utils/formatDate";
import { useAPIFetch } from "./useCanvasFetch";

interface Assignment {
  id: number;
  title: string;
  html_url: string;
  context_name: string;
  assignment?: {
    due_at: string;
  };
}

/**
 * Fetch and process upcoming assignments.
 */
export function useDeadlines() {
  const { data, isLoading, error, revalidate } = useAPIFetch<Assignment[]>("users/self/upcoming_events");

  const assignments =
    data?.map((item) => ({
      id: item.id.toString(),
      title: item.title,
      dueAt: item.assignment?.due_at || "No date",
      formattedDueAt: item.assignment?.due_at ? formatDate(item.assignment.due_at) : "No Due Date",
      htmlUrl: item.html_url,
      contextName: item.context_name,
    })) || [];

  return { assignments, isLoading, error, revalidate };
}

export function useMockDeadlines() {
  const now = Date.now();
  const mockAssignments = [
    {
      id: "1",
      title: "Pop Quiz: Linear Algebra",
      dueAt: new Date(now + 30 * 60 * 1000).toISOString(), // 30 minutes
      formattedDueAt: "In 30 minutes",
      htmlUrl: "https://canvas.example.com/assignments/1",
      contextName: "Mathematics",
    },
    {
      id: "2",
      title: "Lab Report: Chemical Reactions",
      dueAt: new Date(now + 3 * 60 * 60 * 1000).toISOString(), // 3 hours
      formattedDueAt: "In 3 hours",
      htmlUrl: "https://canvas.example.com/assignments/2",
      contextName: "Chemistry",
    },
    {
      id: "3",
      title: "Essay: Modern Literature",
      dueAt: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days
      formattedDueAt: "In 2 days",
      htmlUrl: "https://canvas.example.com/assignments/3",
      contextName: "English Literature",
    },
    {
      id: "4",
      title: "Group Project: Market Analysis",
      dueAt: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days
      formattedDueAt: "In 5 days",
      htmlUrl: "https://canvas.example.com/assignments/4",
      contextName: "Business Studies",
    },
    {
      id: "5",
      title: "Final Project: Web Application",
      dueAt: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks
      formattedDueAt: "In 2 weeks",
      htmlUrl: "https://canvas.example.com/assignments/5",
      contextName: "Web Development",
    },
    {
      id: "6",
      title: "Research Paper: AI Ethics",
      dueAt: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      formattedDueAt: "In 30 days",
      htmlUrl: "https://canvas.example.com/assignments/6",
      contextName: "Computer Science",
    },
  ];

  return {
    assignments: mockAssignments,
    isLoading: false,
    error: null,
    revalidate: () => Promise.resolve(),
  };
}
