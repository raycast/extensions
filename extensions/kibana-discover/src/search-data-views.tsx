import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  LocalStorage,
  Form,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

interface DataView {
  number: number;
  name: string;
  title: string;
  id: string;
}

interface InstanceCache {
  instance: {
    name: string;
    url: string;
    commonFields?: string[];
  };
  dataViews: DataView[];
}

interface AllInstancesCache {
  [instanceName: string]: InstanceCache;
}

interface FieldSelection {
  [dataViewId: string]: string[];
}

interface TimeRangeSelection {
  [dataViewId: string]: string;
}

interface QuerySelection {
  [dataViewId: string]: string;
}

interface TimeRange {
  label: string;
  from: string;
  to: string;
}

const CACHE_PATH = join(
  homedir(),
  "Library/Application Support/com.raycast.macos/Extensions/kibana-discover/cache.json",
);

// Time range options
const TIME_RANGES: TimeRange[] = [
  { label: "Last 15 minutes", from: "now-15m", to: "now" },
  { label: "Last 30 minutes", from: "now-30m", to: "now" },
  { label: "Last 1 hour", from: "now-1h", to: "now" },
  { label: "Last 24 hours", from: "now-24h", to: "now" },
  { label: "Last 7 days", from: "now-7d", to: "now" },
  { label: "Today", from: "now/d", to: "now/d" },
  { label: "This week", from: "now/w", to: "now/w" },
];

const DEFAULT_TIME_RANGE = "Last 15 minutes";

// Common log fields that users might want to select
const COMMON_FIELDS = [
  "TraceId",
  "message",
  "MachineName",
  "level",
  "logger",
  "thread",
  "host.name",
  "service.name",
  "error.message",
  "http.request.method",
  "http.response.status_code",
  "user.name",
  "source",
  "tags",
];

const DEFAULT_FIELDS = ["TraceId", "message"];

function buildDiscoverURL(
  baseUrl: string,
  dataViewId: string,
  columns: string[],
  timeRange: TimeRange,
  query: string = "",
): string {
  // Build columns parameter - just join with commas, no quotes needed in columns array
  const columnsParam = columns.length > 0 ? columns.join(",") : "_source";

  // URL encode the query for Kibana
  const encodedQuery = encodeURIComponent(query);

  // Build the URL exactly matching Kibana's format
  return `${baseUrl}/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:${timeRange.from},to:${timeRange.to}))&_a=(columns:!(${columnsParam}),filters:!(),hideChart:!f,index:'${dataViewId}',interval:auto,query:(language:kuery,query:'${encodedQuery}'),sort:!(!('@timestamp',desc)))`;
}

function loadAllInstancesCaches(cachePath: string): AllInstancesCache {
  try {
    if (!existsSync(cachePath)) {
      return {};
    }
    const content = readFileSync(cachePath, "utf8");
    const parsed = JSON.parse(content);

    // Support both old single-instance format and new multi-instance format
    if (parsed.instance && parsed.dataViews) {
      // Old format - convert to new format
      return {
        [parsed.instance.name]: parsed,
      };
    }

    // New format - already multi-instance
    return parsed as AllInstancesCache;
  } catch (error) {
    console.error("Error loading cache:", error);
    return {};
  }
}

function getDataViewIcon(dataViewName: string): Icon {
  const lowerName = dataViewName.toLowerCase();
  if (lowerName.includes("production") || lowerName.includes("prod")) {
    return Icon.Crown;
  }
  return Icon.Gear;
}

