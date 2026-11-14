import { getLocalProjects } from "../lib/apps";
export default async function tool() {
  return (await getLocalProjects()).map(
    ({ id, name, displayName, description }) => ({
      id,
      name: displayName || name,
      description,
    }),
  );
}
