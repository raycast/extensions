import { List } from "@raycast/api";
import { lstatSync, readdirSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

export default function Command() {
  const downloadsDir = resolve(homedir(), "Downloads");
  const contents = readdirSync(resolve(homedir(), "Downloads"));
  const items = contents
    .map((file) => {
      const stat = lstatSync(resolve(downloadsDir, file));
      return { title: file, icon: stat.isDirectory() ? "directory.png" : "file.png", lastModifiedAt: stat.mtime };
    })
    .sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime())
    .map((info) => (
      <List.Item
        key={downloadsDir + info.title}
        title={info.title}
        icon={info.icon}
        accessories={[{ text: info.lastModifiedAt.toLocaleDateString() }]}
      />
    ));

  return <List>{items}</List>;
}
