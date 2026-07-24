import { capitalize } from "@/common/utils/string-utils";

export interface User {
  firstName: string;
  email: string;
}

export interface OnCallUser {
  name: string;
  color: string;
}

export function formatUserName(user: User): string {
  return `${user.firstName}`.trim() ?? user.email;
}

export function buildUserFromEmail(email: string): User {
  const firstName = capitalize(email.split("@")[0]) ?? email;

  return { firstName, email };
}
