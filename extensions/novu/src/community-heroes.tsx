import { openBrowserSilently } from "./services/utils";

export default async () => {
  await openBrowserSilently("https://novu.co/contributors/");
};
