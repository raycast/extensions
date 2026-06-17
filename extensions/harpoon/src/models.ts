export interface App {
  isSticky: boolean;
  name: string;
  path: string;
}

export type AppList = (App | null)[];
