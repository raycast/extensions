export interface UserPreferences {
  githubToken?: string;
  linearToken?: string;
  slackToken?: string;
  slackWorkspaceId?: string;

  // Configuration
  focusModeEnabled: boolean;
  notificationBuffering: boolean;
  checkInInterval: number; // minutes
  dailyStandupTime: string; // HH:mm format

  // Critical detectors
  criticalKeywords: string[]; // Custom keywords that trigger CRITICAL
  criticalUsers: string[]; // Users/teams that trigger CRITICAL
  criticalRepos: string[]; // Repos that trigger CRITICAL

  // Quiet hours
  quietHoursStart: string; // HH:mm
  quietHoursEnd: string; // HH:mm
}
