import { getApplications } from "@raycast/api";

export async function getName() {
  const app = (await getApplications()).find((app) => app.name.includes("Fantastical"));
  if (app !== undefined) {
    return app.name;
  } else {
    return undefined;
  }
}
