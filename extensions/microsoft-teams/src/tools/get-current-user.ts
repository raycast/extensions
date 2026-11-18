import { getCurrentUser } from "../api/user";

export default async function tool() {
  const user = await getCurrentUser();
  return {
    id: user.id,
    name: user.displayName,
    email: user.mail ?? user.userPrincipalName,
    jobTitle: user.jobTitle,
    department: user.department,
  };
}
