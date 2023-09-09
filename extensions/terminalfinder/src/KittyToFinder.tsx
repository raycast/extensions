import { Toast, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async () => {
  const script = `
      use framework "Foundation"
      use scripting additions
      if application "kitty" is not running then
          return "Not running"
      end if

      on readJSON(strJSON)
        set ca to current application
        set {x, e} to ca's NSJSONSerialization's JSONObjectWithData:((ca's NSString's stringWithString:strJSON)'s dataUsingEncoding:(ca's NSUTF8StringEncoding)) options:0 |error|:(reference)
        if x is missing value then
          error e's localizedDescription() as text
        else
          item 1 of ((ca's NSArray's arrayWithObject:x) as list)
        end if
      end readJSON

      set kittyWindows to do shell script "/Applications/Kitty.app/Contents/MacOS/kitty @ --to unix:/tmp/mykitty ls"
      set kittyWindows to readJSON(kittyWindows)
      log kittyWindows

      set command to "open -a Finder ./"
      set CR to " \\x0d"

      do shell script "open -a kitty"
      tell application "kitty" to activate
      do shell script "/Applications/Kitty.app/Contents/MacOS/kitty @ --to unix:/tmp/mykitty send-text " & command & quoted form of CR
  `;

  try {
    const result = await runAppleScript(script);
    await showToast(Toast.Style.Success, "Done", result);
  } catch (err) {
    await showToast(Toast.Style.Failure, "Something went wrong");
  }
};
