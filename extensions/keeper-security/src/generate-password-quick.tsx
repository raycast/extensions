import { showToast, Toast, Clipboard, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { generatePassword } from "./api";
import { ERROR_MESSAGES, IN_PROGRESS_MESSAGES, SUCCESS_MESSAGES } from "./lib/constants";
import { Error } from "./components/Error";
import { isCanceledError } from "./lib/helpers";

export default function GeneratePasswordQuick() {
  const [error, setError] = useState<unknown | null>(null);

  useEffect(() => {
    const executeCommand = async () => {
      // Reset states
      setError(null);

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: IN_PROGRESS_MESSAGES.GENERATING_PASSWORD_TITLE,
        message: IN_PROGRESS_MESSAGES.PLEASE_WAIT_A_MOMENT,
      });

      try {
        const response = await generatePassword();

        const responseData = response?.data?.data ?? [];
        const generatedPassword = responseData[0]?.password;

        if (!generatedPassword) {
          toast.style = Toast.Style.Failure;
          toast.title = ERROR_MESSAGES.GENERATE_PASSWORD_FAILED;
          toast.message = "";
          return;
        }

        await Clipboard.copy(generatedPassword, { concealed: true });

        toast.style = Toast.Style.Success;
        toast.title = SUCCESS_MESSAGES.PASSWORD_COPIED;
        toast.message = "";

        popToRoot();
      } catch (error) {
        if (isCanceledError(error as Error)) {
          return;
        }

        toast.hide();

        setError(error);
      }
    };

    executeCommand();
  }, []);

  if (error) {
    return <Error error={error} />;
  }

  return null;
}
