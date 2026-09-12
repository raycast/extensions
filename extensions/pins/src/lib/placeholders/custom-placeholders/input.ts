import { environment } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import path from "path";
import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

/**
 * Directive/placeholder to ask the user for input via a dialog window. The placeholder will be replaced with the user's input. If the user cancels the dialog, the placeholder will be replaced with an empty string.
 */
const InputDirective: Placeholder = {
  name: "input",
  regex: /{{input( prompt=("|').*?("|'))?}}/,
  rules: [],
  apply: async (str: string) => {
    const pinsIcon = path.join(environment.assetsPath, "pins.icns");
    const prompt = str.match(/(?<=prompt=("|')).*?(?=("|'))/)?.[0] || "Input:";
    const result = (
      await runAppleScript(
        `try
        return text returned of (display dialog "${prompt}" default answer "" giving up after 60 with title "Input" with icon (POSIX file "${pinsIcon}"))
      on error
        return ""
      end try`,
        { timeout: 0 },
      )
    ).replaceAll(/({{|}})/g, "");
    return { result };
  },
  constant: false,
  fn: async (prompt?: string) => (await InputDirective.apply(`{{input prompt="${prompt}"}}`)).result,
  example: '{{input prompt="Enter your name:"}}',
  description:
    "Asks the user for input via a dialog window. The placeholder will be replaced with the user's input. If the user cancels the dialog, the placeholder will be replaced with an empty string.",
  hintRepresentation: "{{input}}",
  fullRepresentation: "Input",
  type: PlaceholderType.InteractiveDirective,
  categories: [PlaceholderCategory.Alert],
};

export default InputDirective;
