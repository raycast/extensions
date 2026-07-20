export interface Item {
  id?: string;
  start: Date;
  end?: Date | null;
  notes?: string;
  mood?: string;
  fastingDuration?: number; // Duration in milliseconds
}

export interface EnhancedItem extends Item {
  progress: number;
  remainingTime: number;
  remainingHours: number;
  remainingMinutes: number;
  fastDuration?: number;
}

export interface FastingItem extends Item {
  progress: number;
  remainingTime: number;
  remainingHours: number;
  remainingMinutes: number;
}

export interface ViewProps {
  revalidate: () => Promise<EnhancedItem[]>;
}

export interface FastingViewProps extends ViewProps {
  runningFast: FastingItem;
  stopTimer: (fast: FastingItem) => Promise<void>;
  data: FastingItem[];
  isLoading: boolean;
}

export interface EatingViewProps extends ViewProps {
  data: FastingItem[] | undefined;
}

export interface EmptyViewProps extends ViewProps {
  startItem: () => Promise<void>;
}

export interface FormValues {
  startTime: Date;
  endTime?: Date;
  notes?: string;
  mood?: string;
}
