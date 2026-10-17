import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { deeplinkFor, StoreExtension } from "../lib/catalog";

export function OpenInStoreActions({ item }: { item: StoreExtension }) {
  return (
    <>
      <Action.OpenInBrowser title="Open in Raycast Store" icon={Icon.RaycastLogoNeg} url={deeplinkFor(item)} />
      <Action.OpenInBrowser title="Open Store Page in Browser" url={item.storeUrl} />
    </>
  );
}

export function LinkActions({ item }: { item: StoreExtension }) {
  return (
    <ActionPanel.Section>
      {item.sourceUrl && <Action.OpenInBrowser title="View Source Code" icon={Icon.Code} url={item.sourceUrl} />}
      <Action.CopyToClipboard
        title="Copy Store Link"
        content={item.storeUrl}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
    </ActionPanel.Section>
  );
}
