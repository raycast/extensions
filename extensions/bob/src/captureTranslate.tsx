import { runAppleScript } from "@raycast/utils";
import { closeMainWindow } from "@raycast/api";

const callBobWithOcr = async () => {
  const appleScript = `
    use scripting additions
    use framework "Foundation"
    on callBob(recordValue)
      set theParameter to (((current application's NSString)'s alloc)'s initWithData:((current application's NSJSONSerialization)'s dataWithJSONObject:recordValue options:1 |error|:(missing value)) encoding:4) as string
      tell application id "com.hezongyidev.Bob" to request theParameter
    end callBob

    callBob({|path|:"translate", body:{action:"snipTranslate"}})
    `;

  try {
    await closeMainWindow();

    const result = await runAppleScript(appleScript);
    console.log(result);
  } catch (error) {
    console.error("Error running AppleScript or closing Raycast window:", error);
  }
};

callBobWithOcr();
