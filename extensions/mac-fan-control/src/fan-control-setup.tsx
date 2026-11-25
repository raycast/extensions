import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  Toast,
  showToast,
} from "@raycast/api";
import { useState } from "react";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { userInfo } from "node:os";
import {
  CORE_PATH,
  SUDOERS_PATH,
  installCore,
  isCancelled,
  readInstallState,
} from "./install";
import { openCommand } from "./launch";

function markdown(ready: boolean): string {
  if (ready) {
    return [
      "# Fan Control Ready",
      "",
      "The helper is installed and the passwordless rule is in place, so every command can read and change fan speed.",
      "",
      "Reinstall to repair the helper or refresh the rule after changing your macOS user name.",
    ].join("\n");
  }
  return [
    "# Set Up Fan Control",
    "",
    "Fan speed is written through a small helper that runs as root, plus one `sudoers` rule scoped to that helper, so Raycast can change speed without a password prompt every time.",
    "",
    "Installing asks for your administrator password once — Touch ID works — and writes:",
    "",
    `| Path | What it is |
| --- | --- |
| \`${CORE_PATH}\` | The helper, owned by \`root:wheel\`, mode \`0755\` |
| \`${SUDOERS_PATH}\` | \`${userInfo().username} ALL=(root) NOPASSWD: ${CORE_PATH}\`, validated with \`visudo\` before it is written |`,
    "",
    "Nothing is downloaded: the helper ships inside the extension.",
  ].join("\n");
}

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(
    readInstallState,
    [],
    {
      onError: () => {
        // Shown in the view instead.
      },
    },
  );
  const [installing, setInstalling] = useState(false);

  const ready = Boolean(data?.installed && data?.passwordless);

  async function install() {
    setInstalling(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Installing Fan Control",
    });
    try {
      await installCore();
      await toast.hide();
      await revalidate();
      await showToast({
        style: Toast.Style.Success,
        title: "Fan Control installed",
      });
    } catch (error) {
      await toast.hide();
      if (isCancelled(error)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Installation cancelled",
        });
      } else {
        await showFailureToast(error, {
          title: "Could not install Fan Control",
        });
      }
    } finally {
      setInstalling(false);
    }
  }

  return (
    <Detail
      isLoading={isLoading || installing}
      markdown={markdown(ready)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Helper">
            <Detail.Metadata.TagList.Item
              text={data?.installed ? "Installed" : "Not installed"}
              color={data?.installed ? Color.Green : Color.Red}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Passwordless Writes">
            <Detail.Metadata.TagList.Item
              text={data?.passwordless ? "Allowed" : "Needs Setup"}
              color={data?.passwordless ? Color.Green : Color.Orange}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Helper Path" text={CORE_PATH} />
          <Detail.Metadata.Label title="Rule Path" text={SUDOERS_PATH} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title={ready ? "Reinstall Fan Control" : "Install Fan Control"}
            icon={Icon.Download}
            onAction={install}
          />
          {data?.installed ? (
            <Action
              title="Open Fan Status"
              icon={Icon.Gauge}
              shortcut={Keyboard.Shortcut.Common.Open}
              onAction={() =>
                openCommand("fan-status", "Could not open Fan Status")
              }
            />
          ) : null}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
