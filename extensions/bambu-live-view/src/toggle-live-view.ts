import { toggleLiveView } from "./lib/live-view";

export default async function Command() {
  await toggleLiveView();
}
