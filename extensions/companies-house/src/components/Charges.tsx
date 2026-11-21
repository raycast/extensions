import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { getCharges } from "../api";
import { PAGE_SIZE, WEB_BASE } from "../constants";
import { formatDate } from "../helpers";
import type { ChargeItem } from "../types";

function chargeStatusLabel(status?: string): string | undefined {
  if (!status) return undefined;
  return status.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function chargeStatusColor(status?: string): Color {
  switch (status) {
    case "satisfied":
    case "fully-satisfied":
      return Color.Green;
    case "part-satisfied":
      return Color.Yellow;
    case "outstanding":
      return Color.Orange;
    default:
      return Color.SecondaryText;
  }
}

export function Charges({
  companyNumber,
  companyName,
}: {
  companyNumber: string;
  companyName?: string;
}) {
  // Charges are paginated by the API and a company can carry hundreds of them.
  // Loading only the first page showed a partial list with nothing to say so,
  // which is how a satisfied charge can look like the whole picture.
  const { isLoading, data, pagination } = useCachedPromise(
    (company: string) =>
      async ({ page }: { page: number }) => {
        const res = await getCharges(company, page * PAGE_SIZE);
        const items = res?.items ?? [];
        const total = res?.total_count ?? 0;
        return {
          data: items,
          hasMore: (page + 1) * PAGE_SIZE < total,
        };
      },
    [companyNumber],
    { keepPreviousData: true },
  );

  const chargesUrl = `${WEB_BASE}/company/${encodeURIComponent(companyNumber)}/charges`;
  const charges = data ?? [];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      pagination={pagination}
      navigationTitle={companyName ? `${companyName} — Charges` : "Charges"}
      searchBarPlaceholder="Filter charges…"
    >
      {charges.map((charge, index) => (
        <ChargeRow
          key={charge.id ?? charge.charge_code ?? index}
          charge={charge}
          chargesUrl={chargesUrl}
        />
      ))}
      <List.EmptyView
        title="No Charges Registered"
        description="Companies House holds no mortgage or charge records for this company."
        icon={Icon.Coins}
      />
    </List>
  );
}

function ChargeRow({
  charge,
  chargesUrl,
}: {
  charge: ChargeItem;
  chargesUrl: string;
}) {
  const title = charge.classification?.description ?? "Charge";
  const personsEntitled = (charge.persons_entitled ?? [])
    .map((p) => p.name)
    .filter(Boolean)
    .join(", ");

  return (
    <List.Item
      title={title}
      accessories={
        charge.status
          ? [
              {
                tag: {
                  value: chargeStatusLabel(charge.status),
                  color: chargeStatusColor(charge.status),
                },
              },
            ]
          : []
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Classification"
                text={title}
              />
              {charge.status ? (
                <List.Item.Detail.Metadata.TagList title="Status">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={chargeStatusLabel(charge.status)}
                    color={chargeStatusColor(charge.status)}
                  />
                </List.Item.Detail.Metadata.TagList>
              ) : null}
              {charge.created_on ? (
                <List.Item.Detail.Metadata.Label
                  title="Created"
                  text={formatDate(charge.created_on)}
                />
              ) : null}
              {charge.delivered_on ? (
                <List.Item.Detail.Metadata.Label
                  title="Delivered"
                  text={formatDate(charge.delivered_on)}
                />
              ) : null}
              {charge.satisfied_on ? (
                <List.Item.Detail.Metadata.Label
                  title="Satisfied"
                  text={formatDate(charge.satisfied_on)}
                />
              ) : null}
              {personsEntitled ? (
                <List.Item.Detail.Metadata.Label
                  title="Persons Entitled"
                  text={personsEntitled}
                />
              ) : null}
              {charge.particulars?.description ? (
                <List.Item.Detail.Metadata.Label
                  title="Particulars"
                  text={charge.particulars.description}
                />
              ) : null}
              {charge.particulars?.contains_floating_charge ? (
                <List.Item.Detail.Metadata.Label
                  title="Floating Charge"
                  text="Yes"
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Charges on Companies House"
            url={chargesUrl}
          />
        </ActionPanel>
      }
    />
  );
}
