import { environment, updateCommandMetadata, LaunchType } from "@raycast/api";
import { syncFromLokalise, needsInitialSync } from "./api/sync-service";

export default async function Command() {
  const isBackground = environment.launchType === LaunchType.Background;

  console.log(`Background sync started (launchType: ${environment.launchType})`);

  if (!isBackground) {
    await updateCommandMetadata({
      subtitle: "Syncing translations...",
    });
  }

  try {
    const needsSync = await needsInitialSync();

    if (needsSync) {
      console.log("Skipping background sync - initial sync required");
      return;
    }

    const startTime = Date.now();
    const result = await syncFromLokalise((current, total) => {
      console.log(`Syncing: ${current} of ~${total} keys`);
    });

    const duration = Math.round((Date.now() - startTime) / 1000);

    if (result.success) {
      await updateCommandMetadata({
        subtitle: `${result.keysCount} keys synced`,
      });

      console.log(`Background sync completed successfully: ${result.keysCount} keys in ${duration}s`);
    } else {
      await updateCommandMetadata({
        subtitle: "Sync failed",
      });

      console.error(`Background sync failed:`, result.error);
    }
  } catch (error) {
    await updateCommandMetadata({
      subtitle: "Sync failed",
    });

    console.error("Background sync failed:", error);
  }
}
