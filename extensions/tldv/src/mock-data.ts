import {
  Meeting,
  MeetingsResponse,
  TranscriptResponse,
  HighlightsResponse,
  TranscriptSentence,
  Highlight,
} from "./types";

// Mock meetings data
const mockMeetings: Meeting[] = [
  {
    id: "mock-meeting-1",
    name: "Weekly Team Standup",
    happenedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    url: "https://tldv.io/app/meetings/mock-meeting-1",
    duration: 1800, // 30 minutes
    organizer: { name: "John Smith", email: "john@example.com" },
    invitees: [
      { name: "Alice Johnson", email: "alice@example.com" },
      { name: "Bob Wilson", email: "bob@example.com" },
      { name: "Carol Brown", email: "carol@example.com" },
    ],
  },
  {
    id: "mock-meeting-2",
    name: "Product Review Session",
    happenedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    url: "https://tldv.io/app/meetings/mock-meeting-2",
    duration: 3600, // 1 hour
    organizer: { name: "Sarah Davis", email: "sarah@example.com" },
    invitees: [
      { name: "John Smith", email: "john@example.com" },
      { name: "Mike Taylor", email: "mike@example.com" },
    ],
  },
  {
    id: "mock-meeting-3",
    name: "Sprint Planning - Q1 2025",
    happenedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    url: "https://tldv.io/app/meetings/mock-meeting-3",
    duration: 5400, // 1.5 hours
    organizer: { name: "Emily Chen", email: "emily@example.com" },
    invitees: [
      { name: "John Smith", email: "john@example.com" },
      { name: "Alice Johnson", email: "alice@example.com" },
      { name: "Bob Wilson", email: "bob@example.com" },
      { name: "David Lee", email: "david@example.com" },
    ],
  },
  {
    id: "mock-meeting-4",
    name: "Client Demo - Acme Corp",
    happenedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    url: "https://tldv.io/app/meetings/mock-meeting-4",
    duration: 2700, // 45 minutes
    organizer: { name: "John Smith", email: "john@example.com" },
    invitees: [
      { name: "Client Contact", email: "contact@acme.com" },
      { name: "Sarah Davis", email: "sarah@example.com" },
    ],
  },
  {
    id: "mock-meeting-5",
    name: "Engineering All-Hands",
    happenedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
    url: "https://tldv.io/app/meetings/mock-meeting-5",
    duration: 3600, // 1 hour
    organizer: { name: "CTO", email: "cto@example.com" },
    invitees: [{ name: "Engineering Team", email: "eng@example.com" }],
  },
  {
    id: "mock-meeting-6",
    name: "Design Review",
    happenedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
    url: "https://tldv.io/app/meetings/mock-meeting-6",
    duration: 2400, // 40 minutes
    organizer: { name: "Design Lead", email: "design@example.com" },
    invitees: [
      { name: "John Smith", email: "john@example.com" },
      { name: "Product Manager", email: "pm@example.com" },
    ],
  },
];

// Mock transcript data
const mockTranscriptData: TranscriptSentence[] = [
  {
    speaker: "John Smith",
    text: "Good morning everyone, thanks for joining the call.",
    startTime: 0,
    endTime: 5,
  },
  {
    speaker: "John Smith",
    text: "Let's start with a quick status update from each team.",
    startTime: 5,
    endTime: 10,
  },
  {
    speaker: "Alice Johnson",
    text: "Sure, I'll go first. We completed the user authentication module last week.",
    startTime: 12,
    endTime: 20,
  },
  {
    speaker: "Alice Johnson",
    text: "The testing is going well and we expect to deploy by Friday.",
    startTime: 20,
    endTime: 28,
  },
  {
    speaker: "Bob Wilson",
    text: "That's great progress Alice. On the backend side, we've been working on API optimization.",
    startTime: 30,
    endTime: 40,
  },
  {
    speaker: "Bob Wilson",
    text: "We've reduced response times by about 40% so far.",
    startTime: 40,
    endTime: 48,
  },
  {
    speaker: "John Smith",
    text: "Excellent work Bob. That's going to make a big difference for our users.",
    startTime: 50,
    endTime: 58,
  },
  {
    speaker: "Carol Brown",
    text: "I have a question about the deployment timeline. Are we still on track for the end of month release?",
    startTime: 60,
    endTime: 72,
  },
  {
    speaker: "John Smith",
    text: "Yes, we're still targeting the 28th for the release. I'll send out a detailed timeline after this meeting.",
    startTime: 74,
    endTime: 85,
  },
  {
    speaker: "Alice Johnson",
    text: "Should we schedule a pre-release review meeting for next week?",
    startTime: 88,
    endTime: 95,
  },
  {
    speaker: "John Smith",
    text: "Good idea. I'll set that up for Wednesday afternoon.",
    startTime: 97,
    endTime: 103,
  },
];

// Mock highlights data
const mockHighlightsData: Highlight[] = [
  {
    text: "User authentication module completed and testing going well",
    startTime: 12,
    source: "ai",
    topic: {
      title: "Progress Update",
      summary:
        "The team has made significant progress on the user authentication module. Testing is proceeding smoothly and deployment is expected by Friday.",
    },
  },
  {
    text: "API response times reduced by 40%",
    startTime: 40,
    source: "ai",
    topic: {
      title: "Performance Improvements",
      summary:
        "Backend optimization efforts have resulted in a 40% reduction in API response times, which will significantly improve user experience.",
    },
  },
  {
    text: "Release still targeting the 28th",
    startTime: 74,
    source: "ai",
    topic: {
      title: "Release Timeline",
      summary:
        "The team confirmed the end-of-month release date (28th). A detailed timeline will be shared after the meeting.",
    },
  },
  {
    text: "Pre-release review meeting scheduled for Wednesday",
    startTime: 97,
    source: "ai",
    topic: {
      title: "Action Items",
      summary:
        "A pre-release review meeting will be scheduled for Wednesday afternoon to ensure everything is ready for the release.",
    },
  },
];

// Mock meeting without transcript (processing)
const mockMeetingNoTranscript: Meeting = {
  id: "mock-meeting-processing",
  name: "Recent Call (Processing)",
  happenedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
  url: "https://tldv.io/app/meetings/mock-meeting-processing",
  duration: 900, // 15 minutes
  organizer: { name: "John Smith", email: "john@example.com" },
  invitees: [],
};

// Export mock API responses
export function getMockMeetingsResponse(
  page = 1,
  limit = 50,
): MeetingsResponse {
  const allMeetings = [mockMeetingNoTranscript, ...mockMeetings];
  const start = (page - 1) * limit;
  const results = allMeetings.slice(start, start + limit);

  return {
    page,
    pages: Math.ceil(allMeetings.length / limit),
    total: allMeetings.length,
    pageSize: limit,
    results,
  };
}

export function getMockTranscriptResponse(
  meetingId: string,
): TranscriptResponse | null {
  // Simulate processing state for recent meeting
  if (meetingId === "mock-meeting-processing") {
    return null;
  }

  return {
    id: `transcript-${meetingId}`,
    meetingId,
    data: mockTranscriptData,
  };
}

export function getMockHighlightsResponse(
  meetingId: string,
): HighlightsResponse | null {
  // Simulate no highlights for some meetings
  if (
    meetingId === "mock-meeting-processing" ||
    meetingId === "mock-meeting-6"
  ) {
    return { meetingId, data: [] };
  }

  return {
    meetingId,
    data: mockHighlightsData,
  };
}

// Simulate network delay
export function simulateDelay(ms = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
