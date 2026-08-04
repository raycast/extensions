import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
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
} from "../helpers";
import type { PscItem } from "../types";

const MAX_PAGES = 10;

type StatusFilter = "all" | "active" | "ceased";

export function PersonsWithSignificantControl({
  companyNumber,
  companyName,
}: {
  companyNumber: string;
  companyName?: string;
}) {
  const [status, setStatus] = useState<StatusFilter>("all");

  const { isLoading, data } = useCachedPromise(
    async (company: string) => {
      const all: PscItem[] = [];
      let startIndex = 0;
      for (let page = 0; page < MAX_PAGES; page++) {
        const res = await getPersonsWithSignificantControl(company, startIndex);
        const items = res.items ?? [];
        all.push(...items);
        const total = res.total_results ?? all.length;
        startIndex += items.length;
        if (items.length === 0 || all.length >= total) break;
      }
      return all;
    },
    [companyNumber],
  );

  const people = (data ?? []).filter((psc) => {
    if (status === "active") return !psc.ceased_on;
    if (status === "ceased") return Boolean(psc.ceased_on);
    return true;
  });

  const pscWebUrl = `${WEB_BASE}/company/${encodeURIComponent(companyNumber)}/persons-with-significant-control`;

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
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Active" value="active" />
          <List.Dropdown.Item title="Ceased" value="ceased" />
        </List.Dropdown>
      }
    >
      {people.length ? (
        people.map((psc, index) => (
          <PscRow
            key={`${psc.name ?? "psc"}-${index}`}
            psc={psc}
            pscWebUrl={pscWebUrl}
          />
        ))
      ) : (
        <List.EmptyView
          title="No persons with significant control"
          icon={Icon.PersonCircle}
        />
      )}
    </List>
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
          <Action.CopyToClipboard title="Copy Name" content={name} />
        </ActionPanel>
      }
    />
  );
}
