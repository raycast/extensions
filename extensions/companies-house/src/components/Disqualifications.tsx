/**
 * The Companies House register of disqualified directors.
 *
 * The register keys officers by its own ids. They are not the ids used by
 * `/officers/{id}/appointments`, and the two are not interchangeable: passing
 * an appointments id to `/disqualified-officers/natural/{id}` returns 404 even
 * for someone who is genuinely disqualified. Nothing in a company's officer
 * record links to a disqualification either. So the only route from an officer
 * to this register is a search on their name, which is a match on a name and
 * not proof of identity — hence the candidate list rather than a verdict.
 */

import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import {
  getDisqualifiedOfficer,
  parseDisqualificationLink,
  searchDisqualifiedOfficers,
  type DisqualificationRegister,
} from "../api";
import { PAGE_SIZE } from "../constants";
import {
  disqualificationActLabel,
  disqualificationEndLabel,
  disqualificationReasonLabel,
  disqualificationTypeLabel,
  disqualifiedOfficerWebUrl,
  formatAddress,
  formatDate,
} from "../helpers";
import type { Disqualification, DisqualifiedOfficerSearchItem } from "../types";

export function Disqualifications({ officerName }: { officerName: string }) {
  const [searchText, setSearchText] = useState(officerName);
  // The register's own total, not the number of rows loaded so far. A search
  // that has paged in 20 of 75 matches has not found 20 matches.
  const [totalMatches, setTotalMatches] = useState<number | undefined>();

  const { isLoading, data, pagination } = useCachedPromise(
    (query: string) =>
      async ({ page }: { page: number }) => {
        if (!query.trim()) {
          setTotalMatches(undefined);
          return { data: [], hasMore: false };
        }
        const startIndex = page * PAGE_SIZE;
        const res = await searchDisqualifiedOfficers(query.trim(), startIndex);
        const items = res.items ?? [];
        const total = res.total_results ?? items.length;
        if (page === 0) setTotalMatches(res.total_results);
        return { data: items, hasMore: startIndex + items.length < total };
      },
    [searchText],
    { keepPreviousData: true },
  );

  const matches = data ?? [];
  const countLabel =
    totalMatches === undefined
      ? undefined
      : totalMatches > matches.length
        ? `${matches.length} of ${totalMatches}`
        : `${totalMatches}`;

  return (
    <List
      isLoading={isLoading}
      throttle
      pagination={pagination}
      navigationTitle="Disqualified Directors Register"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search the disqualified directors register…"
    >
      {isLoading && !matches.length ? null : matches.length ? (
        <List.Section
          title="Name Matches — Confirm the Identity Before Relying on One"
          subtitle={countLabel}
        >
          {matches.map((item, index) => (
            <MatchRow key={item.links?.self ?? index} item={item} />
          ))}
        </List.Section>
      ) : null}
      {/*
        The search box arrives pre-filled with the officer's name, so this view
        is never in the "empty search bar" state that makes Raycast suppress an
        empty view while loading. Without the isLoading branch, the first thing
        shown about a named person is "No Disqualification Recorded" — an
        affirmative negative about an individual, asserted before the register
        has been asked.
      */}
      <List.EmptyView
        title={
          !searchText.trim()
            ? "Search by Name"
            : isLoading
              ? "Searching the Register…"
              : "No Disqualification Recorded"
        }
        description={
          !searchText.trim()
            ? "The register holds officers currently subject to a disqualification order or undertaking. Type a name to search it."
            : isLoading
              ? undefined
              : "The register holds only officers currently subject to a disqualification order or undertaking, so no match is the ordinary result. It is not a confirmation that this person has never been disqualified."
        }
        icon={
          !searchText.trim()
            ? Icon.MagnifyingGlass
            : isLoading
              ? Icon.Clock
              : Icon.CheckCircle
        }
      />
    </List>
  );
}

