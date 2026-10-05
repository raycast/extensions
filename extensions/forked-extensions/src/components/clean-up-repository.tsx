/* eslint-disable @raycast/prefer-title-case -- Keep the documented action name consistent across the UI and documentation. */
import { Action, Alert, Icon, confirmAlert } from "@raycast/api";
import { catchError } from "../errors.js";
import * as git from "../git.js";
import operation from "../operation.js";
import { formatKibibytes } from "../repository-maintenance.js";

/** Runs foreground Git maintenance for the entire managed repository. */
export default function CleanUpRepository() {
  return (
    <Action
      icon={Icon.WrenchScrewdriver}
      style={Action.Style.Destructive}
      title="Clean Up Repository"
      onAction={catchError(async () => {
        const preview = await git.prepareRepositoryCleanup();
        const packCount = new Intl.NumberFormat("en-US").format(preview.statistics.packCount);

        await confirmAlert({
          title: "Clean Up Repository",
          message: [
            `Repository: ${preview.repositoryPath}`,
            `Current storage: ${packCount} pack files using ${formatKibibytes(preview.statistics.packedSizeKiB)}.`,
            "Command: git maintenance run --task=gc",
            "This can take a long time, use significant CPU and disk space, and remove stale, unreachable Git data. Reachable objects and working-tree files are preserved.",
          ].join("\n\n"),
          primaryAction: {
            title: "Clean Up",
            style: Alert.ActionStyle.Destructive,
            onAction: catchError(async () => {
              await operation.cleanUpRepository(preview);
            }),
          },
        });
      })}
    />
  );
}
