import { getPreferenceValues, LaunchProps, LocalStorage, PopToRootType, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { appendFileSync } from "fs";

export default async function Qq(props: LaunchProps<{ arguments: { note: string } }>) {
  const pereferences = getPreferenceValues();
  const filePath = pereferences.filePath;
  const text = props.arguments.note;

  try {
    const lastNoteDateTime = await LocalStorage.getItem<string>("lastNoteDateTime");
    const now = new Date();
    let contentToAppend = "";

    if (!lastNoteDateTime || now.getTime() - new Date(lastNoteDateTime).getTime() > 60 * 1000) {
      const formattedDate = now.toISOString().replace("T", " ").substring(0, 16);
      contentToAppend = `\n\n### ${formattedDate}\n\n${text}\n`;
    } else {
      contentToAppend = `\n${text}\n`;
    }

    appendFileSync(filePath, contentToAppend);
    await LocalStorage.setItem("lastNoteDateTime", now.toISOString());
    await showHUD("Note appended", {
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
  } catch (error) {
    showFailureToast(error, { title: "Failed to append note" });
  }
}
