export interface Goal {
  id: string;
  user_id: number;
  title: string;
  description: string | null;
  due_date: string;
  status: "active" | "completed" | "upcoming";
  created_at: string;
}
