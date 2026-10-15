import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { getInsolvency } from "../api";
import { WEB_BASE } from "../constants";
import {
  companyStatusLabel,
  formatAddress,
  formatDate,
  insolvencyCaseTypeLabel,
  insolvencyDateTypeLabel,
  statusColor,
} from "../helpers";
import type { InsolvencyCase } from "../types";

export function Insolvency({
  companyNumber,
  companyName,
}: {
  companyNumber: string;
  companyName?: string;
}) {
  // A company that has never been subject to insolvency proceedings 404s here,
  // which the API layer resolves to `undefined`. That is an absence, not a
  // failure, so it lands in the empty view rather than an error toast.
  const { isLoading, data } = useCachedPromise(getInsolvency, [companyNumber]);

  const cases = data?.cases ?? [];
  const proceedings = data?.status ?? [];
  const insolvencyUrl = `${WEB_BASE}/company/${encodeURIComponent(companyNumber)}/insolvency`;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!isLoading && cases.length > 0}
      navigationTitle={
        companyName ? `${companyName} — Insolvency` : "Insolvency"
      }
      searchBarPlaceholder="Filter cases…"
    >
      {isLoading
        ? null
        : cases.map((insolvencyCase, index) => (
            <CaseRow
              key={`${insolvencyCase.number ?? "case"}-${index}`}
              insolvencyCase={insolvencyCase}
              proceedings={proceedings}
              insolvencyUrl={insolvencyUrl}
            />
          ))}
      <List.EmptyView
        title="No Insolvency Cases"
        description="The insolvency register holds liquidation, administration, receivership and voluntary arrangement cases. Companies House records none for this company."
        icon={Icon.Hammer}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open on Companies House"
              url={insolvencyUrl}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

function CaseRow({
  insolvencyCase,
  proceedings,
  insolvencyUrl,
}: {
  insolvencyCase: InsolvencyCase;
  proceedings: string[];
  insolvencyUrl: string;
}) {
  const type =
    insolvencyCaseTypeLabel(insolvencyCase.type) ?? "Insolvency case";
  const caseNumber =
    insolvencyCase.number === undefined
      ? undefined
      : String(insolvencyCase.number);
  const dates = insolvencyCase.dates ?? [];
  const practitioners = insolvencyCase.practitioners ?? [];
  const notes = insolvencyCase.notes ?? [];

  return (
    <List.Item
      title={type}
      subtitle={caseNumber ? `Case ${caseNumber}` : undefined}
      icon={{ source: Icon.Hammer, tintColor: Color.Orange }}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Case Type" text={type} />
              {caseNumber ? (
                <List.Item.Detail.Metadata.Label
                  title="Case Number"
                  text={caseNumber}
                />
              ) : null}
              {proceedings.length ? (
                <List.Item.Detail.Metadata.TagList title="Proceedings in Force">
                  {proceedings.map((status) => (
                    <List.Item.Detail.Metadata.TagList.Item
                      key={status}
                      text={companyStatusLabel(status) ?? status}
                      color={statusColor(status)}
                    />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              ) : null}

              {dates.length ? <List.Item.Detail.Metadata.Separator /> : null}
              {dates.map((entry, index) => (
                <List.Item.Detail.Metadata.Label
                  key={`${entry.type}-${index}`}
                  title={insolvencyDateTypeLabel(entry.type) ?? "Date"}
                  text={formatDate(entry.date) ?? "—"}
                />
              ))}

              {practitioners.length ? (
                <List.Item.Detail.Metadata.Separator />
              ) : null}
              {practitioners.map((practitioner, index) => {
                const appointed = formatDate(practitioner.appointed_on);
                const ceased = formatDate(practitioner.ceased_to_act_on);
                // A practitioner who has ceased to act stays on the case, so
                // the dates decide who is actually handling it now.
                const period = [
                  appointed ? `appointed ${appointed}` : undefined,
                  ceased ? `ceased ${ceased}` : undefined,
                ]
                  .filter(Boolean)
                  .join(", ");
                const address = formatAddress(practitioner.address);
                return (
                  <List.Item.Detail.Metadata.Label
                    key={`${practitioner.name}-${index}`}
                    title={index === 0 ? "Practitioners" : ""}
                    text={[
                      practitioner.name ?? "Name withheld",
                      period ? `(${period})` : undefined,
                      address,
                    ]
                      .filter(Boolean)
                      .join(" — ")}
                  />
                );
              })}

              {notes.length ? <List.Item.Detail.Metadata.Separator /> : null}
              {notes.map((note, index) => (
                <List.Item.Detail.Metadata.Label
                  key={`note-${index}`}
                  title={index === 0 ? "Notes" : ""}
                  text={note}
                />
              ))}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Insolvency on Companies House"
            url={insolvencyUrl}
          />
          {caseNumber ? (
            <Action.CopyToClipboard
              title="Copy Case Number"
              content={caseNumber}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
