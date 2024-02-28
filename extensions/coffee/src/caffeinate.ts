import { startCaffeinate } from "./utils";

export default async () => {
  await startCaffeinate({ menubar: true, status: true }, "Your Mac is now caffeinated");
};
