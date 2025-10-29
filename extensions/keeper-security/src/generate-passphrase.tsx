import { Clipboard, Detail, showToast, Toast, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { generatePassphrase } from "./api";
import { ERROR_MESSAGES, IN_PROGRESS_MESSAGES, SUCCESS_MESSAGES } from "./lib/constants";
import { Error } from "./components/Error";
import CommonActions from "./components/CommonActions";
import { isCanceledError } from "./lib/helpers";

export default function GeneratePassphrase() {
  const [passphrase, setPassphrase] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  const executeCommand = async () => {
    setError(null);
    setPassphrase("");
    setIsLoading(true);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: IN_PROGRESS_MESSAGES.GENERATING_PASSPHRASE_TITLE,
      message: IN_PROGRESS_MESSAGES.PLEASE_WAIT_A_MOMENT,
    });

    try {
      const response = await generatePassphrase();
      const responseData = response?.data?.data ?? [];

      const generatedPassphrase = responseData[0]?.password;

      if (!generatedPassphrase) {
        toast.style = Toast.Style.Failure;
        toast.title = ERROR_MESSAGES.GENERATE_PASSPHRASE_FAILED;
        toast.message = "";
        return;
      }

      setPassphrase(generatedPassphrase);
      await Clipboard.copy(generatedPassphrase, { concealed: true });

      toast.style = Toast.Style.Success;
      toast.title = SUCCESS_MESSAGES.PASSPHRASE_COPIED;
      toast.message = "";
    } catch (error: unknown) {
      if (isCanceledError(error as Error)) {
        return;
      }

      toast.hide();

      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    executeCommand();
  }, []);

  if (error) {
    return <Error error={error} />;
  }

  return (
    <Detail
      markdown={`# 24-Word Passphrase Generated

---
> ${passphrase}
`}
      actions={
        <ActionPanel>
          <Action title="Generate New" icon={Icon.RotateClockwise} onAction={executeCommand} />
          {passphrase && (
            <Action
              title="Copy Again"
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy(passphrase);
                await showToast({
                  style: Toast.Style.Success,
                  title: SUCCESS_MESSAGES.PASSPHRASE_COPIED,
                });
              }}
            />
          )}

          <CommonActions />
        </ActionPanel>
      }
      isLoading={isLoading}
    />
  );
}
