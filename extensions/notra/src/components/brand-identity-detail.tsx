import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { deleteBrandIdentity, getNotraRequestInit, NOTRA_API_URL, updateBrandIdentity } from "../lib/notra";
import type { BrandIdentity, GetBrandIdentityResponse } from "../types";
import { getErrorMessage, notraUrl } from "../utils";
import { EditBrandIdentityForm } from "./edit-brand-identity-form";

function buildMarkdown(bi: BrandIdentity): string {
  const lines: string[] = [];

  lines.push(`# ${bi.name}`);
  lines.push("");

  if (bi.companyName || bi.companyDescription) {
    lines.push("## Company");
    if (bi.companyName) {
      lines.push(`**${bi.companyName}**`);
    }
    if (bi.companyDescription) {
      lines.push("", bi.companyDescription);
    }
    lines.push("");
  }

  const hasTone = bi.toneProfile || bi.customTone;
  if (hasTone) {
    lines.push("## Tone & Voice");
    if (bi.toneProfile) {
      lines.push(`**Profile:** ${bi.toneProfile}`);
    }
    if (bi.customTone) {
      lines.push("", bi.customTone);
    }
    lines.push("");
  }

  if (bi.audience) {
    lines.push("## Audience");
    lines.push(bi.audience);
    lines.push("");
  }

  if (bi.customInstructions) {
    lines.push("## Custom Instructions");
    lines.push(bi.customInstructions);
    lines.push("");
  }

  return lines.join("\n");
}

export function BrandIdentityDetail({
  brandIdentityId,
  onMutated,
}: {
  brandIdentityId: string;
  onMutated?: () => Promise<void> | void;
}) {
  const { pop } = useNavigation();

  const { data, isLoading, revalidate } = useFetch<
    GetBrandIdentityResponse,
    BrandIdentity | null,
    BrandIdentity | null
  >(`${NOTRA_API_URL}/v1/brand-identities/${brandIdentityId}`, {
    ...getNotraRequestInit(),
    execute: Boolean(brandIdentityId),
    mapResult(result) {
      return { data: result.brandIdentity };
    },
  });

  const bi = data;

  async function handleRefresh() {
    await revalidate();
    await onMutated?.();
  }

  async function handleSetDefault() {
    if (!bi) {
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Setting as default...",
    });
    try {
      await updateBrandIdentity(bi.id, { isDefault: true });
      await handleRefresh();
      toast.style = Toast.Style.Success;
      toast.title = "Set as default brand identity";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not set as default";
      toast.message = getErrorMessage(error);
    }
  }

  async function handleDelete() {
    if (!bi) {
      return;
    }
    const confirmed = await confirmAlert({
      title: "Delete brand identity?",
      message: `This will permanently delete "${bi.name}".`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting...",
    });
    try {
      await deleteBrandIdentity(bi.id);
      await onMutated?.();
      toast.style = Toast.Style.Success;
      toast.title = "Brand identity deleted";
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not delete brand identity";
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <Detail
      actions={
        bi ? (
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<EditBrandIdentityForm brandIdentity={bi} onUpdated={handleRefresh} />}
                title="Edit Brand Identity"
              />
              {!bi.isDefault && (
                <Action
                  icon={Icon.Star}
                  onAction={handleSetDefault}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  title="Set as Default"
                />
              )}
              <Action
                icon={Icon.Trash}
                onAction={handleDelete}
                shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                style={Action.Style.Destructive}
                title="Delete Brand Identity"
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.OpenInBrowser
                icon={Icon.Globe}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                title="View on Notra"
                url={notraUrl("/settings/brand")}
              />
              <Action.OpenInBrowser title="Open Website" url={bi.websiteUrl} />
              <Action
                icon={Icon.ArrowClockwise}
                onAction={() => revalidate()}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                title="Refresh"
              />
            </ActionPanel.Section>
          </ActionPanel>
        ) : null
      }
      isLoading={isLoading}
      markdown={bi ? buildMarkdown(bi) : ""}
      metadata={
        bi ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              {bi.isDefault && <Detail.Metadata.TagList.Item color={Color.Green} text="Default" />}
              <Detail.Metadata.TagList.Item
                color={bi.toneProfile ? Color.Blue : Color.SecondaryText}
                text={bi.toneProfile ?? "No tone"}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Link target={bi.websiteUrl} text={bi.websiteUrl} title="Website" />
            {bi.companyName && <Detail.Metadata.Label text={bi.companyName} title="Company" />}
            {bi.audience && <Detail.Metadata.Label text={bi.audience} title="Audience" />}
            {bi.language && <Detail.Metadata.Label text={bi.language} title="Language" />}
            {bi.customTone && <Detail.Metadata.Label text={bi.customTone} title="Custom Tone" />}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label text={new Date(bi.createdAt).toLocaleDateString()} title="Created" />
            <Detail.Metadata.Label text={new Date(bi.updatedAt).toLocaleDateString()} title="Updated" />
          </Detail.Metadata>
        ) : null
      }
    />
  );
}
