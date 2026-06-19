import { LaunchType, launchCommand, showToast, Toast } from "@raycast/api";
import { logger } from "./utils/logger";
import { runUpdate } from "./utils/qmd";

const updateLogger = logger.child("[Update]");

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Updating collections...",
    message: "Scanning for changes",
  });

  updateLogger.info("Starting update for all collections");
  const result = await runUpdate();

  if (result.success) {
    updateLogger.info("Update complete", {
      pendingEmbeddings: result.pendingEmbeddings,
    });

    if (result.pendingEmbeddings > 0) {
      toast.style = Toast.Style.Success;
      toast.title = "Collections updated";
      toast.message = `${result.pendingEmbeddings} document${result.pendingEmbeddings === 1 ? "" : "s"} need${result.pendingEmbeddings === 1 ? "s" : ""} embeddings`;
      toast.primaryAction = {
        title: "Generate Embeddings",
        onAction: async () => {
          await launchCommand({
            name: "generate-embeddings",
            type: LaunchType.UserInitiated,
          });
        },
      };
    } else {
      toast.style = Toast.Style.Success;
      toast.title = "Collections updated";
      toast.message = "All embeddings are up-to-date";
    }
  } else {
    updateLogger.error("Update failed", { error: result.error });
    toast.style = Toast.Style.Failure;
    toast.title = "Update failed";
    toast.message = result.error || "Unknown error";
  }
}
