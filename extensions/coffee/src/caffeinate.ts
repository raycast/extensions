import { startCaffeinate, changeIsManuallyDecafed } from "./utils";

export default async () => {
  changeIsManuallyDecafed("caffeinate");
  await startCaffeinate({ menubar: true, status: true }, "Your Mac is now caffeinated");
};
