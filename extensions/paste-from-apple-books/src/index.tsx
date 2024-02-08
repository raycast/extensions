import { Clipboard, popToRoot } from "@raycast/api";

export default function Command() {
  (async () => {
    const text = (await Clipboard.readText()) || "";
    const languages = ["Excerpt From", "摘录来自"];
    const re = new RegExp("“([\\s\\S]+)”\\n\\n" + `(${languages.join("|")})`);
    console.log(re);
    const groups = text.match(re);
    if (groups) {
      const content = groups[1];
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
