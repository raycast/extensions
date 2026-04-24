import { LaunchProps, closeMainWindow, open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { buildNewSession } from "./lib/deeplink";
import { AppError, ErrorCode } from "./lib/errors";
import { logger } from "./lib/logger";

type Args = { input: string };

export default async function Command(props: LaunchProps<{ arguments: Args }>): Promise<void> {
  try {
    const input = props.arguments.input?.trim();
    if (!input) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, "input is required");
    }
    const url = buildNewSession({ input, send: true, window: "focused" });
    logger.info("quick-ask.send", { length: input.length });
    await open(url);
    await closeMainWindow();
    await showHUD("Sending to Craft Agents");
  } catch (err) {
    logger.error("quick-ask.failed", err);
    await showFailureToast(err, { title: "Failed to send message" });
  }
}
