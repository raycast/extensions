import { runAppleScript } from "run-applescript";
import { objc_imports, replaceAll_handler, rselect_handler, split_handler, trim_handler } from "./scripts";

/**
 * Runs the action script of a PromptLab command, providing the AI response as the `response` variable.
 *
 * The following handlers are provided:
 *  - `split(theString, theDelimiter)` - Splits text around a delimiter
 *  - `trim(theString)` - Removes leading and trailing spaces from text
 *
 * The following AppleScriptObjC frameworks are supported and automatically imported: `AVFoundation`, `CoreLocation`, `CoreMedia`, `EventKit`, `Foundation`, `LatentSemanticMapping`, `MapKit`, `PDFKit`, `Photos`, `Quartz`, `SafariServices`, `ScreenCaptureKit`, `ScreenSaver`, `SoundAnalysis`, `Speech`, `Vision`, and `Webkit`
 *
 * @param script The AppleScript script to execute.
 * @param response The PromptLab AI response.
 */
export const runActionScript = async (script: string, response: string) => {
  try {
    await runAppleScript(`${objc_imports}
    ${split_handler}
    ${trim_handler}
    ${replaceAll_handler}
    ${rselect_handler}
    set response to "${response.replaceAll('"', '\\"')}"
    ${script}`);
  } catch (error) {
    console.error(error);
  }
};
