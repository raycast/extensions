import { Action, ActionPanel, Detail as RaycastDetail, Icon, Keyboard } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect, type ComponentProps, type ComponentType } from "react";
import { formatIpLines, getCopyActions, getLocalIPv4, getPublicIPv4 } from "./ip";

// Detail supports isLoading at runtime; the current 2.x typings omit it.
type DetailProps = ComponentProps<typeof RaycastDetail> & { isLoading?: boolean };
const Detail = RaycastDetail as ComponentType<DetailProps>;

export default function Command() {
  const {
    data: local = [],
    isLoading: isLocalLoading,
    revalidate: revalidateLocal,
  } = usePromise(async () => getLocalIPv4(), []);
  const {
    data: publicIp,
    isLoading: isPublicLoading,
    error: publicError,
    revalidate: revalidatePublic,
  } = usePromise(getPublicIPv4, []);

  useEffect(() => {
    if (publicError) {
      void showFailureToast(publicError, { title: "Failed to fetch external IP" });
    }
  }, [publicError]);

  const localText = local.map((item) => item.address).join(", ");
  const copyActions = getCopyActions(localText, publicIp);
  const lines = formatIpLines(local, publicIp, isPublicLoading);
  const markdown = lines.map((line) => line.replace(/^([^:]+):/, "**$1**:")).join("\n\n");
  const isLoading = isLocalLoading || isPublicLoading;

  const refreshAction = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => {
        void revalidateLocal();
        void revalidatePublic();
      }}
    />
  );

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {!publicIp ? <ActionPanel.Section>{refreshAction}</ActionPanel.Section> : null}
          <ActionPanel.Section title="Copy">
            {copyActions.map((action) => (
              <Action.CopyToClipboard key={action.target} title={action.title} content={action.content} />
            ))}
          </ActionPanel.Section>
          {publicIp ? <ActionPanel.Section>{refreshAction}</ActionPanel.Section> : null}
        </ActionPanel>
      }
    />
  );
}
