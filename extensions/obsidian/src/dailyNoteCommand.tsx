import { DailyNote } from "./components/DailyNote";
import { Obsidian, ObsidianTargetType } from "@/obsidian";

export default function Command() {
  return (
    <DailyNote
      actionTitle="Daily Note"
      getTarget={(vault) => Obsidian.getTarget({ type: ObsidianTargetType.DailyNote, vault })}
    />
  );
}
