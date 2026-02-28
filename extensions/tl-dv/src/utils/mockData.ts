import { Recording, SearchResult } from "../types";

export const mockRecordings: Recording[] = [
  {
    id: "1",
    title: "Product Roadmap Planning Q1 2025",
    description: "Quarterly planning meeting for product roadmap and feature prioritization",
    date: new Date().toISOString(),
    duration: 3600,
    participants: ["John Doe", "Jane Smith", "Mike Johnson", "Sarah Williams"],
    tags: ["planning", "roadmap", "Q1-2025"],
    url: "https://app.tldv.io/recordings/1",
    thumbnailUrl: "https://via.placeholder.com/320x180",
    status: "ready",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    meetingType: "zoom",
    summary: {
      text: "The team discussed Q1 2025 product roadmap priorities, focusing on user authentication improvements, dashboard redesign, and API v2 development.",
      keyPoints: [
        "Launch new authentication system by end of January",
        "Complete dashboard redesign by mid-February",
        "API v2 beta release in March",
      ],
      actionItems: [
        {
          text: "Create technical specification for auth system",
          assignee: "John Doe",
          dueDate: "2025-01-15",
          status: "pending",
        },
        {
          text: "Design mockups for new dashboard",
          assignee: "Jane Smith",
          dueDate: "2025-01-20",
          status: "pending",
        },
      ],
      decisions: ["Prioritize authentication over other features", "Delay mobile app development to Q2"],
    },
    highlights: [
      {
        id: "h1",
        text: "We need to focus on security first before adding new features",
        timestamp: 1200,
        speaker: "John Doe",
        tags: ["security", "priority"],
      },
      {
        id: "h2",
        text: "The dashboard redesign should improve user engagement by at least 30%",
        timestamp: 1800,
        speaker: "Jane Smith",
        tags: ["UX", "metrics"],
      },
    ],
  },
  {
    id: "2",
    title: "Engineering Standup - Sprint 42",
    description: "Daily engineering team standup meeting",
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    duration: 900,
    participants: ["Mike Johnson", "David Chen", "Emily Brown"],
    tags: ["standup", "engineering", "sprint-42"],
    url: "https://app.tldv.io/recordings/2",
    status: "ready",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    meetingType: "google_meet",
    summary: {
      text: "Team discussed progress on sprint 42 tasks, blockers with deployment pipeline, and upcoming deadlines.",
      keyPoints: ["API integration 80% complete", "Deployment pipeline issues resolved", "Code review backlog cleared"],
      actionItems: [
        {
          text: "Fix CI/CD pipeline configuration",
          assignee: "David Chen",
          status: "completed",
        },
      ],
      decisions: [],
    },
    highlights: [],
  },
  {
    id: "3",
    title: "Customer Success Review",
    description: "Monthly customer success metrics and feedback review",
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 2700,
    participants: ["Sarah Williams", "Tom Anderson", "Lisa Martinez"],
    tags: ["customer-success", "metrics", "review"],
    url: "https://app.tldv.io/recordings/3",
    status: "ready",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    meetingType: "teams",
    summary: {
      text: "Reviewed customer satisfaction scores, support ticket trends, and success stories from the past month.",
      keyPoints: [
        "NPS score increased to 72",
        "Support ticket resolution time down 15%",
        "3 new enterprise customers onboarded",
      ],
      actionItems: [],
      decisions: [],
    },
    highlights: [],
  },
  {
    id: "4",
    title: "Design System Workshop",
    description: "Workshop on implementing and maintaining the design system",
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 5400,
    participants: ["Jane Smith", "Alex Turner", "Chris White", "Pat Garcia"],
    tags: ["design", "workshop", "design-system"],
    url: "https://app.tldv.io/recordings/4",
    status: "processing",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    meetingType: "zoom",
    summary: {
      text: "Workshop covered design system principles, component library usage, and best practices for maintaining consistency.",
      keyPoints: [
        "Introduced new component library",
        "Established design token standards",
        "Created contribution guidelines",
      ],
      actionItems: [],
      decisions: ["Adopt Figma as primary design tool", "Weekly design system review meetings"],
    },
    highlights: [],
  },
  {
    id: "5",
    title: "Sales Team Training - Q1 Updates",
    description: "Training session on new product features and sales strategies",
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 4200,
    participants: ["Tom Anderson", "Rachel Green", "James Wilson", "Monica Taylor"],
    tags: ["sales", "training", "Q1-2025"],
    url: "https://app.tldv.io/recordings/5",
    status: "ready",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    meetingType: "zoom",
    summary: {
      text: "Covered new product features, competitive positioning, and updated sales playbook for Q1 2025.",
      keyPoints: [
        "New enterprise pricing tier launched",
        "Competitive analysis against top 3 competitors",
        "Updated sales demo flow",
      ],
      actionItems: [
        {
          text: "Update CRM with new pricing information",
          assignee: "Rachel Green",
          dueDate: "2025-01-10",
          status: "pending",
        },
        {
          text: "Schedule follow-up training for new hires",
          assignee: "Tom Anderson",
          dueDate: "2025-01-15",
          status: "pending",
        },
      ],
      decisions: [],
    },
    highlights: [],
  },
];

export const mockSearchResults: SearchResult[] = mockRecordings.map((recording, index) => ({
  recording,
  relevanceScore: 1 - index * 0.15,
  matchedFields: ["title", "summary"],
  snippet: recording.summary?.text.substring(0, 100) + "...",
}));

export function getMockRecordings(page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = mockRecordings.slice(start, end);

  return {
    items,
    total: mockRecordings.length,
    page,
    pageSize,
    hasMore: end < mockRecordings.length,
  };
}

export function searchMockRecordings(query: string, page: number, pageSize: number) {
  const lowerQuery = query.toLowerCase();
  const filtered = mockRecordings.filter(
    (recording) =>
      recording.title.toLowerCase().includes(lowerQuery) ||
      recording.description?.toLowerCase().includes(lowerQuery) ||
      recording.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      recording.participants.some((p) => p.toLowerCase().includes(lowerQuery)),
  );

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = filtered.slice(start, end);

  const results: SearchResult[] = items.map((recording, index) => ({
    recording,
    relevanceScore: 1 - index * 0.1,
    matchedFields: ["title", "description"],
    snippet: recording.description?.substring(0, 150) || recording.title,
  }));

  return {
    items: results,
    total: filtered.length,
    page,
    pageSize,
    hasMore: end < filtered.length,
  };
}
