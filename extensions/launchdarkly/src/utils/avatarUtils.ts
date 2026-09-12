interface NamedMember {
  firstName?: string;
  lastName?: string;
  email?: string;
}

/** "First Last", falling back to the email and finally an empty string. */
export const getFullName = (member: NamedMember): string => {
  if (member.firstName || member.lastName) {
    return `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim();
  }
  return member.email ?? "";
};
