import { openBrowserSilently } from "./services/utils";

export default async () => {
  await openBrowserSilently("https://genetics-docs.opentargets.org/");
};
