import { DailyNote } from "./components/DailyNote";
import { Obsidian, ObsidianTargetType } from "@/obsidian";

export default function Command() {
  return (
    <DailyNote
      actionTitle="Previous Daily Note"
      getTarget={(vault) =>
        Obsidian.getTarget({ type: ObsidianTargetType.Command, vault, commandId: "daily-notes:goto-prev" })
      }
    />
  );
}
