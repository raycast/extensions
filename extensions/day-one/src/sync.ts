import { syncWithToast } from "./lib/feedback";

export default async function Command() {
  await syncWithToast();
}
