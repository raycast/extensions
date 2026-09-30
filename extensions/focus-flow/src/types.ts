export interface TeamData {
  messageId: string;
  webhookUrl: string;
  teamName: string;
  isCreator: boolean;
  createdAt: number;
}

export interface UserStats {
  username: string;
  totalMinutes: number;
  sessionsToday: number;
  lastStudyDate: string;
  longestSession: number;
  totalSessions: number;
}

export interface StudySession {
  startTime: number;
  endTime?: number;
  username: string;
}

export interface TeamMember {
  username: string;
  totalMinutes: number;
  isStudying: boolean;
  studyStartTime?: number;
}

export interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields: EmbedField[];
  footer: {
    text: string;
  };
  timestamp: string;
}

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}
