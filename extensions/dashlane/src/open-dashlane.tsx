import { open, closeMainWindow } from "@raycast/api";

export default async () => {
  open("https://app.dashlane.com");
  await closeMainWindow({ clearRootSearch: true });
};
