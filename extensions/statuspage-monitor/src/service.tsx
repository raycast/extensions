import { AllIncidents, Component, ComponentGroup, Incident, PageStatus, Summary } from "./lib/types";
import { useState, useEffect } from "react";
import { getAllIncidents, getSummary } from "./lib/api";
import { Action, ActionPanel, Icon, List, showToast } from "@raycast/api";
import { capitalizeFirstLetter, formatDate, groupComponents, iconForIndicator } from "./lib/util";

export default function ServiceStatusList({ id }: { id: string }) {
  const [isLoading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary>();
  const [allIncidents, setAllIncidents] = useState<AllIncidents>();
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (!summary) fetchServiceData();
  }, []);

  async function fetchServiceData() {
    setLoading(true);

    const fetchSummary = await getSummary(id).catch(() => null);
    const fetchAllIncidents = await getAllIncidents(id).catch(() => null);

    if (!fetchSummary || !fetchAllIncidents)
      return showToast({ title: "Connection Failed", message: "Failed to fetch data." });

    setSummary(fetchSummary);
    setAllIncidents(fetchAllIncidents);
    setLoading(false);
  }

  function selectionChangeHandler(id?: string) {
    setShowDetail(
      !!(id && (summary?.incidents?.find((i) => i.id === id) || allIncidents?.incidents?.find((i) => i.id === id)))
    );
  }

  const hasOngoingIncidents = !!summary?.incidents?.length;
  const hasComponents = !!summary?.components?.length;
  const groupedComponents = summary?.components && groupComponents(summary?.components);

  return (
    <List isLoading={isLoading} isShowingDetail={showDetail} onSelectionChange={selectionChangeHandler}>
      {summary && (
        <List.Item
          title={summary.page.name}
          subtitle={summary.status.description}
          icon={`https://www.google.com/s2/favicons?domain=${summary.page.url}&sz=64`}
          accessories={[
            {
              icon: iconForIndicator(summary.status.indicator),
              tooltip: capitalizeFirstLetter(summary.status.indicator),
            },
          ]}
        />
      )}
      {hasOngoingIncidents && (
        <List.Section title="Current Incidents">
          {summary?.incidents?.map((currentIncident, index) => (
            <List.Item
              key={index}
              id={currentIncident.id}
              icon={{
                tooltip: capitalizeFirstLetter(currentIncident.impact),
                value: iconForIndicator(currentIncident.impact),
              }}
              title={currentIncident.name}
              accessories={[{ text: capitalizeFirstLetter(currentIncident.status) }]}
              detail={<IncidentDetail incident={currentIncident} />}
            />
          ))}
        </List.Section>
      )}
      {hasComponents && (
        <List.Section title="Components">
          {groupedComponents?.map((component, index) => (
            <List.Item
              key={index}
              icon={{
                tooltip: capitalizeFirstLetter(component.status),
                value: iconForIndicator(component.status),
              }}
              title={component.name}
              accessories={[{ text: capitalizeFirstLetter(component.status) }]}
              actions={
                component?.components?.length && (
                  <ActionPanel>
                    <Action.Push
                      title="View Nested Components"
                      icon={Icon.ArrowRight}
                      target={<ComponentChildren parent={component as ComponentGroup} />}
                    />
                  </ActionPanel>
                )
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export function IncidentDetail({ incident }: { incident: Incident }) {
  return (
    <List.Item.Detail
      markdown={`
  # ${incident.name}
  
  ${incident.incident_updates
    .map(
      (update) =>
        `**${capitalizeFirstLetter(update.status)}** - ${update.body}  \n(${formatDate(new Date(update.created_at))})`
    )
    .join("\n\n")}
  `}
    />
  );
}

export function ComponentChildren({ parent }: { parent: ComponentGroup }) {
  return (
    <List>
      <List.Item
        icon={{
          tooltip: capitalizeFirstLetter(parent.status),
          value: iconForIndicator(parent.status),
        }}
        title={parent.name}
        accessories={[{ text: capitalizeFirstLetter(parent.status) }]}
      />
      <List.Section title="Nested Components">
        {parent.components.map((component, index) => (
          <List.Item
            key={index}
            icon={{
              tooltip: capitalizeFirstLetter(component.status),
              value: iconForIndicator(component.status),
            }}
            title={component.name}
            accessories={[{ text: capitalizeFirstLetter(component.status) }]}
          />
        ))}
      </List.Section>
    </List>
  );
}
