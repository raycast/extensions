import { searchUsers } from "../api/user";

type Input = {
  /** Name or email address to search for. */
  query: string;
};

export default async function tool(input: Input) {
  const query = input.query.trim();
  if (!query) {
    throw new Error("A name or email address is required");
  }

  const users = await searchUsers(query);
  return users.map((user) => ({
    id: user.id,
    name: user.displayName,
    email: user.mail ?? user.userPrincipalName,
    jobTitle: user.jobTitle,
    department: user.department,
  }));
}
