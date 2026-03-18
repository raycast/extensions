import { openUrl } from "./helpers";

export default async function command() {
  await openUrl("http://localhost:8000/admin/", "Opened Glite Admin");
}
