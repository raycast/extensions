import { LocalStorage, showHUD, Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { nanoid } from "nanoid";
import fetch from "node-fetch";
import { ProjectDetails, ProjectValues, projectURL } from "./shared";

type Args = {
  arguments: ProjectDetails;
};

export default async function Command(props: Args) {
  const { name, description } = props.arguments;
  if (await LocalStorage.getItem(name)) {
    showFailureToast(`Project "${name}" already exists.`);
    return;
  }
  const url = projectURL(nanoid());
  const values: ProjectValues = { description, url };
  await Promise.all([
    LocalStorage.setItem(name, JSON.stringify(values)),
    fetch(url),
    Clipboard.copy(url),
    showHUD("Project URL Copied to Clipboard", { clearRootSearch: true }),
  ]).catch((error) => showFailureToast(error, { title: "Failed to create project" }));
}
