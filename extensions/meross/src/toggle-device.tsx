import { Action, ActionPanel, Color, Icon, type LaunchProps, List, PopToRootType, showHUD } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { MfaRequiredError, type Target } from "./lib/meross";
import { MfaForm } from "./lib/mfa-form";
import { getSession } from "./lib/session";
import { applyPower, stateIcon, stateLabel } from "./lib/ui";

export default function Command(props: LaunchProps<{ arguments: Arguments.ToggleDevice }>) {
  const [mfaCode, setMfaCode] = useState<string>();
  const [searchText, setSearchText] = useState(props.arguments.device ?? "");

  const { data, isLoading, error, mutate } = useCachedPromise(
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

  const devices = (data ?? []).filter((t) => t.online && t.mode !== "unsupported");

  async function setPower(target: Target, on: boolean) {
    try {
      const session = await getSession();
      // Update the (cached) list too, so the next launch doesn't flash the old state before it reloads.
      await mutate(session.setPower(target, on), {
        optimisticUpdate: (targets) => applyPower(targets ?? [], target, on),
        shouldRevalidateAfter: false,
      });
      // Close the command entirely; otherwise reopening Raycast shows this stale instance again.
      await showHUD(`${target.title} ${on ? "on" : "off"}`, { popToRootType: PopToRootType.Immediate });
    } catch (err) {
      await showFailureToast(err, { title: `Could not switch ${target.title}` });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Select a device to toggle…"
    >
      <List.EmptyView icon={Icon.Plug} title={isLoading ? "Loading devices…" : "No online devices"} />
      {devices.map((target) => (
        <List.Item
          key={target.id}
          title={target.title}
          subtitle={target.deviceType.toUpperCase()}
          icon={stateIcon(target)}
          keywords={[target.deviceName, target.deviceType]}
          accessories={[{ tag: { value: stateLabel(target), color: target.on ? Color.Green : Color.SecondaryText } }]}
          actions={
            <ActionPanel>
              <Action title="Toggle" icon={Icon.Switch} onAction={() => setPower(target, !target.on)} />
              <Action title="Turn on" icon={Icon.Power} onAction={() => setPower(target, true)} />
              <Action title="Turn off" icon={Icon.CircleDisabled} onAction={() => setPower(target, false)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
