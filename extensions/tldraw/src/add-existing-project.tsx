import { LocalStorage, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ProjectDetails, ProjectValues } from "./shared";

type Args = {
  arguments: ProjectDetails & ProjectValues;
};

export default async function Command(props: Args) {
  let { url, name, description } = props.arguments;

  // Added extra checks due to errors reporting required fields were still passed as undefined
  url = url?.trim() ?? "";
  name = name?.trim() ?? "";
  description = description?.trim();

  if (url.length === 0) {
    showFailureToast("Project URL cannot be empty.", { title: "Invalid project URL" });
    return;
  }

  if (name.length === 0) {
    showFailureToast("Project name cannot be empty.", { title: "Invalid project name" });
    return;
  }

  if (!url.startsWith("https://www.tldraw.com/")) {
    showFailureToast("Invalid project URL, must start with https://www.tldraw.com/");
    return;
  }
  if (await LocalStorage.getItem(name)) {
    showFailureToast(`Project "${name}" already exists.`);
    return;
  }
  const values: ProjectValues = { description, url };
  await Promise.all([
    LocalStorage.setItem(name, JSON.stringify(values)),
    showHUD(`Added ${name} to the project list`, { clearRootSearch: true }),
  ]).catch((error) => showFailureToast(error, { title: "Failed to create project" }));
}
