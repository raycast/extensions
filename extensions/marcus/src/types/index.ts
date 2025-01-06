export interface Quote {
  id: string;
  text: string;
  author: string;
  source?: string;
  tags?: string[];
}

export interface JournalEntry {
  id: string;
  date: string;
  prompt: string;
  content: string;
}

export interface LifeStats {
  birthDate: string;
  lifeExpectancy: number;
  yearsLived: number;
  estimatedYearsRemaining: number;
  daysLived: number;
  weeksLived: number;
  estimatedDaysRemaining: number;
  estimatedWeeksRemaining: number;
}
