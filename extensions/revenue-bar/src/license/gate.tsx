import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences } from "@raycast/api";
import { ReactNode } from "react";
import { PROVIDER_LABELS, ProviderId } from "../providers/types";
import { PreferencesAction } from "../ui/components";
import { SHORTCUTS } from "../ui/shortcuts";
import { buyUrl } from "./config";
import { useLicense } from "./useLicense";

/**
 * The two license actions, as the license references do: "Buy" opens checkout (central-icons "Buy a License",
 * Icon.Cart) and "Enter License Key" opens preferences (Icon.Key, ⌘⇧L).
 */
export function LicenseActions() {
  return (
    <ActionPanel.Section title="Revenue Bar Pro">
      <Action.OpenInBrowser title="Buy Revenue Bar Pro" icon={Icon.Cart} url={buyUrl()} />
      <Action
        title="Enter License Key"
        icon={Icon.Key}
        shortcut={SHORTCUTS.license}
        onAction={openExtensionPreferences}
      />
    </ActionPanel.Section>
  );
}

/** A configured provider that the free tier does not include. */
export function LockedProviderItem(props: { provider: ProviderId }) {
  return (
    <List.Item
      icon={{ source: Icon.Lock, tintColor: Color.SecondaryText }}
      title={PROVIDER_LABELS[props.provider]}
      subtitle="Requires Revenue Bar Pro"
      accessories={[{ tag: { value: "Pro", color: Color.SecondaryText } }]}
      detail={
        <List.Item.Detail
          markdown={`## ${PROVIDER_LABELS[props.provider]}\n\nThe free version shows one provider. Revenue Bar Pro shows all of them.`}
        />
      }
      actions={
        <ActionPanel>
          <LicenseActions />
          <ActionPanel.Section>
            <PreferencesAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function LockedProviderSection(props: { locked: ProviderId[] }) {
  if (props.locked.length === 0) return null;
  return (
    <List.Section title="Revenue Bar Pro" subtitle="The free version shows one provider">
      {props.locked.map((id) => (
        <LockedProviderItem key={id} provider={id} />
      ))}
    </List.Section>
  );
}

/** Renders `children` for Pro users and an explanation with the license actions for everyone else. */
export function ProGate(props: { feature: string; navigationTitle?: string; children: ReactNode }) {
  const license = useLicense();
  if (license.isLoading && !license.isPro) {
    return <List isLoading navigationTitle={props.navigationTitle} />;
  }
  if (!license.isPro) {
    return (
      <List navigationTitle={props.navigationTitle}>
        <List.EmptyView
          icon={Icon.Lock}
          title="Revenue Bar Pro Required"
          description={`${props.feature} is part of Revenue Bar Pro, a one-time purchase. Already bought it? Enter your license key.`}
          actions={
            <ActionPanel>
              <LicenseActions />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  return <>{props.children}</>;
}
