export interface HabitStats {
  habit: {
    id: number;
    name: string;
    description: string;
    amount: number;
    color: string;
    repeatable: boolean;
    created_at: string;
    total_completions: number;
    current_streak: number;
    longest_streak: number;
    last_updated_at: string;
  };
  stats: {
    total_completions: number;
    current_streak: number;
    longest_streak: number;
    completion_rate: number;
    streak_visualization: StreakVisualization[];
  };
  tracks: {
    id: number;
    completed_date: string;
    source: string | null;
    created_at: string;
  }[];
}

interface StreakVisualization {
  date: string;
  completed: boolean;
}
