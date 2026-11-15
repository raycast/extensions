import { URL_SCHEME } from "./paths";
import { openGlazeUrl } from "./deeplinks";
import { newProjectUrl } from "./new-project-url";

export async function prepareNewProject(prompt: string): Promise<void> {
  await openGlazeUrl(newProjectUrl(URL_SCHEME, prompt));
}
