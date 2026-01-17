export enum PriorityLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  TRIVIAL = 'TRIVIAL',
}

export interface RawTask {
  id: string;
  title: string;
  description: string;
  source: 'github' | 'linear' | 'slack';
  type: 'issue' | 'pull_request' | 'task' | 'mention' | 'direct_message';
  url: string;
  createdAt: Date;
  updatedAt: Date;
  priority: number; // Raw priority score 1-10
  metadata: Record<string, any>;
}

export interface ScoredTask extends RawTask {
  score: number; // Calculated priority score
  priorityLevel: PriorityLevel;
  factors: {
    urgency: number;
    importance: number;
    effort: number;
    dependencies: number;
    context: number;
  };
  recommendedAction: string;
  estimatedTime: number; // minutes
}

export interface DecisionGuide {
  timestamp: Date;
  topRecommendations: ScoredTask[];
  criticalCount: number;
  highPriorityCount: number;
  totalTasks: number;
  estimatedTotalTime: number;
  focusRecommendation: string;
  timeBreakdown: { [key: string]: number };
  nextActions: string[];
  availableSources: string[];
}

export interface FocusSession {
  id: string;
  startTime: Date;
  plannedDuration: number;
  focusArea?: string;
  recommendedTasks: ScoredTask[];
  distractionsBlocked: string[];
  status: 'active' | 'paused' | 'completed';
}

export interface DailyStandup {
  date: Date;
  accomplishments: string[];
  timeSpentFocused: number;
  blockers: string[];
  nextPriorities: ScoredTask[];
  health: 'on-track' | 'at-risk' | 'blocked';
}
