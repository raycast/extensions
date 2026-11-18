import type { ChoiceType } from "./types";
import { Icon } from "@raycast/api";

export function choiceIcon(type: ChoiceType): Icon {
  switch (type) {
    case "Template":
      return Icon.NewDocument;
    case "Capture":
      return Icon.Pencil;
    case "Macro":
      return Icon.Cog;
    case "Multi":
      return Icon.Folder;
  }
}
