import { openParachord } from "./utils";
import { confirmAlert, Alert } from "@raycast/api";

export default async function Command() {
  const confirmed = await confirmAlert({
    title: "Clear Queue",
    message: "Are you sure you want to clear the playback queue?",
    primaryAction: {
      title: "Clear",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (confirmed) {
    await openParachord("queue", ["clear"], {}, "Queue cleared");
  }
}
