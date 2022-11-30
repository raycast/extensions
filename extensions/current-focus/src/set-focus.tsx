import { Cache, showHUD, launchCommand, LaunchType } from "@raycast/api";

const cache = new Cache();

export default async function setFocus(props: { arguments: { title: string } }) {
  if (props?.arguments?.title) {
    cache.set("current-focus", props.arguments.title);
  }

  const focus = cache.get("current-focus");

  await launchCommand({ name: "menu-bar", type: LaunchType.Background });

  if (focus) {
    cache.set("last-reminder", Date.now().toString());
    await showHUD(focus);
  }
}
