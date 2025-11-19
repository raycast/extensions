import { showToast, Toast, Clipboard } from "@raycast/api";
import { generateEmail } from "../api";
import { saveEmail } from "../storage";
import { GenerateEmailOptions } from "../types";
import { TOAST_MESSAGES, ERROR_MESSAGES } from "../constants";

export async function handleQuickGenerate(): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: TOAST_MESSAGES.GENERATING,
  });

  try {
    const email = await generateEmail();
    await saveEmail(email);

    toast.style = Toast.Style.Success;
    toast.title = TOAST_MESSAGES.DONE;
    toast.message = email.address;

    await Clipboard.copy(email.address);
  } catch (error) {
    console.error(error);
    toast.style = Toast.Style.Failure;
    toast.title = ERROR_MESSAGES.EMAIL_GENERATE_FAILED;
    toast.message = error instanceof Error ? error.message : ERROR_MESSAGES.STANDARD_ERROR_MESSAGE;
  }
}

export async function handleCustomGenerate(options: GenerateEmailOptions): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: TOAST_MESSAGES.GENERATING,
  });

  try {
    const email = await generateEmail(options);
    await saveEmail(email);

    toast.style = Toast.Style.Success;
    toast.title = TOAST_MESSAGES.DONE;
    toast.message = email.address;

    await Clipboard.copy(email.address);
  } catch (error) {
    console.error(error);
    toast.style = Toast.Style.Failure;
    toast.title = ERROR_MESSAGES.EMAIL_GENERATE_FAILED;
    toast.message = error instanceof Error ? error.message : ERROR_MESSAGES.STANDARD_ERROR_MESSAGE;
  }
}
