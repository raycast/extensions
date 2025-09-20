import { MenuBarExtra } from "@raycast/api";
import { getTitle } from "./lib";

export default function Command() {
  const res = getTitle();
  return <MenuBarExtra icon={res.emoji} title={res.title} />;
}
