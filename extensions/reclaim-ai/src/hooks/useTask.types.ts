export interface CreateTaskProps {
  title: string;
  timePolicy: string;
  category: string;
  timeNeeded: number;
  durationMin: number;
  durationMax: number;
  snoozeUntil: Date;
  due: Date;
  notes: string;
  priority: string;
  onDeck: boolean;
}
