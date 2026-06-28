export const createTwentyEmailObject = (value: string) => {
  const emails = value
    .split(",")
    .map((email: string) => email.trim())
    .filter((email) => email);
  const primaryEmail = emails[0] || "";

  return {
    primaryEmail,
    additionalEmails: emails.slice(1),
  };
};
