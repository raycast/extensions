import { Clipboard, Toast, showToast } from "@raycast/api";
import { runAppleScript } from "./utils";

export default async () => {
  const directory = await Clipboard.readText();

      const script = `
      on readJSON(strJSON)
        set ca to current application
        set {x, e} to ca's NSJSONSerialization's JSONObjectWithData:((ca's NSString's stringWithString:strJSON)'s dataUsingEncoding:(ca's NSUTF8StringEncoding)) options:0 |error|:(reference)
        if x is missing value then
          error e's localizedDescription() as text
        else
          item 1 of ((ca's NSArray's arrayWithObject:x) as list)
        end if
      end readJSON

      -- start kitty if not already running
      try
        set kittyWindows to do shell script "/Applications/Kitty.app/Contents/MacOS/kitty @ --to unix:/tmp/mykitty ls"
        set kittyWindows to readJSON(kittyWindows)
      on error
        set kittyWindows to {}
      end try

      tell application "kitty" to activate

      if (count of kittyWindows) > 0 then
        do shell script "/Applications/Kitty.app/Contents/MacOS/kitty @ --to unix:/tmp/mykitty new-window --location=neighbor --new-tab --cwd=${directory}"
      else
        do shell script "/Applications/Kitty.app/Contents/MacOS/kitty --to unix:/tmp/mykitty new-window --cwd=${directory}"
      end if
`;
  try {
    const result = await runAppleScript(script);
    await showToast(Toast.Style.Success, "Done", result);
  } catch (err) {
    await showToast(Toast.Style.Failure, "Something went wrong");
  }
};
