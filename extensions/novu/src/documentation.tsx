import { openBrowserSilently } from "./services/utils";

export default async () => {
  await openBrowserSilently("https://docs.novu.co/overview/introduction");
};
