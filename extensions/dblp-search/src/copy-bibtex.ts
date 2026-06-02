import { Clipboard, showToast, Toast } from "@raycast/api";
import { getBibtex, Publication } from "./dblp";

/** Fetch the official BibTeX for a publication from DBLP and copy it to the clipboard. */
export async function copyBibtex(pub: Publication): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Fetching BibTeX…",
  });
  try {
    const bibtex = await getBibtex(pub.key);
    await Clipboard.copy(bibtex);
    toast.style = Toast.Style.Success;
    toast.title = "Copied BibTeX";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not copy BibTeX";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
