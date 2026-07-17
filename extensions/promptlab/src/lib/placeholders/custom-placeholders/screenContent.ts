import { filterString, getMenubarOwningApplication } from "../../context-utils";
import { ScriptRunner } from "../../scripts";
import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

const ScreenContentPlaceholder: Placeholder = {
  name: "screenContent",
  regex: /{{screenContent}}/g,
  apply: async () => {
    const currentApp = await getMenubarOwningApplication();
    const content = await ScriptRunner.ScreenCapture();
    const overview = filterString(
      `<Current application: ${currentApp}>\n${content.replaceAll("{{screenContent}}", "")}`,
      3000,
    );
    return { result: overview, screenContent: overview };
  },
  result_keys: ["screenContent"],
  constant: true,
  fn: async () => (await ScreenContentPlaceholder.apply("{{screenContent}}")).result,
  example: "Based on the following screenshot info, what am I looking at? {{screenContent}}",
  description: "Replaced with image vision information extracted from a screen capture of your entire display.",
  hintRepresentation: "{{screenContent}}",
  fullRepresentation: "Screen Content",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Device, PlaceholderCategory.Applications],
};

export default ScreenContentPlaceholder;
