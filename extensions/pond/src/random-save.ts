import { closeMainWindow, open, showHUD, showToast, Toast } from "@raycast/api";
import { pond } from "./api/client";
import { toError } from "./api/problems";
import { failToast } from "./components/problem";
import { saveTitle } from "./lib/display";
import { saveLink } from "./lib/links";
import { recordOpened } from "./lib/recent";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Picking a Save" });
  try {
    const page = await pond().query({
      sortKey: "random",
      randomSeed: Math.random().toString(36).slice(2),
      limit: 1,
      include: ["saves"],
    });
    const save = page.saves?.[0];
    if (!save) {
      toast.style = Toast.Style.Failure;
      toast.title = "Your library is empty";
      toast.message = "Save something first, then try again.";
      return;
    }
    await recordOpened(save);
    await open(saveLink(save));
    await closeMainWindow();
    await showHUD(`Opened ${saveTitle(save)}`);
  } catch (error) {
    failToast(toast, toError(error), "Couldn't pick a save");
  }
}
