import { LocalStorage, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { CanvasDetails, CanvasValues } from "./shared";

type Args = {
  arguments: CanvasDetails & CanvasValues;
};

export default async function Command(props: Args) {
  const { url, name, description } = props.arguments;
  if (!url.startsWith("https://www.tldraw.com/r/")) {
    showFailureToast("Invalid canvas URL, must start with https://www.tldraw.com/r/");
    return;
  }
  if (await LocalStorage.getItem(name)) {
    showFailureToast(`Canvas "${name}" already exists.`);
    return;
  }
  const values: CanvasValues = { description, url };
  await Promise.all([
    LocalStorage.setItem(name, JSON.stringify(values)),
    showHUD(`Added ${name} to the canvas list`, { clearRootSearch: true }),
  ]).catch((error) => showFailureToast(error, { title: "Failed to create canvas" }));
}
