import { environment, LaunchType, LocalStorage, showHUD } from "@raycast/api";
import { getOutboxItems, processOutboxQueue } from "./outbox";

export default async function Command() {
  const raw = await LocalStorage.getItem<string>("graphs-config");
  let graphsConfig: GraphsConfigMap = {};
  try {
    graphsConfig = raw ? JSON.parse(raw) : {};
  } catch {
    return;
  }

  const items = await getOutboxItems();
  const pendingCount = items.filter((i) => i.status === "pending").length;
  if (pendingCount === 0) return; // silent exit

  const result = await processOutboxQueue(graphsConfig);

  if (result.synced > 0) {
    await showHUD(`${result.synced} capture${result.synced > 1 ? "s" : ""} synced`);
  } else if (result.stillPending > 0 && environment.launchType !== LaunchType.Background) {
    await showHUD(`${result.stillPending} capture${result.stillPending > 1 ? "s" : ""} still pending`);
  }
}
