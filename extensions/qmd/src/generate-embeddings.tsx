import { showToast, Toast } from "@raycast/api";
import { qmdLogger } from "./utils/logger";
import { runEmbed } from "./utils/qmd";

export default async function Command() {
  qmdLogger.info("Starting embedding generation");

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Generating embeddings...",
    message: "This may take a while for large collections",
  });

  const result = await runEmbed();

  qmdLogger.info("Embedding result", {
    success: result.success,
    error: result.error,
    stderr: result.stderr,
    output: result.data?.slice(0, 500),
  });

  if (result.hint?.type === "sqlite_vec_unavailable") {
    toast.style = Toast.Style.Failure;
    toast.title = "Vector search unavailable";
    toast.message =
      "sqlite-vec failed to load. Reinstall qmd with npm (npm install -g @tobilu/qmd) for vector search support on macOS.";
  } else if (result.success) {
    const output = result.data || "";
    toast.style = Toast.Style.Success;

    if (output.includes("already have embeddings")) {
      toast.title = "Embeddings up-to-date";
      toast.message = "All content hashes already have embeddings";
    } else {
      toast.title = "Embeddings generated";
      toast.message = "Semantic search is ready";
    }
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = "Embedding failed";
    toast.message = result.error || "Unknown error";
  }
}