function MatchRow({ item }: { item: DisqualifiedOfficerSearchItem }) {
  const target = parseDisqualificationLink(item.links?.self);
  const born = item.date_of_birth ? formatDate(item.date_of_birth) : undefined;

  const accessories: List.Item.Accessory[] = [];
  if (born) accessories.push({ text: `Born ${born}` });
  if (target?.register === "corporate") {
    accessories.push({
      tag: { value: "Corporate", color: Color.SecondaryText },
    });
  }

  return (
    <List.Item
      title={item.title}
      subtitle={item.address_snippet}
      icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
      accessories={accessories}
      actions={
        <ActionPanel>
          {target ? (
            <Action.Push
              title="View Disqualification"
              icon={Icon.Document}
              target={
                <DisqualificationDetail
                  register={target.register}
                  officerId={target.officerId}
                  name={item.title}
                />
              }
            />
          ) : null}
          {target ? (
            <Action.OpenInBrowser
              title="Open on Companies House"
              url={disqualifiedOfficerWebUrl(target.register, target.officerId)}
            />
          ) : null}
          <Action.CopyToClipboard
            title="Copy Name"
            content={item.title}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        </ActionPanel>
      }
    />
  );
}

function DisqualificationDetail({
  register,
  officerId,
  name,
}: {
  register: DisqualificationRegister;
  officerId: string;
  name: string;
}) {
  const { isLoading, data } = useCachedPromise(getDisqualifiedOfficer, [
    register,
    officerId,
  ]);

  const fullName =
    data?.name ??
    [data?.title, data?.forename, data?.other_forenames, data?.surname]
      .filter(Boolean)
      .join(" ");
  const heading = fullName || name;
  const disqualifications = data?.disqualifications ?? [];

  let markdown = `# ${heading}`;
  if (isLoading) {
    markdown += "\n\nReading the register…";
  } else if (!disqualifications.length) {
    markdown +=
      "\n\nNo disqualification is recorded against this entry. That is not a confirmation that the person has never been disqualified — the register holds only disqualifications currently in force.";
  } else {
    // The caveat lives on the search screen, which is one screen back by the
    // time anyone reads a record. It has to travel with the record it
    // qualifies, because this is the screen someone would act on.
    markdown +=
      "\n\n> This entry was reached by searching names. People share names, so check the date of birth and address below before treating this as the same person.";
    for (const entry of disqualifications) {
      markdown += `\n\n## ${disqualificationTypeLabel(entry.disqualification_type) ?? "Disqualification"}`;
      markdown += `\n\n${describe(entry)}`;
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={heading}
      markdown={markdown}
      metadata={
        disqualifications.length ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Name" text={heading} />
            {data?.date_of_birth ? (
              <Detail.Metadata.Label
                title="Born"
                text={formatDate(data.date_of_birth)}
              />
            ) : null}
            {data?.nationality ? (
              <Detail.Metadata.Label
                title="Nationality"
                text={data.nationality}
              />
            ) : null}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link
              title="Companies House"
              target={disqualifiedOfficerWebUrl(register, officerId)}
              text="View on Companies House"
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open on Companies House"
            url={disqualifiedOfficerWebUrl(register, officerId)}
          />
          <Action.CopyToClipboard
            title="Copy Name"
            content={heading}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        </ActionPanel>
      }
    />
  );
}

/** The body of one disqualification, as markdown bullets. */
function describe(entry: Disqualification): string {
  const reason = [
    disqualificationReasonLabel(entry.reason?.description_identifier),
    disqualificationActLabel(entry.reason?.act),
    entry.reason?.section ? `section ${entry.reason.section}` : undefined,
  ]
    .filter(Boolean)
    .join(" — ");

  const rows: [string, string | undefined][] = [
    ["From", formatDate(entry.disqualified_from)],
    ["Until", disqualificationEndLabel(entry.disqualified_until)],
    ["Reason", reason || undefined],
    ["Court", entry.court_name],
    ["Heard", formatDate(entry.heard_on)],
    ["Undertaken", formatDate(entry.undertaken_on)],
    ["Case Reference", entry.case_identifier],
    ["Address", formatAddress(entry.address)],
    ["Companies Named", entry.company_names?.join(", ")],
  ];

  return rows
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `- **${label}:** ${value}`)
    .join("\n");
}