function SetQueryForm(props: {
  dataViewId: string;
  dataViewName: string;
  currentQuery: string;
  onSubmit: (query: string) => void;
}) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Set Search Query"
            onSubmit={(values: { query: string }) => {
              props.onSubmit(values.query);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Set search query for: ${props.dataViewName}`} />
      <Form.TextArea
        id="query"
        title="Kuery Query"
        placeholder="e.g., fedac3b17afd4b2b9a80e3aa3007b848 and nxtalsedi6688"
        defaultValue={props.currentQuery}
      />
      <Form.Description text="Use Kibana Query Language (KQL) syntax. Leave empty to show all documents." />
    </Form>
  );
}

export default function Command() {
  const [allInstancesCaches, setAllInstancesCaches] =
    useState<AllInstancesCache>({});
  const [selectedInstance, setSelectedInstance] = useState<string>("");
  const [dataViews, setDataViews] = useState<DataView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [instanceUrl, setInstanceUrl] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [instanceCommonFields, setInstanceCommonFields] =
    useState<string[]>(COMMON_FIELDS);
  const [fieldSelections, setFieldSelections] = useState<FieldSelection>({});
  const [timeRangeSelections, setTimeRangeSelections] =
    useState<TimeRangeSelection>({});
  const [querySelections, setQuerySelections] = useState<QuerySelection>({});
  const [showingDetail, setShowingDetail] = useState(true);

  useEffect(() => {
    async function loadData() {
      const caches = loadAllInstancesCaches(CACHE_PATH);

      if (Object.keys(caches).length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "No data views cached",
          message: "Please run 'Refresh Data Views' command first",
        });
        setIsLoading(false);
        return;
      }

      setAllInstancesCaches(caches);

      // Set first instance as default
      const firstInstanceName = Object.keys(caches)[0];
      setSelectedInstance(firstInstanceName);

      const firstCache = caches[firstInstanceName];
      setDataViews(firstCache.dataViews);
      setInstanceUrl(firstCache.instance.url);
      setInstanceName(firstCache.instance.name);
      setInstanceCommonFields(
        firstCache.instance.commonFields || COMMON_FIELDS,
      );

      // Load saved field selections
      const savedSelections =
        await LocalStorage.getItem<string>("field-selections");
      if (savedSelections) {
        try {
          const parsed = JSON.parse(savedSelections);
          // Clean up any selections that contain @timestamp
          const cleaned: FieldSelection = {};
          for (const [key, fields] of Object.entries(
            parsed as FieldSelection,
          )) {
            cleaned[key] = fields.filter((f) => f !== "@timestamp");
          }
          setFieldSelections(cleaned);
          await LocalStorage.setItem(
            "field-selections",
            JSON.stringify(cleaned),
          );
        } catch (error) {
          console.error("Error parsing field selections:", error);
        }
      }

      // Load saved time range selections
      const savedTimeRanges = await LocalStorage.getItem<string>(
        "time-range-selections",
      );
      if (savedTimeRanges) {
        try {
          setTimeRangeSelections(JSON.parse(savedTimeRanges));
        } catch (error) {
          console.error("Error parsing time range selections:", error);
        }
      }

      // Load saved query selections
      const savedQueries =
        await LocalStorage.getItem<string>("query-selections");
      if (savedQueries) {
        try {
          setQuerySelections(JSON.parse(savedQueries));
        } catch (error) {
          console.error("Error parsing query selections:", error);
        }
      }

      setIsLoading(false);
    }

    loadData();
  }, []);

  const toggleField = async (dataViewId: string, field: string) => {
    setFieldSelections((prev) => {
      const current = prev[dataViewId] || [...DEFAULT_FIELDS];
      const updated = current.includes(field)
        ? current.filter((f) => f !== field)
        : [...current, field];

      const newSelections = { ...prev, [dataViewId]: updated };
      LocalStorage.setItem("field-selections", JSON.stringify(newSelections));
      return newSelections;
    });
  };

  const getSelectedFields = (dataViewId: string): string[] => {
    return fieldSelections[dataViewId] || [...DEFAULT_FIELDS];
  };

  const setTimeRange = async (dataViewId: string, timeRangeLabel: string) => {
    setTimeRangeSelections((prev) => {
      const newSelections = { ...prev, [dataViewId]: timeRangeLabel };
      LocalStorage.setItem(
        "time-range-selections",
        JSON.stringify(newSelections),
      );
      return newSelections;
    });
  };

  const getSelectedTimeRange = (dataViewId: string): TimeRange => {
    const label = timeRangeSelections[dataViewId] || DEFAULT_TIME_RANGE;
    return TIME_RANGES.find((tr) => tr.label === label) || TIME_RANGES[0];
  };

  const getSelectedQuery = (dataViewId: string): string => {
    return querySelections[dataViewId] || "";
  };

  const setQuery = async (dataViewId: string, query: string) => {
    setQuerySelections((prev) => {
      const newSelections = { ...prev, [dataViewId]: query };
      LocalStorage.setItem("query-selections", JSON.stringify(newSelections));
      return newSelections;
    });
  };

  const toggleDetailView = () => {
    setShowingDetail(!showingDetail);
  };

  const handleInstanceChange = (newInstance: string) => {
    setSelectedInstance(newInstance);
    const cache = allInstancesCaches[newInstance];
    if (cache) {
      setDataViews(cache.dataViews);
      setInstanceUrl(cache.instance.url);
      setInstanceName(cache.instance.name);
      setInstanceCommonFields(cache.instance.commonFields || COMMON_FIELDS);
    }
  };

  const instanceNames = Object.keys(allInstancesCaches);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search data views by name..."
      isShowingDetail={showingDetail}
      throttle
      searchBarAccessory={
        instanceNames.length > 1 ? (
          <List.Dropdown
            tooltip="Select Kibana Instance"
            value={selectedInstance}
            onChange={handleInstanceChange}
          >
            {instanceNames.map((name) => (
              <List.Dropdown.Item key={name} title={name} value={name} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {dataViews.map((dataView) => {
        const selectedFields = getSelectedFields(dataView.id);
        const selectedTimeRange = getSelectedTimeRange(dataView.id);
        const selectedQuery = getSelectedQuery(dataView.id);
        const discoverUrl = buildDiscoverURL(
          instanceUrl,
          dataView.id,
          selectedFields,
          selectedTimeRange,
          selectedQuery,
        );

        return (
          <List.Item
            key={dataView.id}
            title={dataView.name}
            subtitle={
              !showingDetail && dataView.title !== dataView.name
                ? dataView.title
                : undefined
            }
            accessories={
              !showingDetail
                ? [
                    {
                      text: `#${dataView.number}`,
                      tooltip: `Data View Number: ${dataView.number}`,
                    },
                  ]
                : undefined
            }
            icon={getDataViewIcon(dataView.name)}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Instance"
                      text={instanceName}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Data View Name"
                      text={dataView.name}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Index Pattern"
                      text={dataView.title}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Time Range"
                      text={selectedTimeRange.label}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Search Query"
                      text={selectedQuery || "(no filter)"}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Selected Columns"
                      text={`${selectedFields.length} field${selectedFields.length !== 1 ? "s" : ""}`}
                    />
                    <List.Item.Detail.Metadata.TagList title="Fields">
                      {selectedFields.map((field) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={field}
                          text={field}
                          color="#00BCD4"
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Navigate">
                  <Action.OpenInBrowser
                    title="Open in Discover"
                    url={discoverUrl}
                  />
                  <Action.Push
                    title="Set Search Query"
                    icon={Icon.MagnifyingGlass}
                    target={
                      <SetQueryForm
                        dataViewId={dataView.id}
                        dataViewName={dataView.name}
                        currentQuery={selectedQuery}
                        onSubmit={(query) => {
                          setQuery(dataView.id, query);
                          showToast({
                            style: Toast.Style.Success,
                            title: "Query Set",
                            message: query || "Cleared search query",
                          });
                        }}
                      />
                    }
                    shortcut={{ modifiers: ["cmd"], key: "q" }}
                  />
                  <Action
                    title="Toggle Detail View"
                    icon={Icon.Sidebar}
                    onAction={toggleDetailView}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Set Time Range">
                  {TIME_RANGES.map((timeRange) => {
                    const isSelected =
                      selectedTimeRange.label === timeRange.label;
                    return (
                      <Action
                        key={timeRange.label}
                        title={`${isSelected ? "✓" : "  "} ${timeRange.label}`}
                        icon={isSelected ? Icon.CheckCircle : Icon.Circle}
                        onAction={() =>
                          setTimeRange(dataView.id, timeRange.label)
                        }
                      />
                    );
                  })}
                </ActionPanel.Section>

                <ActionPanel.Section title="Configure Columns">
                  {instanceCommonFields.map((field) => {
                    const isSelected = selectedFields.includes(field);
                    return (
                      <Action
                        key={field}
                        title={`${isSelected ? "✓" : "  "} ${field}`}
                        icon={isSelected ? Icon.CheckCircle : Icon.Circle}
                        onAction={() => toggleField(dataView.id, field)}
                      />
                    );
                  })}
                </ActionPanel.Section>

                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy Data View Id"
                    content={dataView.id}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Data View Name"
                    content={dataView.name}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Discover URL"
                    content={discoverUrl}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}

      {!isLoading && dataViews.length === 0 && (
        <List.EmptyView
          icon={Icon.Warning}
          title="No Data Views Found"
          description="Run 'Refresh Data Views' command to fetch data views"
        />
      )}
    </List>
  );
}
