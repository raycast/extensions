import { Action, Clipboard, Icon, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { SENSITIVE_VALUE_PLACEHOLDER } from "@/constants";
import { useCurrentApplicationContext } from "@/context/current-application";
import { usePasswordContext } from "@/context/passwords";
import { getErrorAction } from "@/helper/error";
import { getPassword } from "@/lib/dcli";
import { VaultCredential } from "@/types/dcli";

type Props = {
  item: VaultCredential;
};

export default function PasswordActions({ item }: Props) {
  const { currentApplication } = useCurrentApplicationContext();
  const { visitItem } = usePasswordContext();

  const copyPassword = () => {
    copy(item);
    visitItem(item);
  };
  const pastePassword = () => {
    paste(item);
    visitItem(item);
  };

  return (
    <>
      <Action title="Copy Password" onAction={copyPassword} icon={Icon.Key} />
      <Action
        title={currentApplication ? `Paste Password into ${currentApplication.name}` : "Paste Password"}
        onAction={pastePassword}
        icon={Icon.Window}
      />
    </>
  );
}

async function copy(item: VaultCredential) {
  if (item.password !== SENSITIVE_VALUE_PLACEHOLDER) {
    await Clipboard.copy(item.password, { concealed: true });
    await showToast(Toast.Style.Success, "Copied password to clipboard");
    return;
  }

  const toast = await showToast(Toast.Style.Animated, "Getting password");
  try {
    const password = await getPassword(item.id);
    await Clipboard.copy(password, { concealed: true });

    toast.message = "Copied password to clipboard";
    toast.style = Toast.Style.Success;
  } catch (error) {
    await showFailureToast(error, {
      primaryAction: getErrorAction(error),
    });
  }
}

async function paste(item: VaultCredential) {
  if (item.password !== SENSITIVE_VALUE_PLACEHOLDER) {
    await Clipboard.paste(item.password);
    return;
  }

  await showToast(Toast.Style.Animated, "Getting password");
  try {
    const password = await getPassword(item.id);
    await Clipboard.paste(password);
  } catch (error) {
    await showFailureToast(error, {
      primaryAction: getErrorAction(error),
    });
  }
}
