import { List, Action, ActionPanel, getPreferenceValues } from "@raycast/api";
import React from "react";
import { DOCS } from "./data/docs";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [appFilter, setAppFilter] = React.useState<string>("all");

  const getAppIcon = (app: string) => {
    const iconMap: Record<string, string> = {
      people: "people.png",
      webhooks: "pco-logo-blue.png",
      calendar: "calendar.png",
      "check-ins": "checkins.png",
      giving: "giving.png",
      groups: "groups.png",
      publishing: "publishing.png",
      registrations: "registrations.png",
      services: "services.png",
      overview: "pco-logo-blue.png",
      "add-ons": "pco-logo-blue.png",
    };
    return iconMap[app] || "pco-logo-blue.png";
  };

  const getVersion = (app: string) => {
    switch (app) {
      case "webhooks":
        return preferences.webhooksVersion;
      case "registrations":
        return preferences.registrationsVersion;
      case "publishing":
        return preferences.publishingVersion;
      case "groups":
        return preferences.groupsVersion;
      case "api":
        return preferences.apiVersion;
      case "giving":
        return preferences.givingVersion;
      case "check-ins":
        return preferences.checkInsVersion;
      case "calendar":
        return preferences.calendarVersion;
      case "services":
        return preferences.servicesVersion;
      default:
        return preferences.peopleVersion;
    }
  };

  const filteredDocs = appFilter === "all" ? DOCS : DOCS.filter((doc) => doc.app === appFilter);

  return (
    <List
      searchBarPlaceholder="Search documentation..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by App" value={appFilter} onChange={setAppFilter}>
          <List.Dropdown.Item title="All Apps" value="all" />
          <List.Dropdown.Item title="Overview" value="overview" />
          <List.Dropdown.Item title="Add-Ons" value="add-ons" />
          <List.Dropdown.Item title="API" value="api" />
          <List.Dropdown.Item title="Calendar" value="calendar" />
          <List.Dropdown.Item title="Check-Ins" value="check-ins" />
          <List.Dropdown.Item title="Giving" value="giving" />
          <List.Dropdown.Item title="Groups" value="groups" />
          <List.Dropdown.Item title="People" value="people" />
          <List.Dropdown.Item title="Publishing" value="publishing" />
          <List.Dropdown.Item title="Registrations" value="registrations" />
          <List.Dropdown.Item title="Services" value="services" />
          <List.Dropdown.Item title="Webhooks" value="webhooks" />
        </List.Dropdown>
      }
    >
      {filteredDocs.map((doc) => {
        let url: string;
        if (doc.path) {
          // Check if path is already a full URL
          if (doc.path.startsWith("http")) {
            url = doc.path;
          } else {
            url = `https://developer.planning.center/docs/#/${doc.path}`;
          }
        } else {
          const version = getVersion(doc.app);
          url = `https://developer.planning.center/docs/#/apps/${doc.app}/${version}/vertices/${doc.vertex}`;
        }
        const allKeywords = [...(doc.keywords || []), doc.app];

        const appName = doc.app
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join("-");

        return (
          <List.Item
            key={`${doc.app}-${doc.vertex || doc.path}`}
            title={doc.title}
            subtitle={appName}
            icon={getAppIcon(doc.app)}
            keywords={allKeywords}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={url} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
