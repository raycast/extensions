import type { User } from "@clerk/backend";

export function primaryEmail(user: User): string {
  return (
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    "—"
  );
}

export function fullName(user: User): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || primaryEmail(user);
}
