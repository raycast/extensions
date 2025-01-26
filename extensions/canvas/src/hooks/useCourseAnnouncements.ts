import { formatDate } from "../utils/formatDate";
import { useAPIFetch } from "./useCanvasFetch";

interface Announcement {
  id: number;
  title: string;
  html_url: string;
  user_name: string;
  created_at: string;
}

/**
 * Fetch course announcements using Canvas API.
 */
export function useCourseAnnouncements(courseId: string) {
  const { data, isLoading, error, revalidate } = useAPIFetch<Announcement[]>(
    `announcements?context_codes[]=course_${courseId}&start_date=2000-01-01&end_date=2100-01-01`, // Ensures all announcements
  );

  // Transform API response
  const announcements =
    data?.map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      htmlUrl: announcement.html_url,
      userName: announcement.user_name,
      createdAt: announcement.created_at,
      formatedCreatedAt: formatDate(announcement.created_at),
    })) || [];

  return { announcements, isLoading, error, revalidate };
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export function useMockCourseAnnouncements(courseId: string) {
  const now = Date.now();
  const mockAnnouncements = [
    {
      id: 1,
      title: "Important: Final Exam Schedule",
      htmlUrl: "https://canvas.example.com/announcements/1",
      userName: "Prof. Smith",
      createdAt: new Date(now - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      formatedCreatedAt: "1 hour ago",
    },
    {
      id: 2,
      title: "Guest Speaker Next Week",
      htmlUrl: "https://canvas.example.com/announcements/2",
      userName: "Dr. Johnson",
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      formatedCreatedAt: "2 days ago",
    },
    {
      id: 3,
      title: "Project Guidelines Updated",
      htmlUrl: "https://canvas.example.com/announcements/3",
      userName: "Prof. Smith",
      createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      formatedCreatedAt: "5 days ago",
    },
    {
      id: 4,
      title: "Mid-term Results Posted",
      htmlUrl: "https://canvas.example.com/announcements/4",
      userName: "Teaching Assistant",
      createdAt: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
      formatedCreatedAt: "2 weeks ago",
    },
    {
      id: 5,
      title: "Welcome to the Course",
      htmlUrl: "https://canvas.example.com/announcements/5",
      userName: "Prof. Smith",
      createdAt: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(), // 1 month ago
      formatedCreatedAt: "1 month ago",
    },
  ];

  return {
    announcements: mockAnnouncements,
    isLoading: false,
    error: null,
    revalidate: () => Promise.resolve(),
  };
}
