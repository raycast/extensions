import {
  Action,
  ActionPanel,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api"

import { type DescribedError, describeError } from "../lib/api-error"
import { pricingUrl } from "../lib/urls"
import { ConnectActions } from "./connection-actions"

export function NotConnectedEmptyView({ origin }: { origin: string }) {
  return (
    <List.EmptyView
      icon={Icon.Person}
      title="Connect your account to get started"
      description="Approve once in your browser — no key to paste."
      actions={<ConnectActions origin={origin} />}
    />
  )
}

/** One empty view for every API failure; the action follows the error's kind. */
export function ApiErrorEmptyView({
  error,
  origin,
  retry,
}: {
  error: unknown
  origin: string
  retry?: () => void
}) {
  const described = describeError(error)
  return (
    <List.EmptyView
      icon={iconFor(described)}
      title={described.title}
      description={described.message}
      actions={
        described.kind === "not-connected" ? (
          <ConnectActions origin={origin} />
        ) : (
          <ActionPanel>
            {described.kind === "upgrade" ? (
              <Action.OpenInBrowser
                title="See Plans"
                url={pricingUrl(origin)}
                icon={Icon.Star}
              />
            ) : null}
            {retry ? (
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={retry}
              />
            ) : null}
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        )
      }
    />
  )
}

function iconFor(described: DescribedError): Icon {
  switch (described.kind) {
    case "not-connected":
      return Icon.Person
    case "upgrade":
      return Icon.Star
    case "rate-limited":
      return Icon.Clock
    case "offline":
      return Icon.WifiDisabled
    default:
      return Icon.ExclamationMark
  }
}
