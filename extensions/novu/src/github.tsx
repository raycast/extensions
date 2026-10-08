import { openBrowserSilently } from "./services/utils";

export default async () => {
  await openBrowserSilently("https://github.com/novuhq/novu");
};
