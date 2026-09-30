type Entity<T> = {
  id: string;
  attributes: {
    id: number;
  } & T & {
      updated_at: string;
      created_at: string;
    };
};
export type Invoice = Entity<{
  status: string;
  currency_code: string;
  due_at: string;
}>;
export type Ticket = Entity<{
  subject: string;
  status: string;
  priority: string;
  department: string;
}>;
export type TicketMessage = Entity<{ message: string }>;
export type User = Entity<{
  first_name: string | null;
  last_name: string | null;
  email: string;
}>;
export type Result<T> = {
  data: T;
};
