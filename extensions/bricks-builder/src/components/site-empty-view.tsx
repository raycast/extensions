import { ActionPanel, Icon, List } from "@raycast/api";
import { ReactNode } from "react";
import { LicenseActions } from "./license-form";
import { ProLicenseError } from "../lib/license";
import { Site } from "../lib/sites";
import { AddSiteAction } from "../hooks/use-selected-site";

/** Shown by every site-based command until a site has been added. */
export function NoSitesView(props: { onSaved: (site: Site) => void }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Globe}
        title="Add a Bricks site to get started"
        description="Press ↵ to add your site URL and an application password."
        actions={
          <ActionPanel>
            <AddSiteAction onSaved={props.onSaved} />
          </ActionPanel>
        }
      />
    </List>
  );
}

/**
 * A list's empty or error state that keeps the command's site actions (reload, switch site, manage
 * sites), so a failing or empty site can still be switched or fixed.
 */
export function SiteEmptyView(props: {
  error?: Error;
  title: string;
  isLoading?: boolean;
  actions: ReactNode;
  onRetry?: () => void;
}) {
  if (props.error) return <ErrorEmptyView error={props.error} actions={props.actions} onRetry={props.onRetry} />;
  return (
    <List.EmptyView
      icon={Icon.MagnifyingGlass}
      title={props.isLoading ? "Loading…" : props.title}
      actions={<ActionPanel>{props.actions}</ActionPanel>}
    />
  );
}

/** `onRetry` reloads once a license has been added, for commands that need Bricks Raycast Pro. */
export function ErrorEmptyView(props: { error?: Error; actions?: ReactNode; onRetry?: () => void }) {
  if (!props.error) return null;
  if (props.error instanceof ProLicenseError) {
    return (
      <List.EmptyView
        icon={Icon.Lock}
        title={`Bricks Raycast Pro needed on ${props.error.site.name}`}
        description={props.error.message.replace(`${props.error.site.name}: `, "")}
        actions={
          <ActionPanel>
            <LicenseActions site={props.error.site} hasLicense={false} onChange={props.onRetry} />
            {props.actions}
          </ActionPanel>
        }
      />
    );
  }
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title="Couldn't load from your site"
      description={props.error.message}
      actions={props.actions ? <ActionPanel>{props.actions}</ActionPanel> : undefined}
    />
  );
}
