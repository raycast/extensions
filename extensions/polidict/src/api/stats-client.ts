import type { RestClient } from "./rest-client";

export interface DailyTrainingRecord {
  date: string;
  sessionCount: number;
}

export interface UserStats {
  totalItems: number;
  newCount: number;
  learningCount: number;
  masteredCount: number;
  inboxCount: number;
  learningProgressPercent: number;
  dueForReviewCount?: number;
  totalTrainings: number;
  trainingsToday: number;
  trainingStreak: number;
  dailyTrainingHistory?: DailyTrainingRecord[];
}

export class StatsClient {
  constructor(private readonly restClient: RestClient) {}

  async getStats(languageCode: string): Promise<UserStats> {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return this.restClient.get<UserStats>(
      `/api/languages/${languageCode}/stats?includeDueForReview=true&timezone=${encodeURIComponent(timezone)}`,
    );
  }
}
