import { Clipboard } from "@raycast/api";

export default function Command() {
  return (async () => {
    const text = (await Clipboard.readText()) || "";
    const languages = ["Excerpt From", "摘录来自"];
    const re = new RegExp("“([\\s\\S]+)”\\n\\n" + `(${languages.join("|")})`);
    const groups = text.match(re);
    if (groups) {
      const content = groups[1];
      Clipboard.paste(content);
    } else {
      Clipboard.paste(text);
    }
  })();
}
