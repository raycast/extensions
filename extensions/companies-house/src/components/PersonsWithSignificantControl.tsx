import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { getPersonsWithSignificantControl } from "../api";
import { WEB_BASE } from "../constants";
import {
  formatAddress,
  formatDate,
  formatDateOfBirth,
  pscKindLabel,
  pscNatureLabel,
  pscStatementLabel,
} from "../helpers";
import {
  explainAbsentPscs,
  explanationMarkdown,
  explanationSummary,
  type PscExplanation,
} from "../psc-explanation";
import { fetchAllPages } from "../pagination";
import type {
  CompanyViewProps,
  PscItem,
  PscResponse,
  PscStatementItem,
} from "../types";

type StatusFilter = "all" | "active" | "ceased";

export function PersonsWithSignificantControl({
  companyNumber,
  companyName,
}: CompanyViewProps) {
  const [status, setStatus] = useState<StatusFilter>("all");

  // Loaded in full so search filters across every entry, with the page budget
  // reported rather than hidden. See CompanyOfficers for the same reasoning.
  const { isLoading, data } = useCachedPromise(
    async (company: string) => {
      const { items, total, complete, firstPage } = await fetchAllPages<
        PscItem,
        PscResponse
      >((startIndex) => getPersonsWithSignificantControl(company, startIndex));

      return {
        people: items,
        total,
        activeCount: firstPage?.active_count,
        ceasedCount: firstPage?.ceased_count,
        complete,
      };
    },
    [companyNumber],
  );

  // An empty register is almost never "nothing to see". The usual causes are a
  // market-listing exemption or a statement filed in place of an entry, and
  // both live in separate resources, so they are only fetched once the list
  // comes back empty.
  const registerIsEmpty = data ? data.people.length === 0 : false;
  const { data: explanation } = useCachedPromise(
    explainAbsentPscs,
    [companyNumber],
    {
      execute: registerIsEmpty,
    },
  );

  // A ceased entry stays on the register forever, so anyone described as a
  // current controller has to be filtered on `ceased_on` first.
  const people = (data?.people ?? []).filter((psc) => {
    if (status === "active") return !psc.ceased_on;
    if (status === "ceased") return Boolean(psc.ceased_on);
    return true;
  });

  const truncated = data ? !data.complete : false;

  const pscWebUrl = `${WEB_BASE}/company/${encodeURIComponent(companyNumber)}/persons-with-significant-control`;
  const statements = [
    ...(explanation?.activeStatements ?? []),
    ...(explanation?.withdrawnStatements ?? []),
  ];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      filtering
      navigationTitle={
        companyName
          ? `${companyName} — Significant Control`
          : "Persons with Significant Control"
      }
      searchBarPlaceholder="Filter by name…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Status"
          value={status}
          onChange={(value) => setStatus(value as StatusFilter)}
        >
          <List.Dropdown.Item
            title={data?.total ? `All (${data.total})` : "All"}
            value="all"
          />
          <List.Dropdown.Item
            title={
              data?.activeCount === undefined
                ? "Active"
                : `Active (${data.activeCount})`
            }
            value="active"
          />
          <List.Dropdown.Item
            title={
              data?.ceasedCount === undefined
                ? "Ceased"
                : `Ceased (${data.ceasedCount})`
            }
            value="ceased"
          />
        </List.Dropdown>
      }
    >
      {truncated ? (
        <List.Section
          title={`Showing the first ${people.length} of ${data?.total} entries`}
        >
          {people.map((psc, index) => (
            <PscRow
              key={`${psc.name ?? "psc"}-${index}`}
              psc={psc}
              pscWebUrl={pscWebUrl}
            />
          ))}
        </List.Section>
      ) : (
        people.map((psc, index) => (
          <PscRow
            key={`${psc.name ?? "psc"}-${index}`}
            psc={psc}
            pscWebUrl={pscWebUrl}
          />
        ))
      )}
      {registerIsEmpty && explanation ? (
        <List.Section title="Why This Register Is Empty">
          <ExplanationRow explanation={explanation} pscWebUrl={pscWebUrl} />
          {statements.map((statement, index) => (
            <StatementRow
              key={statement.links?.self ?? index}
              statement={statement}
              pscWebUrl={pscWebUrl}
            />
          ))}
        </List.Section>
      ) : null}
      <List.EmptyView
        title="No Persons with Significant Control"
        description={
          status === "all"
            ? "The PSC register holds the people and entities that own or control a company. Companies House records none for this company."
            : "No entries match this filter."
        }
        icon={Icon.PersonCircle}
      />
    </List>
  );
}

