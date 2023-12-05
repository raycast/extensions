import { stopCaffeinate } from "./utils";

export default async () => {
  await stopCaffeinate({ menubar: true, status: true }, "Your Mac is now decaffeinated");
};
