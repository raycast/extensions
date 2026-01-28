import { pasteText, closeMainWindow } from "@raycast/api";

import { generateEmail } from "./utils";

export default async () => {
  const email = generateEmail();

  await pasteText(email);
  await closeMainWindow();
};
