import { useState, useEffect, useCallback } from "react";
import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  Color,
  open,
} from "@raycast/api";
import { HubSpotApiClient } from "./lib/hubspot-api";
import { HubSpotWorkflow } from "./types/hubspot";

interface Preferences {
  hubspotApiKey: string;
  hubspotPortalId: string;
}

export default function SearchWorkflows() {
  const [workflows, setWorkflows] = useState<HubSpotWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [apiClient, setApiClient] = useState<HubSpotApiClient | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [after, setAfter] = useState<string | undefined>();
  const [pageCount, setPageCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<HubSpotWorkflow[]>([]);
  const [searchProgress, setSearchProgress] = useState({
    current: 0,
    total: 0,
  });
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    if (!preferences.hubspotApiKey || !preferences.hubspotPortalId) {
      showToast({
        style: Toast.Style.Failure,
        title: "Configuration Error",
        message: "Please set your HubSpot API key and Portal ID in preferences",
      });
      setIsLoading(false);
      return;
    }

    const client = new HubSpotApiClient({
      apiKey: preferences.hubspotApiKey,
      portalId: preferences.hubspotPortalId,
    });
    setApiClient(client);
  }, [preferences.hubspotApiKey, preferences.hubspotPortalId]);

  const loadMoreWorkflows = useCallback(async () => {
    if (!apiClient || !hasMore) return;

    try {
      setIsLoading(true);
      const response = await apiClient.client.get("/automation/v4/flows", {
        params: {
          limit: 100,
          ...(after && { after }),
        },
      });

      const { results, paging } = response.data;

      if (results && Array.isArray(results)) {
        setWorkflows((prev) => [...prev, ...results]);
        setPageCount((prev) => prev + 1);
        console.log(
          `Loaded page ${pageCount + 1} with ${results.length} workflows`,
        );
      }

      if (paging && paging.next && paging.next.after) {
        setAfter(paging.next.after);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more workflows:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load workflows",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, after, hasMore, pageCount]);

  // Load initial items when component mounts
  useEffect(() => {
    if (apiClient && workflows.length === 0) {
      loadMoreWorkflows();
    }
  }, [apiClient, loadMoreWorkflows, workflows.length]);

  const searchWorkflows = useCallback(
    async (query: string) => {
      if (!apiClient || !query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        setSearchProgress({ current: 0, total: 0 });
        return;
      }

      try {
        setIsSearching(true);
        setSearchProgress({ current: 0, total: 0 });

        const allResults: HubSpotWorkflow[] = [];
        let currentAfter: string | undefined;
        let hasMore = true;
        let pageCount = 0;

        // First, search through already loaded workflows
        const localResults = workflows.filter(
          (workflow) =>
            (workflow.name || "").toLowerCase().includes(query.toLowerCase()) ||
            (workflow.uuid || "").toLowerCase().includes(query.toLowerCase()),
        );
        allResults.push(...localResults);

        // Continue searching through remaining pages
        while (hasMore) {
          pageCount++;
          setSearchProgress({ current: pageCount, total: pageCount + 1 }); // Show progress

          const response = await apiClient.client.get("/automation/v4/flows", {
            params: {
              limit: 100,
              ...(currentAfter && { after: currentAfter }),
            },
          });

          const { results, paging } = response.data;

          if (results && Array.isArray(results)) {
            const pageResults = results.filter(
              (workflow) =>
                (workflow.name || "")
                  .toLowerCase()
                  .includes(query.toLowerCase()) ||
                (workflow.uuid || "")
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            );
            allResults.push(...pageResults);
          }

          if (paging && paging.next && paging.next.after) {
            currentAfter = paging.next.after;
          } else {
            hasMore = false;
          }
        }

        setSearchResults(allResults);
      } catch (error) {
        console.error("Search error:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: "Could not search workflows",
        });
      } finally {
        setIsSearching(false);
        setSearchProgress({ current: 0, total: 0 });
      }
    },
    [apiClient, workflows],
  );

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchText.trim()) {
        searchWorkflows(searchText);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchText, searchWorkflows]);

  const displayWorkflows = (
    searchText.trim() ? searchResults : workflows
  ).filter((workflow) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return workflow.isEnabled;
    if (statusFilter === "inactive") return !workflow.isEnabled;
    return true;
  });

  const getWorkflowStatusIcon = (workflow: HubSpotWorkflow) => {
    return workflow.isEnabled ? Icon.Play : Icon.Pause;
  };

  const getWorkflowStatusColor = (workflow: HubSpotWorkflow) => {
    return workflow.isEnabled ? Color.Green : Color.SecondaryText;
  };

  const getObjectTypeName = (objectTypeId: string) => {
    const objectTypeMap: { [key: string]: string } = {
      "0-1": "Contact",
      "0-2": "Company",
      "0-3": "Deal",
      "0-4": "Ticket",
      "0-5": "Task",
      "0-6": "Call",
      "0-7": "Email",
      "0-8": "Meeting",
      "0-9": "Note",
      "0-10": "Lead",
      "0-11": "Quote",
      "0-12": "Product",
      "0-13": "Line Item",
      "0-14": "Subscription",
      "0-15": "Marketing Event",
      "0-16": "Postal Mail",
      "0-17": "Appointment",
      "0-18": "Course",
      "0-19": "Listing",
      "0-20": "Order",
      "0-21": "Service",
      "0-22": "User",
    };
    return objectTypeMap[objectTypeId] || objectTypeId;
  };

  const getObjectTypeColor = (objectTypeId: string) => {
    const colorMap: { [key: string]: Color } = {
      "0-1": Color.Blue, // Contact
      "0-2": Color.Green, // Company
      "0-3": Color.Orange, // Deal
      "0-4": Color.Red, // Ticket
      "0-5": Color.Purple, // Task
      "0-6": Color.Red, // Call
      "0-7": Color.Blue, // Email
      "0-8": Color.Yellow, // Meeting
      "0-9": Color.SecondaryText, // Note
      "0-10": Color.Red, // Lead
      "0-11": Color.Blue, // Quote
      "0-12": Color.Blue, // Product
      "0-13": Color.Green, // Line Item
      "0-14": Color.Yellow, // Subscription
      "0-15": Color.Purple, // Marketing Event
      "0-16": Color.Green, // Postal Mail
      "0-17": Color.Yellow, // Appointment
      "0-18": Color.Purple, // Course
      "0-19": Color.Blue, // Listing
      "0-20": Color.Orange, // Order
      "0-21": Color.Green, // Service
      "0-22": Color.Blue, // User
    };
    return colorMap[objectTypeId] || Color.SecondaryText; // Default gray
  };

  const openWorkflowInHubSpot = (workflow: HubSpotWorkflow) => {
    if (apiClient) {
      const url = apiClient.getWorkflowUrl(workflow.id);
      open(url);
    }
  };

  const copyWorkflowId = (workflow: HubSpotWorkflow) => {
    return workflow.id;
  };

  const copyWorkflowUuid = (workflow: HubSpotWorkflow) => {
    return workflow.uuid;
  };

  return (
    // @ts-expect-error - List component type compatibility issue
    <List
      isLoading={isLoading || isSearching}
      searchBarPlaceholder={
        isSearching
          ? `Searching batch ${searchProgress.current} of ${searchProgress.total}...`
          : "Search workflows by name or UUID..."
      }
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by status"
          value={statusFilter}
          onChange={(newValue) =>
            setStatusFilter(newValue as "all" | "active" | "inactive")
          }
        >
          <List.Dropdown.Item title="All Workflows" value="all" />
          <List.Dropdown.Item title="Active" value="active" />
          <List.Dropdown.Item title="Inactive" value="inactive" />
        </List.Dropdown>
      }
      pagination={
        searchText.trim()
          ? undefined
          : {
              onLoadMore: loadMoreWorkflows,
              hasMore: hasMore,
              pageSize: 100,
            }
      }
    >
      {displayWorkflows.map((workflow) => (
        <List.Item
          key={workflow.id}
          title={workflow.name}
          icon={{
            source: getWorkflowStatusIcon(workflow),
            tintColor: getWorkflowStatusColor(workflow),
          }}
          accessories={[
            {
              text: new Date(workflow.updatedAt).toLocaleDateString(),
              icon: Icon.Calendar,
            },
            {
              tag: {
                value: getObjectTypeName(workflow.objectTypeId),
                color: getObjectTypeColor(workflow.objectTypeId),
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Open in Hubspot"
                icon={Icon.Link}
                onAction={() => openWorkflowInHubSpot(workflow)}
              />
              <Action.CopyToClipboard
                title="Copy Workflow Id"
                content={copyWorkflowId(workflow)}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Workflow Uuid"
                content={copyWorkflowUuid(workflow)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action
                title="Refresh Workflows"
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  setWorkflows([]);
                  setAfter(undefined);
                  setHasMore(true);
                  setPageCount(0);
                  loadMoreWorkflows();
                }}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
      {isSearching && searchProgress.total > 0 && (
        <List.Item
          title={`Searching batch ${searchProgress.current} of ${searchProgress.total}...`}
          subtitle="Please wait while we search through all workflows"
          icon={Icon.Clock}
        />
      )}
    </List>
  );
}
