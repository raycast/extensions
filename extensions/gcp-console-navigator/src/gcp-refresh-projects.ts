import { refreshProjectsWithToast } from "./projects-cache";

export default async function Command() {
  await refreshProjectsWithToast();
}
