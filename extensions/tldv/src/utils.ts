import { Workspace, Meeting, DateFilter } from "./types";

// Parse workspaces from preferences
export function parseWorkspaces(prefs: Partial<Preferences>): Workspace[] {
  const workspaces: Workspace[] = [];

  if (prefs.workspace1ApiKey?.trim()) {
    workspaces.push({
      name: prefs.workspace1Name?.trim() || "Default",
      apiKey: prefs.workspace1ApiKey.trim(),
    });
  }

  if (prefs.workspace2ApiKey?.trim()) {
    workspaces.push({
      name: prefs.workspace2Name?.trim() || "Workspace 2",
      apiKey: prefs.workspace2ApiKey.trim(),
    });
  }

  if (prefs.workspace3ApiKey?.trim()) {
    workspaces.push({
      name: prefs.workspace3Name?.trim() || "Workspace 3",
      apiKey: prefs.workspace3ApiKey.trim(),
    });
  }

  return workspaces;
}

// Get default workspace
export function getDefaultWorkspace(
  workspaces: Workspace[],
  defaultName?: string,
): Workspace | undefined {
  if (!defaultName) return workspaces[0];
  return workspaces.find((w) => w.name === defaultName) || workspaces[0];
}

// Format duration
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Format date (absolute)
export function formatDateAbsolute(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Format date (relative)
export function formatDateRelative(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return formatDateAbsolute(dateString);
}

// Format date based on preference
export function formatDate(
  dateString: string,
  format: "relative" | "absolute" = "relative",
): string {
  return format === "relative"
    ? formatDateRelative(dateString)
    : formatDateAbsolute(dateString);
}

// Format time (mm:ss)
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Get date group label
export function getDateGroup(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekStart = new Date(today.getTime() - today.getDay() * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const meetingDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  if (meetingDate.getTime() >= today.getTime()) return "Today";
  if (meetingDate.getTime() >= yesterday.getTime()) return "Yesterday";
  if (meetingDate.getTime() >= weekStart.getTime()) return "This Week";
  if (meetingDate.getTime() >= monthStart.getTime()) return "This Month";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

// Group meetings by date
export function groupMeetingsByDate(
  meetings: Meeting[],
): Map<string, Meeting[]> {
  const groups = new Map<string, Meeting[]>();

  for (const meeting of meetings) {
    const group = getDateGroup(meeting.happenedAt);
    const existing = groups.get(group) || [];
    existing.push(meeting);
    groups.set(group, existing);
  }

  return groups;
}

// Filter meetings by date range
export function filterMeetingsByDate(
  meetings: Meeting[],
  filter: DateFilter,
): Meeting[] {
  if (filter === "all") return meetings;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let startDate: Date;
  switch (filter) {
    case "today":
      startDate = today;
      break;
    case "week":
      startDate = new Date(today.getTime() - 7 * 86400000);
      break;
    case "month":
      startDate = new Date(today.getTime() - 30 * 86400000);
      break;
    default:
      return meetings;
  }

  return meetings.filter((m) => new Date(m.happenedAt) >= startDate);
}

// Search meetings
export function searchMeetings(meetings: Meeting[], query: string): Meeting[] {
  if (!query.trim()) return meetings;

  const lowerQuery = query.toLowerCase();
  return meetings.filter((m) => {
    const titleMatch = m.name.toLowerCase().includes(lowerQuery);
    const organizerMatch =
      m.organizer?.name?.toLowerCase().includes(lowerQuery) ||
      m.organizer?.email?.toLowerCase().includes(lowerQuery);
    const inviteeMatch = m.invitees?.some(
      (i) =>
        i.name?.toLowerCase().includes(lowerQuery) ||
        i.email?.toLowerCase().includes(lowerQuery),
    );
    return titleMatch || organizerMatch || inviteeMatch;
  });
}

// Search transcript content
export function searchTranscript(
  transcript: { speaker: string; text: string; startTime: number }[],
  query: string,
): { speaker: string; text: string; startTime: number; matchIndex: number }[] {
  if (!query.trim() || !transcript.length) return [];

  const lowerQuery = query.toLowerCase();
  const results: {
    speaker: string;
    text: string;
    startTime: number;
    matchIndex: number;
  }[] = [];

  transcript.forEach((sentence, index) => {
    if (sentence.text.toLowerCase().includes(lowerQuery)) {
      results.push({ ...sentence, matchIndex: index });
    }
  });

  return results;
}

// Get unique participants from meetings
export function getUniqueParticipants(
  meetings: Meeting[],
): { name: string; email: string; count: number }[] {
  const participantMap = new Map<
    string,
    { name: string; email: string; count: number }
  >();

  for (const meeting of meetings) {
    // Add organizer
    if (meeting.organizer?.email) {
      const key = meeting.organizer.email.toLowerCase();
      const existing = participantMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        participantMap.set(key, {
          name: meeting.organizer.name || meeting.organizer.email,
          email: meeting.organizer.email,
          count: 1,
        });
      }
    }

    // Add invitees
    for (const invitee of meeting.invitees || []) {
      if (invitee.email) {
        const key = invitee.email.toLowerCase();
        const existing = participantMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          participantMap.set(key, {
            name: invitee.name || invitee.email,
            email: invitee.email,
            count: 1,
          });
        }
      }
    }
  }

  return Array.from(participantMap.values()).sort((a, b) => b.count - a.count);
}

// Filter meetings by participant
export function filterMeetingsByParticipant(
  meetings: Meeting[],
  participantEmail: string,
): Meeting[] {
  if (!participantEmail) return meetings;

  const lowerEmail = participantEmail.toLowerCase();
  return meetings.filter((m) => {
    const isOrganizer = m.organizer?.email?.toLowerCase() === lowerEmail;
    const isInvitee = m.invitees?.some(
      (i) => i.email?.toLowerCase() === lowerEmail,
    );
    return isOrganizer || isInvitee;
  });
}

// Get calendar date range
export function getCalendarDateRange(date: Date): { start: Date; end: Date } {
  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
  );
  const end = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
  );
  return { start, end };
}

