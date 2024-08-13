import { stopCaffeinate, changeIsManuallyDecafed } from "./utils";

export default async () => {
  changeIsManuallyDecafed("decaffeinate");
  await stopCaffeinate({ menubar: true, status: true }, "Your Mac is now decaffeinated");
};
