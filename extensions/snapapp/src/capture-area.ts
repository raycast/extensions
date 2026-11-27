import { requireSnapApp, runCommand, startCapture } from "./snapapp";

export default async function Command() {
  await runCommand("Could not start a capture", async () => {
    const app = await requireSnapApp();
    if (app) await startCapture(app);
  });
}
