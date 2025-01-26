import { formatDate } from "../utils/formatDate";
import { useAPIFetch } from "./useCanvasFetch";

interface ActivityItem {
  id: number;
  title: string;
  message: string;
  type: string;
  created_at: string;
  html_url: string;
  read_state: boolean;
}

/**
 * Fetch and process activity stream.
 */
export function useFeed() {
  const { data, isLoading, error, revalidate } = useAPIFetch<ActivityItem[]>("users/self/activity_stream?per_page=50");

  const activities =
    data
      ?.map((item) => ({
        id: item.id,
        title: item.title,
        message: item.message || "No message",
        type: item.type,
        htmlUrl: item.html_url,
        readState: item.read_state,
        createdAt: item.created_at,
        formattedCreatedAt: formatDate(item.created_at),
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];

  return { activities, isLoading, error, revalidate };
}

export function useMockFeed() {
  const now = Date.now();
  const mockActivities = [
    {
      id: 1,
      title: "Project Deadline Extended",
      message: "The final project deadline has been extended by one week",
      type: "Announcement",
      htmlUrl: "https://canvas.example.com/announcements/1",
      readState: false,
      createdAt: new Date(now - 20 * 60 * 1000).toISOString(), // 20 minutes ago
      formattedCreatedAt: "20 minutes ago",
    },
    {
      id: 2,
      title: " Group Project Update",
      message: "Team meeting scheduled for tomorrow",
      type: "message",
      htmlUrl: "https://canvas.example.com/messages/2",
      readState: true,
      createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      formattedCreatedAt: "1 day ago",
    },
    {
      id: 3,
      title: "Mid-term Exam Details",
      message: "Mid-term exam will be online",
      type: "Announcement",
      htmlUrl: "https://canvas.example.com/announcements/3",
      readState: false,
      createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      formattedCreatedAt: "5 days ago",
    },
    {
      id: 4,
      title: "Course Materials Updated",
      message: "New readings have been added",
      type: "message",
      htmlUrl: "https://canvas.example.com/messages/4",
      readState: true,
      createdAt: new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
      formattedCreatedAt: "20 days ago",
    },
    {
      id: 5,
      title: "Announcement: Welcome to the Course",
      message: "Welcome to the new semester",
      type: "Announcement",
      htmlUrl: "https://canvas.example.com/announcements/5",
      readState: true,
      createdAt: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString(), // 2 months ago
      formattedCreatedAt: "2 months ago",
    },
  ];

  return {
    activities: mockActivities,
    isLoading: false,
    error: null,
    revalidate: () => Promise.resolve(),
  };
}
