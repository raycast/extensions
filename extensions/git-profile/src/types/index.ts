export type Scope = "system" | "global" | "local";
export type Profile = { id: string; name: string; email: string };
export type GitProfile = { scope: Scope; name?: string | null; email?: string | null };
