import { Clipboard, Detail, PopToRootType, closeMainWindow, popToRoot, showHUD } from "@raycast/api";
import { setTimeout } from "timers/promises";

export default function Command() {
  (async () => {
    const text = await Clipboard.readText() || "";
    let languages = ['Excerpt From', '摘录来自'];
    let re = new RegExp('“([\\s\\S]+)”\\n\\n' + `(${languages.join("|")})`);
    console.log(re);
    let groups = text.match(re);
    if (groups) {
      let content = groups[1];
      Clipboard.paste(content);
    } else {
      Clipboard.paste(text);
    }
    popToRoot();
  })();
  // popToRoot();
  // closeMainWindow();
  // return <Detail markdown= />;
}