import { environment } from "@raycast/api";

// const jetbraindsSpecficiDirectories = [
//   'PycharmProjects',
//   'WebstormProjects',
//   'AndroidProjects',
//   'GolangProjects',
//   'IdeaProjects',
// ];
import path from "path";

export const templatesRoot = path.join(environment.assetsPath, "templates");
