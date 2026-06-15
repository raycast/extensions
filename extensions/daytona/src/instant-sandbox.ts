import { Clipboard } from "@raycast/api";
import { setSandboxCreatedToast, setToastFailure, startDaytonaAnimatedToast } from "./daytona-toast";

export default async function InstantSandboxCommand() {
  const { preferences, daytona, toast } = await startDaytonaAnimatedToast("Creating instant sandbox");

  try {
    const sandbox = await daytona.create();

    await Clipboard.copy(sandbox.id);

    setSandboxCreatedToast(toast, preferences, sandbox, `ID copied: ${sandbox.id}`);
  } catch (error) {
    setToastFailure(toast, "Instant sandbox failed", error);
  }
}
