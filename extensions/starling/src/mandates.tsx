import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Icon,
  List,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo } from "react";
import { MissingTokenView } from "./components/MissingTokenView";
import { statusColor, statusText } from "./lib/format";
import { showStarlingErrorToast } from "./lib/errors";
import { getResolvedPreferences } from "./lib/preferences";
import { cancelMandate, getMandates, StarlingApiError } from "./lib/starling";
import { StarlingMandate } from "./lib/types";

function mandateTitle(mandate: StarlingMandate): string {
  return mandate.originatorName || mandate.reference || "Direct Debit";
}

function isMandateCancellable(mandate: StarlingMandate): boolean {
  const status = (mandate.status ?? "").toUpperCase();
  return status === "LIVE" || status === "ACTIVE";
}

function CancelMandateAction(props: { mandate: StarlingMandate; onReload: () => void }) {
  const { mandate, onReload } = props;
  if (getResolvedPreferences().useDemoData) {
    return null;
  }

  if (!isMandateCancellable(mandate)) {
    return null;
  }

  return (
    <Action
      title="Cancel Direct Debit"
      icon={Icon.XMarkCircle}
      style={Action.Style.Destructive}
      onAction={async () => {
        const confirmed = await confirmAlert({
          title: "Cancel this Direct Debit?",
          message: "This asks Starling to cancel the selected mandate.",
          icon: { source: Icon.Warning, tintColor: Color.Red },
          primaryAction: {
            title: "Cancel Direct Debit",
            style: Alert.ActionStyle.Destructive,
          },
        });

        if (!confirmed) {
          return;
        }

        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Cancelling Direct Debit",
        });

        try {
          await cancelMandate(mandate.mandateUid);
          toast.style = Toast.Style.Success;
          toast.title = "Direct Debit canceled";
          onReload();
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Could not cancel Direct Debit";
          if (error instanceof StarlingApiError && error.status === 404) {
            toast.message = "Mandate not found or already canceled. Reload the list and try again.";
          } else if (error instanceof Error) {
            toast.message = error.message;
          }
        }
      }}
    />
  );
}

function MandateDetail(props: { mandate: StarlingMandate; onReload: () => void }) {
  const { mandate, onReload } = props;
  const status = statusText(mandate.status);

  return (
    <Detail
      navigationTitle={mandateTitle(mandate)}
      markdown={[
        `# ${mandateTitle(mandate)}`,
        "",
        `**Reference:** ${mandate.reference || "No reference"}`,
        "",
        `**Status:** ${status}`,
        "",
        `**Source:** ${mandate.source || "-"}`,
      ].join("\n")}
      actions={
        <ActionPanel>
          <CancelMandateAction mandate={mandate} onReload={onReload} />
          <Action title="Reload Mandates" icon={Icon.ArrowClockwise} onAction={onReload} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function MandatesCommand() {
  const mandatesResult = useCachedPromise(getMandates, [], { keepPreviousData: true });
  const { data: mandates, isLoading, error, revalidate } = mandatesResult;

  useEffect(() => {
    if (error) {
      void showStarlingErrorToast(error, "Failed to load mandates");
    }
  }, [error]);

  const mandateGroups = useMemo(() => {
    const entries = mandates ?? [];
    return {
      live: entries.filter((mandate) => {
        const status = (mandate.status ?? "").toUpperCase();
        return status === "LIVE" || status === "ACTIVE";
      }),
      cancelled: entries.filter((mandate) => (mandate.status ?? "").toUpperCase() === "CANCELLED"),
      other: entries.filter((mandate) => {
        const status = (mandate.status ?? "").toUpperCase();
        return status !== "LIVE" && status !== "ACTIVE" && status !== "CANCELLED";
      }),
    };
  }, [mandates]);

  function renderMandateItem(mandate: StarlingMandate, itemKey: string) {
    const status = statusText(mandate.status);

    return (
      <List.Item
        key={itemKey}
        icon={Icon.List}
        title={mandateTitle(mandate)}
        subtitle={mandate.reference || "No reference"}
        keywords={[mandate.reference || "", mandate.originatorName || "", mandate.source || ""]}
        accessories={[
          {
            tag: {
              value: status,
              color: statusColor(mandate.status),
            },
          },
        ]}
        actions={
          <ActionPanel>
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={<MandateDetail mandate={mandate} onReload={revalidate} />}
            />
            <CancelMandateAction mandate={mandate} onReload={revalidate} />
            <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidate} />
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search by company name or reference">
      {mandateGroups.live.length > 0 ? (
        <List.Section title="Live Direct Debits" subtitle={String(mandateGroups.live.length)}>
          {mandateGroups.live.map((mandate, index) =>
            renderMandateItem(mandate, `live-${mandate.mandateUid || mandate.reference || "mandate"}-${index}`),
          )}
        </List.Section>
      ) : null}

      {mandateGroups.cancelled.length > 0 ? (
        <List.Section title="Canceled Direct Debits" subtitle={String(mandateGroups.cancelled.length)}>
          {mandateGroups.cancelled.map((mandate, index) =>
            renderMandateItem(mandate, `cancelled-${mandate.mandateUid || mandate.reference || "mandate"}-${index}`),
          )}
        </List.Section>
      ) : null}

      {mandateGroups.other.length > 0 ? (
        <List.Section title="Other Direct Debits" subtitle={String(mandateGroups.other.length)}>
          {mandateGroups.other.map((mandate, index) =>
            renderMandateItem(mandate, `other-${mandate.mandateUid || mandate.reference || "mandate"}-${index}`),
          )}
        </List.Section>
      ) : null}

      {!isLoading && (mandates?.length ?? 0) === 0 ? (
        <List.EmptyView title="No Direct Debits found" description="No mandates are available for this account." />
      ) : null}
    </List>
  );
}

export default function Command() {
  const preferences = getResolvedPreferences();

  if (!preferences.personalAccessToken && !preferences.useDemoData) {
    return <MissingTokenView />;
  }

  return <MandatesCommand />;
}
