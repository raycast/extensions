// src/search-tickets.tsx
import { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  getPreferenceValues,
} from "@raycast/api";
import OpenProjectAPI, { WorkPackage } from "./api";

interface Preferences {
  apiUrl: string;
  apiKey: string;
}

function SearchTickets() {
  const [searchText, setSearchText] = useState("");
  const [tickets, setTickets] = useState<WorkPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [api, setApi] = useState<OpenProjectAPI | null>(null);

  useEffect(() => {
    try {
      const apiInstance = new OpenProjectAPI();
      setApi(apiInstance);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Configuration Error",
        message: "Please check your OpenProject settings",
      });
    }
  }, []);

  useEffect(() => {
    if (!api || searchText.trim().length === 0) {
      setTickets([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsLoading(true);
        const results = await api.searchWorkPackages(searchText);
        setTickets(results);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchText, api]);

  const getStatusColor = (statusName: string) => {
    switch (statusName?.toLowerCase()) {
      case "new":
      case "open":
        return Color.Blue;
      case "in progress":
      case "in development":
        return Color.Yellow;
      case "resolved":
      case "closed":
        return Color.Green;
      case "rejected":
        return Color.Red;
      default:
        return Color.SecondaryText;
    }
  };

  const getTypeIcon = (typeName: string) => {
    switch (typeName?.toLowerCase()) {
      case "bug":
        return Icon.Bug;
      case "feature":
        return Icon.Plus;
      case "task":
        return Icon.CheckCircle;
      case "support":
        return Icon.QuestionMark;
      default:
        return Icon.Document;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return "Unknown";
    }
  };

  const getBaseURL = () => {
    try {
      const preferences = getPreferenceValues<Preferences>();
      return preferences.apiUrl.replace(/\/$/, "");
    } catch {
      return "";
    }
  };

  // TypeScript Problem umgehen mit any
  const ListComponent = List as any;
  const ListItem = List.Item as any;
  const ListEmptyView = List.EmptyView as any;
  const ActionPanelComponent = ActionPanel as any;
  const OpenInBrowserAction = Action.OpenInBrowser as any;
  const CopyToClipboardAction = Action.CopyToClipboard as any;

  if (!api) {
    return (
      <ListComponent>
        <ListEmptyView
          icon={Icon.ExclamationMark}
          title="Configuration Error"
          description="Please check your OpenProject settings in Raycast preferences"
        />
      </ListComponent>
    );
  }

  const ticketItems = tickets.map((ticket) => (
    <ListItem
      key={ticket.id}
      icon={getTypeIcon(ticket.type?.name || "unknown")}
      title={`#${ticket.id} ${ticket.subject}`}
      subtitle={ticket.project?.name || "Unknown Project"}
      accessories={[
        {
          tag: {
            value: ticket.status?.name || "Unknown",
            color: getStatusColor(ticket.status?.name || ""),
          },
        },
        {
          text: formatDate(ticket.updatedAt),
        },
      ]}
      actions={
        <ActionPanelComponent>
          <OpenInBrowserAction
            title="Open in OpenProject"
            url={`${getBaseURL()}/work_packages/${ticket.id}`}
          />
          <CopyToClipboardAction
            title="Copy URL"
            content={`${getBaseURL()}/work_packages/${ticket.id}`}
          />
          <CopyToClipboardAction
            title="Copy ID"
            content={ticket.id.toString()}
          />
        </ActionPanelComponent>
      }
    />
  ));

  return (
    <ListComponent
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tickets by subject..."
      throttle={true}
    >
      {tickets.length === 0 && searchText.trim().length > 0 && !isLoading ? (
        <ListEmptyView
          icon={Icon.MagnifyingGlass}
          title="No tickets found"
          description={`No tickets found matching "${searchText}"`}
        />
      ) : (
        ticketItems
      )}
    </ListComponent>
  );
}

export default SearchTickets;
