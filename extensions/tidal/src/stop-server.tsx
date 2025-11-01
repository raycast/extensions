import { stopServer } from "./lib/utils";

export default async function StopServerCommand() {
  await stopServer();
}
