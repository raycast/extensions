import { LocalStorage, showHUD, Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { nanoid } from "nanoid";
import fetch from "node-fetch";
import { CanvasDetails, CanvasValues, canvasURL } from "./shared";

type Args = {
  arguments: CanvasDetails;
};

export default async function Command(props: Args) {
  const { name, description } = props.arguments;
  if (await LocalStorage.getItem(name)) {
    showFailureToast(`Canvas "${name}" already exists.`);
    return;
  }
  const url = canvasURL(nanoid());
  const values: CanvasValues = { description, url };
  await Promise.all([
    LocalStorage.setItem(name, JSON.stringify(values)),
    fetch(url),
    Clipboard.copy(url),
    showHUD("Canvas URL Copied to Clipboard", { clearRootSearch: true }),
  ]).catch((error) => showFailureToast(error, { title: "Failed to create canvas" }));
}
