import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { ReactNode } from "react";

export type DetailField = {
  id: string;
  label: string;
  value: string;
  icon?: Icon;
};

/**
 * Shared layout for entity detail views (users, organizations).
 * Each value field is a selectable row — pressing Enter / clicking copies the
 * full value — while the right sidebar shows the rich, read-only overview.
 */
export function FieldDetailList(props: {
  isLoading?: boolean;
  navigationTitle?: string;
  fields: DetailField[];
  markdown?: string;
  metadata?: ReactNode;
  actions?: ReactNode;
}) {
  const detail = (
    <List.Item.Detail
      markdown={props.markdown}
      metadata={props.metadata ? <List.Item.Detail.Metadata>{props.metadata}</List.Item.Detail.Metadata> : undefined}
    />
  );

  return (
    <List isLoading={props.isLoading} isShowingDetail navigationTitle={props.navigationTitle}>
      {props.fields.map((field) => (
        <List.Item
          key={field.id}
          icon={field.icon ?? Icon.Text}
          title={field.label}
          subtitle={field.value}
          detail={detail}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title={`Copy ${field.label}`} content={field.value} />
              {props.actions}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function hasEntries(obj: unknown): boolean {
  return !!obj && typeof obj === "object" && Object.keys(obj as Record<string, unknown>).length > 0;
}

/**
 * Cap how large Raycast renders a markdown image. Setting only `raycast-width`
 * keeps the avatar/logo small and lets the height scale to the image's real
 * aspect ratio — avoiding the letterbox padding a fixed square box adds.
 */
export function sizedImage(url: string, width = 128): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}raycast-width=${width}`;
}
