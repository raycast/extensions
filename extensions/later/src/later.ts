import { closeMainWindow, showToast } from "@raycast/api";
import { Scripts, expression } from "./utils/scripts";
import { runAppleScript } from "run-applescript";
import defaultBrowser from "default-browser";
import { add_link_handler } from "./utils/handler";
import { splitter } from "./common/config";

const later = async () => {
  const regex = new RegExp(expression);
  await closeMainWindow();
  try {
    const browser = (await defaultBrowser()) ?? { name: "Google Chrome" };
    const script =
      Scripts[
        browser.name.split(" ")[0] === "Microsoft"
          ? "edge"
          : (browser.name.split(" ")[0].toLocaleLowerCase() as keyof typeof Scripts)
      ];

    const result = await runAppleScript(script);

    if (result.split(splitter)[0].match(regex)) {
      await add_link_handler(result.split(splitter)[0], result.split(splitter)[1]);

      await showToast({ title: "Added To ReadList" });
    }
    return;
  } catch (_) {
    console.log(_);
    console.log("Error running script");
  }
};

export default later;
