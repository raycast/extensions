import { showToast, showHUD, PopToRootType } from "@raycast/api";
import { getActiveTab } from "../lib/active-tab";
import { createMemoryFromTab } from "../lib/supermemory";
import { showFailureToast } from "@raycast/utils";
import { inferSpaceForTab } from "../lib/ai";
import { createSpaceMessage } from "../lib/utils";

export default async function Command() {
  try {
    const tab = await getActiveTab();

    if (!tab) {
      showFailureToast("No active tab found");
      return;
    }

    showHUD("Adding to Supermemory...", {
      popToRootType: PopToRootType.Immediate,
    });

    const spaces = await inferSpaceForTab(tab);

    const { error } = await createMemoryFromTab(
      tab,
      spaces.map((space) => space.uuid),
    );

    if (error) {
      if (error.status === 409 && error.statusText === "Conflict") {
        showToast({ title: "That site is already in your Supermemory!" });
        return;
      }

      showFailureToast("Something went wrong adding site to Supermemory!");
      console.error(error);
      return;
    }

    await showHUD(createSpaceMessage(spaces.map((space) => space.name)));
  } catch (error) {
    console.error(error);
    showFailureToast("Something went wrong adding site to Supermemory");
  }
}
