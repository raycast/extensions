import { LaunchProps } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { TVCLogger } from "./logger";
import { TVCOpenSymbol } from "./tvc-open-symbol";
import { TVCSymbolArg } from "./types";

const context = "src/tvc-add-note-to-symbol.tsx";

interface TVCAddNoteToSymbolArgs extends TVCSymbolArg {
  note: string;
}

export default async function TVCAddNoteToSymbol(props: LaunchProps<{ arguments: TVCAddNoteToSymbolArgs }>) {
  TVCLogger.log("TVCAddNoteToSymbol", { ...props, context });
  TVCLogger.log("Adding note to symbol in TradingView...", { context });

  const { note } = props.arguments;
  await TVCOpenSymbol(props);

  await runAppleScript(`
  set noteText to "${note}"
  tell application "System Events"
    keystroke "n" using {option down}
    delay 1
    keystroke noteText
    keystroke return
  end tell`);

  TVCLogger.log("Note added to symbol.", { context });
}
