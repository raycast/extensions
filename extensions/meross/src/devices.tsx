import { Action, ActionPanel, Color, Icon, LaunchType, List, openExtensionPreferences, Keyboard } from "@raycast/api";
import { createDeeplink, showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { MfaRequiredError, type Target } from "./lib/meross";
import { MfaForm } from "./lib/mfa-form";
import { getSession } from "./lib/session";
import { applyPower, stateIcon, stateLabel } from "./lib/ui";

export default function Command() {
  const [mfaCode, setMfaCode] = useState<string>();

  const { data, isLoading, error, revalidate, mutate } = useCachedPromise(
    async (code?: string) => (await getSession(code)).targets(),
    [mfaCode],
    {
      keepPreviousData: true,
      onError: (err) => {
        if (!(err instanceof MfaRequiredError)) showFailureToast(err, { title: "Could not load Meross devices" });
      },
    },
  );

  if (error instanceof MfaRequiredError) {
    return <MfaForm message={error.message} onSubmit={setMfaCode} />;
  }

  async function setPower(target: Target, on: boolean) {
    try {
      const session = await getSession();
      await mutate(session.setPower(target, on), {
        optimisticUpdate: (targets) => applyPower(targets ?? [], target, on),
      });
    } catch (err) {
      await showFailureToast(err, { title: `Could not switch ${target.title}` });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Meross devices…">
      {error && !data?.length ? (
        <List.EmptyView
          icon={Icon.Plug}
          title="Could not reach Meross"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView icon={Icon.Plug} title="No devices found" />
      )}
      {data?.map((target) => (
        <List.Item
          key={target.id}
          title={target.title}
          subtitle={target.deviceType.toUpperCase()}
          icon={stateIcon(target)}
          keywords={[target.deviceName, target.deviceType]}
          accessories={[
            ...(target.ip ? [{ text: target.ip, tooltip: "Local IP address" }] : []),
            { tag: { value: stateLabel(target), color: target.on ? Color.Green : Color.SecondaryText } },
          ]}
          actions={
            <ActionPanel>
              {target.online && target.mode !== "unsupported" && (
                <ActionPanel.Section>
                  <Action
                    title={target.on ? "Turn off" : "Turn on"}
                    icon={target.on ? Icon.CircleDisabled : Icon.Power}
                    onAction={() => setPower(target, !target.on)}
                  />
                  <Action.CreateQuicklink
                    title="Create Toggle Quicklink"
                    quicklink={{
                      name: `Toggle ${target.title}`,
                      link: createDeeplink({
                        command: "switch-device",
                        launchType: LaunchType.Background,
                        arguments: { device: target.title, action: "toggle" },
                      }),
                    }}
                  />
                </ActionPanel.Section>
              )}
              <ActionPanel.Section>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
                <Action.CopyToClipboard title="Copy Device UUID" content={target.uuid} />
                {target.ip && <Action.CopyToClipboard title="Copy IP Address" content={target.ip} />}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
