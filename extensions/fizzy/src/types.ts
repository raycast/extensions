export type Board = {
  id: string;
  name: string;
  all_access: boolean;
  created_at: string;
  url: string;
};
export type CreateBoardRequest = {
  name: string;
  auto_postpone_period: number;
};

export type Card = {
  id: string;
  number: number;
  title: string;
  status: string;
  description: string;
  description_html: string;
  image_url: string | null;
  closed: boolean;
  golden: boolean;
  last_active_at: string;
  created_at: string;
  url: string;
  board: Board;
};

export type Account = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  user: User;
};

export type Notification = {
  id: string;
  read: boolean;
  title: string;
  body: string;
  creator: User;
  card: Pick<Card, "id" | "title" | "status" | "url">;
  url: string;
};

export type User = {
  id: string;
  name: string;
  role: "owner" | "member";
  active: boolean;
  email_address: string;
  created_at: string;
  url: string;
};
export type UpdateUserRequest = {
  name?: string;
  avatar?: string;
};

export type ErrorResult =
  | {
      status: number;
      error: string;
    }
  | {
      [key: string]: string[];
    };
