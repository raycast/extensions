import { openBrowserSilently } from "./services/utils";

export default async () => {
  await openBrowserSilently("https://platform-docs.opentargets.org");
};
