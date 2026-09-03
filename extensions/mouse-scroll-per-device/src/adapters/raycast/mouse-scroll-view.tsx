import { Action, ActionPanel, Color, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { ManageMouseScroll, MouseScrollDashboard } from "../../application/manage-mouse-scroll";
import { operationMessage } from "../../application/operation-message";
import {
  ambiguousIdentityPresentation,
  helperActionPresentation,
  helperSetupPresentation,
  SetupActionKind,
} from "../../application/setup-presentation";
import { HelperStatus, MouseDevice, ScrollProfile, validateMultiplier } from "../../domain/models";

function EditProfile({
  device,
  profile,
  useCase,
  onSaved,
}: {
  device: MouseDevice;
  profile: ScrollProfile;
  useCase: ManageMouseScroll;
  onSaved: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  async function submit(values: {
    reverseVertical: boolean;
    reverseHorizontal: boolean;
    verticalMultiplier: string;
    horizontalMultiplier: string;
  }) {
    const verticalMultiplier = Number(values.verticalMultiplier);
    const horizontalMultiplier = Number(values.horizontalMultiplier);
    const error = validateMultiplier(verticalMultiplier) ?? validateMultiplier(horizontalMultiplier);
    if (error) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid multiplier", message: error });
      return;
    }
    const result = await useCase.save(device, {
      name: device.name,
      reverseVertical: values.reverseVertical,
      reverseHorizontal: values.reverseHorizontal,
      verticalMultiplier,
      horizontalMultiplier,
    });
    if (result.status !== "succeeded") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save profile",
        message: operationMessage(result),
      });
      return;
    }
    await showToast({ style: Toast.Style.Success, title: `Saved ${device.name}` });
    await onSaved();
    pop();
  }
  return (
    <Form
      navigationTitle={device.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Profile" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Checkbox
        id="reverseVertical"
        title="Vertical"
        label="Opposite macOS direction"
        defaultValue={profile.reverseVertical}
      />
      <Form.Checkbox
        id="reverseHorizontal"
        title="Horizontal"
        label="Opposite macOS direction"
        defaultValue={profile.reverseHorizontal}
      />
      <Form.TextField
        id="verticalMultiplier"
        title="Vertical Speed"
        placeholder="1.0"
        defaultValue={String(profile.verticalMultiplier)}
      />
      <Form.TextField
        id="horizontalMultiplier"
        title="Horizontal Speed"
        placeholder="1.0"
        defaultValue={String(profile.horizontalMultiplier)}
      />
      <Form.Description
        title="Range"
        text="0.1× to 10×. The helper transforms only scroll events correlated to this physical device."
      />
    </Form>
  );
}

function AmbiguousIdentityView({ device }: { device: MouseDevice }) {
  const explanation = ambiguousIdentityPresentation();
  return (
    <Form
      navigationTitle={device.name}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Device Details"
            content={`${device.name} (${device.vendorID.toString(16)}:${device.productID.toString(16)})`}
          />
        </ActionPanel>
      }
    >
      <Form.Description title={explanation.title} text={explanation.detail} />
      <Form.Description
        title="What You Can Do"
        text="Reconnect it directly, or use a mouse that reports a serial number or stable location ID."
      />
    </Form>
  );
}

function SigningGuidanceView() {
  return (
    <Form navigationTitle="Signed Helper Required">
      <Form.Description
        title="Signing Required"
        text="This build cannot enable scrolling because its bundled helper is not a verified signed release."
      />
      <Form.Description
        title="Next Step"
        text="Install or update to a verified release, then refresh status. Contact support if the issue continues."
      />
    </Form>
  );
}

