export type Track = {
  id: string;
  title: string;
  subtitle?: string;
  audioPath: string;
  coverPath?: string;
  createdAt: number;
  durationSeconds?: number;
};
