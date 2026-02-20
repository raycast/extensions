import { showToast, Toast } from "@raycast/api";
import { runEmbed } from "./utils/qmd";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Generating embeddings...",
    message: "This may take a while for large collections",
  });

  const result = await runEmbed();

  if (result.success) {
    const output = result.data || "";
    toast.style = Toast.Style.Success;

    if (output.includes("already have embeddings")) {
      toast.title = "✓ Embeddings up-to-date";
      toast.message = "All content hashes already have embeddings";
    } else {
      toast.title = "✓ Embeddings generated";
      toast.message = "Semantic search is ready";
    }
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = "Embedding failed";
    toast.message = result.error || "Unknown error";
  }
}