export function MouseScrollView({ useCase }: { useCase: ManageMouseScroll }) {
  const [dashboard, setDashboard] = useState<MouseScrollDashboard>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    const result = await useCase.load();
    if (result.status === "succeeded") {
      setDashboard(result.value);
      setError(undefined);
    } else {
      setError(operationMessage(result));
      setDashboard(undefined);
    }
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, []);
  async function run(action: () => ReturnType<ManageMouseScroll["start"]>) {
    const result = await action();
    await showToast(
      result.status === "succeeded"
        ? { style: Toast.Style.Success, title: "Helper status updated", message: `State: ${result.value.state}` }
        : {
            style: Toast.Style.Failure,
            title: "Operation failed",
            message: operationMessage(result),
          },
    );
    await load();
  }
  async function runVoid(action: () => ReturnType<ManageMouseScroll["openInputMonitoringSettings"]>) {
    const result = await action();
    await showToast(
      result.status === "succeeded"
        ? { style: Toast.Style.Success, title: "Opened macOS Settings" }
        : { style: Toast.Style.Failure, title: "Could Not Open Settings", message: operationMessage(result) },
    );
    await load();
  }
  const helperActions = (helper?: HelperStatus) => (
    <ActionPanel.Section title="Helper Setup">
      {helperActionPresentation(helper).map((action) => {
        const icons: Record<SetupActionKind, Icon> = {
          install: Icon.Download,
          start: Icon.Play,
          repair: Icon.WrenchScrewdriver,
          requestPermissions: Icon.Lock,
          openInputMonitoring: Icon.Gear,
          openAccessibility: Icon.Gear,
          stop: Icon.Stop,
          signingGuidance: Icon.Shield,
          refresh: Icon.ArrowClockwise,
        };
        if (action.kind === "refresh") {
          return <Action key={action.kind} title={action.title} icon={icons[action.kind]} onAction={load} />;
        }
        if (action.kind === "stop") {
          return (
            <Action
              key={action.kind}
              title={action.title}
              icon={icons[action.kind]}
              onAction={() => run(() => useCase.stop())}
            />
          );
        }
        if (action.kind === "requestPermissions") {
          return (
            <Action
              key={action.kind}
              title={action.title}
              icon={icons[action.kind]}
              onAction={() => run(() => useCase.requestPermissions())}
            />
          );
        }
        if (action.kind === "install" || action.kind === "repair") {
          return (
            <Action
              key={action.kind}
              title={action.title}
              icon={icons[action.kind]}
              onAction={() => run(() => (action.kind === "repair" ? useCase.repair() : useCase.install()))}
            />
          );
        }
        if (action.kind === "openInputMonitoring" || action.kind === "openAccessibility") {
          const open =
            action.kind === "openInputMonitoring"
              ? () => useCase.openInputMonitoringSettings()
              : () => useCase.openAccessibilitySettings();
          return (
            <Action key={action.kind} title={action.title} icon={icons[action.kind]} onAction={() => runVoid(open)} />
          );
        }
        if (action.kind === "signingGuidance") {
          return (
            <Action.Push
              key={action.kind}
              title={action.title}
              icon={icons[action.kind]}
              target={<SigningGuidanceView />}
            />
          );
        }
        return (
          <Action
            key={action.kind}
            title={action.title}
            icon={icons[action.kind]}
            onAction={() => run(() => useCase.start())}
          />
        );
      })}
    </ActionPanel.Section>
  );
  return (
    <List isLoading={loading} searchBarPlaceholder="Search connected mice…">
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Mouse Helper Unavailable"
          description={error}
          actions={<ActionPanel>{helperActions()}</ActionPanel>}
        />
      ) : null}
      {dashboard ? (
        <List.Section title="Setup">
          <List.Item
            icon={Icon.Gear}
            title={helperSetupPresentation(dashboard.helper).title}
            subtitle={helperSetupPresentation(dashboard.helper).detail}
            accessories={[{ tag: helperSetupPresentation(dashboard.helper).accessory }]}
            actions={<ActionPanel>{helperActions(dashboard.helper)}</ActionPanel>}
          />
        </List.Section>
      ) : null}
      {dashboard?.devices.map(({ device, profile }) => (
        <List.Item
          key={device.key}
          icon={Icon.Mouse}
          title={device.name}
          subtitle={`${device.vendorID.toString(16).padStart(4, "0")}:${device.productID.toString(16).padStart(4, "0")}`}
          accessories={
            device.identityState === "ambiguous"
              ? [{ tag: { value: "Identity Ambiguous", color: Color.Orange } }]
              : [
                  { tag: profile.reverseVertical ? "Opposite macOS" : "Same as macOS" },
                  { text: `${profile.verticalMultiplier}×` },
                ]
          }
          actions={
            <ActionPanel>
              {device.identityState === "stable" ? (
                <Action.Push
                  title="Change Scroll Profile"
                  icon={Icon.Gauge}
                  target={<EditProfile device={device} profile={profile} useCase={useCase} onSaved={load} />}
                />
              ) : (
                <Action.Push
                  title="Why Can't I Save a Profile?"
                  icon={Icon.QuestionMark}
                  target={<AmbiguousIdentityView device={device} />}
                />
              )}
              {helperActions(dashboard?.helper)}
            </ActionPanel>
          }
        />
      ))}
      {!loading && !error && dashboard?.devices.length === 0 ? (
        <List.Item
          icon={Icon.Mouse}
          title="No Mice Detected"
          subtitle="Connect a mouse, then refresh status. Saved profiles are only available for stable device identities."
          actions={<ActionPanel>{helperActions(dashboard?.helper)}</ActionPanel>}
        />
      ) : null}
    </List>
  );
}
