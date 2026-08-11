export interface ActiveState {
  accumulatedActiveSeconds: number;
  lastCheckTime: number;
  sessionCount: number;
  isIdle: boolean;
  shouldNotify: boolean;
  achievementTimestamp?: number;
}

export interface SessionStats {
  activeSeconds: number;
  sessionCount: number;
  isIdle: boolean;
  showAchievement: boolean;
}
