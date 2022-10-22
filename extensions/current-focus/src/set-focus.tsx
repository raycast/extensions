import { Cache, showHUD, updateCommandMetadata } from "@raycast/api";

const cache = new Cache();

export default async function setFocus(props: { arguments: { title: string } }) {
  if (props?.arguments?.title) {
    cache.set("current-focus", props.arguments.title);
  }

  const focus = cache.get("current-focus");
  await updateCommandMetadata({ subtitle: focus });

  if (focus) {
    await showHUD(focus);
  }
}
