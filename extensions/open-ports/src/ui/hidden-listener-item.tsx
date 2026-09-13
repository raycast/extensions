import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { HiddenListener } from "../core/netstat";
import { exposureMeta } from "./presentation";
import { SHORTCUTS } from "./shortcuts";

interface Props {
  hidden: HiddenListener;
  onReload: () => void;
  onReloadAsAdmin: () => void;
  /** Render a detail panel, for the command whose list shows one. */
  withDetail?: boolean;
}

/**
 * A port that the kernel reports as listening but that `lsof` refused to attribute. Showing
 * it keeps the answer to "what is on port X?" honest even when the owner is out of reach.
 */
export function HiddenListenerItem({ hidden, onReload, onReloadAsAdmin, withDetail }: Props) {
  return (
    <List.Item
      key={hidden.id}
      icon={{ source: Icon.EyeDisabled, tintColor: Color.SecondaryText }}
      title={String(hidden.port)}
      // Attributed rows put the process name here, so this slot answers the same question.
      // The section heading already says who owns it; repeating that would waste the width.
      subtitle="Unknown process"
      keywords={[String(hidden.port), ...hidden.addresses, ...hidden.ipVersions, "hidden", "root", "administrator"]}
      accessories={
        withDetail
          ? undefined
          : [
              { text: { value: hidden.addresses.join("  "), color: Color.SecondaryText } },
              { tag: { value: hidden.ipVersions.join(" + "), color: Color.SecondaryText } },
              { text: "Reload as admin to identify" },
            ]
      }
      detail={withDetail ? <HiddenDetail hidden={hidden} /> : undefined}
      actions={
        <ActionPanel>
          <Action
            title="Reload as Administrator"
            icon={Icon.Key}
            shortcut={SHORTCUTS.reloadAsAdmin}
            onAction={onReloadAsAdmin}
          />
          <Action.CopyToClipboard title="Copy Port Number" content={String(hidden.port)} icon={Icon.Hashtag} />
          <Action.CopyToClipboard
            title="Copy Bind Address"
            content={hidden.addresses.join(", ")}
            icon={Icon.Link}
            shortcut={SHORTCUTS.copyAddress}
          />
          <Action title="Reload" icon={Icon.ArrowClockwise} shortcut={SHORTCUTS.reload} onAction={onReload} />
        </ActionPanel>
      }
    />
  );
}

function HiddenDetail({ hidden }: { hidden: HiddenListener }) {
  const exposure = exposureMeta(hidden.exposure);

  return (
    <List.Item.Detail
      markdown={[
        `## Port ${hidden.port}`,
        "",
        `Something is listening on ${hidden.addresses.map((address) => `\`${address}\``).join(", ")}, but it runs`,
        "as another user, so `lsof` will not name it for you.",
        "",
        "**Reload as Administrator** (`⌘⇧R`) re-runs the scan behind the macOS authentication dialog and",
        "identifies the process.",
      ].join("\n")}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Port" text={String(hidden.port)} icon={Icon.Hashtag} />
          <List.Item.Detail.Metadata.Label title="Process" text="Unknown" icon={Icon.QuestionMarkCircle} />
          <List.Item.Detail.Metadata.Label title="Owner" text="Another user" icon={Icon.Person} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="IP Version">
            {hidden.ipVersions.map((version) => (
              <List.Item.Detail.Metadata.TagList.Item key={version} text={version} color={Color.SecondaryText} />
            ))}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Exposure">
            <List.Item.Detail.Metadata.TagList.Item text={exposure.description} color={exposure.color} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          {hidden.addresses.map((address) => (
            <List.Item.Detail.Metadata.Label key={address} title="Bind Address" text={address} />
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