function ExplanationRow({
  explanation,
  pscWebUrl,
}: {
  explanation: PscExplanation;
  pscWebUrl: string;
}) {
  const summary = explanationSummary(explanation);
  return (
    <List.Item
      title={summary}
      icon={
        explanation.unexplained
          ? { source: Icon.QuestionMark, tintColor: Color.Orange }
          : { source: Icon.Info, tintColor: Color.Blue }
      }
      detail={<List.Item.Detail markdown={explanationMarkdown(explanation)} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open on Companies House"
            url={pscWebUrl}
          />
          <Action.CopyToClipboard
            title="Copy Explanation"
            content={summary}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}

function StatementRow({
  statement,
  pscWebUrl,
}: {
  statement: PscStatementItem;
  pscWebUrl: string;
}) {
  // A withdrawn statement stays on the register, so it has to be marked as one
  // rather than read as the company's current position.
  const withdrawn = Boolean(statement.ceased_on);
  const text = pscStatementLabel(statement.statement) ?? statement.statement;

  return (
    <List.Item
      title={text}
      icon={Icon.Document}
      accessories={[
        {
          tag: {
            value: withdrawn ? "Withdrawn" : "Filed",
            color: withdrawn ? Color.SecondaryText : Color.Green,
          },
        },
      ]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Statement" text={text} />
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item
                  text={withdrawn ? "Withdrawn" : "Filed"}
                  color={withdrawn ? Color.SecondaryText : Color.Green}
                />
              </List.Item.Detail.Metadata.TagList>
              {statement.notified_on ? (
                <List.Item.Detail.Metadata.Label
                  title="Notified"
                  text={formatDate(statement.notified_on)}
                />
              ) : null}
              {statement.ceased_on ? (
                <List.Item.Detail.Metadata.Label
                  title="Withdrawn"
                  text={formatDate(statement.ceased_on)}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open on Companies House"
            url={pscWebUrl}
          />
          <Action.CopyToClipboard
            title="Copy Statement"
            content={text}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}

function PscRow({ psc, pscWebUrl }: { psc: PscItem; pscWebUrl: string }) {
  const name = psc.name ?? "Name withheld";
  const ceased = Boolean(psc.ceased_on);
  const dob = formatDateOfBirth(psc.date_of_birth);
  const address = formatAddress(psc.address);
  const identification = psc.identification;

  return (
    <List.Item
      title={name}
      subtitle={pscKindLabel(psc.kind)}
      accessories={[
        {
          icon: ceased
            ? { source: Icon.XMarkCircle, tintColor: Color.SecondaryText }
            : { source: Icon.CheckCircle, tintColor: Color.Green },
          tooltip: ceased ? "Ceased" : "Active",
        },
      ]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={name} />
              {psc.kind ? (
                <List.Item.Detail.Metadata.Label
                  title="Kind"
                  text={pscKindLabel(psc.kind)}
                />
              ) : null}
              {psc.natures_of_control?.length ? (
                <List.Item.Detail.Metadata.TagList title="Nature of Control">
                  {psc.natures_of_control.map((nature) => (
                    <List.Item.Detail.Metadata.TagList.Item
                      key={nature}
                      text={pscNatureLabel(nature)}
                    />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              ) : null}
              {psc.notified_on ? (
                <List.Item.Detail.Metadata.Label
                  title="Notified"
                  text={formatDate(psc.notified_on)}
                />
              ) : null}
              {psc.ceased_on ? (
                <List.Item.Detail.Metadata.Label
                  title="Ceased"
                  text={formatDate(psc.ceased_on)}
                />
              ) : null}
              {psc.nationality ? (
                <List.Item.Detail.Metadata.Label
                  title="Nationality"
                  text={psc.nationality}
                />
              ) : null}
              {psc.country_of_residence ? (
                <List.Item.Detail.Metadata.Label
                  title="Country of Residence"
                  text={psc.country_of_residence}
                />
              ) : null}
              {dob ? (
                <List.Item.Detail.Metadata.Label title="Born" text={dob} />
              ) : null}
              {identification?.legal_form ? (
                <List.Item.Detail.Metadata.Label
                  title="Legal Form"
                  text={identification.legal_form}
                />
              ) : null}
              {identification?.place_registered ? (
                <List.Item.Detail.Metadata.Label
                  title="Place Registered"
                  text={identification.place_registered}
                />
              ) : null}
              {identification?.registration_number ? (
                <List.Item.Detail.Metadata.Label
                  title="Registration Number"
                  text={identification.registration_number}
                />
              ) : null}
              {address ? (
                <List.Item.Detail.Metadata.Label
                  title="Address"
                  text={address}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open on Companies House"
            url={pscWebUrl}
          />
          <Action.CopyToClipboard
            title="Copy Name"
            content={name}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        </ActionPanel>
      }
    />
  );
}