// Filter meetings by specific date
export function filterMeetingsBySpecificDate(
  meetings: Meeting[],
  date: Date,
): Meeting[] {
  const { start, end } = getCalendarDateRange(date);
  return meetings.filter((m) => {
    const meetingDate = new Date(m.happenedAt);
    return meetingDate >= start && meetingDate <= end;
  });
}

// Generate deep link URL
export function generateDeepLink(meetingId: string): string {
  return `raycast://extensions/keito4/tldv/open-meeting?meetingId=${encodeURIComponent(meetingId)}`;
}

// Calculate speaker statistics
export function calculateSpeakerStats(
  transcript: { speaker: string; startTime: number; endTime: number }[],
): Map<string, number> {
  const stats = new Map<string, number>();

  for (const sentence of transcript) {
    const duration = sentence.endTime - sentence.startTime;
    const current = stats.get(sentence.speaker) || 0;
    stats.set(sentence.speaker, current + duration);
  }

  return stats;
}

// Check if online (always returns true in Raycast environment)
export function isOnline(): boolean {
  // Raycast runs in a Node.js-like environment where navigator is not available
  // Network connectivity is handled by the fetch API throwing errors
  return true;
}

// Parse page size preference
export function getPageSize(prefs: Partial<Preferences>): number {
  const size = parseInt(prefs.pageSize || "50", 10);
  return isNaN(size) ? 50 : Math.min(Math.max(size, 10), 100);
}

// Parse cache TTL preference
export function getCacheTTL(prefs: Partial<Preferences>): number {
  const ttl = parseInt(prefs.cacheTTL || "15", 10);
  return isNaN(ttl) ? 15 : Math.max(ttl, 1);
}
