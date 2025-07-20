import { registerManager } from "./utils/registerManager";

export default async function Command() {
  await registerManager.switchToRegister(2);
}
