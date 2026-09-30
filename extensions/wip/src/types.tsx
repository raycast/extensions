interface Todo {
  id: string;
  body: string;
  created_at: string;
  url: string;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  streak: number;
  best_streak: number;
  todos_count: number;
  time_zone: string;
  streaking: boolean;
  url: string;
}

interface Project {
  id: number;
  name: string;
  pitch: string;
  url: string;
  logo: {
    small: string;
    medium: string;
    large: string;
  };
}

export type { Todo, User, Project };
