import { filterString, getMenubarOwningApplication } from "../../context-utils";
import { ScriptRunner } from "../../scripts";
import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

const WindowContentPlaceholder: Placeholder = {
  name: "windowContent",
  regex: /{{windowContent}}/g,
  apply: async () => {
    const currentApp = await getMenubarOwningApplication();
    const content = await ScriptRunner.ScreenCapture(true);
    const overview = filterString(
      `<Current application: ${currentApp}>\n${content.replaceAll("{{windowContent}}", "")}`,
      3000,
    );
    return { result: overview, windowContent: overview };
  },
  result_keys: ["windowContent"],
  constant: true,
  fn: async () => (await WindowContentPlaceholder.apply("{{windowContent}}")).result,
  example: "Based on the following screenshot info, what am I looking at? {{windowContent}}",
  description: "Replaced with image vision information extracted from a screen capture of the active window.",
  hintRepresentation: "{{windowContent}}",
  fullRepresentation: "Current Window Content",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Device, PlaceholderCategory.Applications],
};

export default WindowContentPlaceholder;
