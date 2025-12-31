import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  LocalStorage,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import type {
  DataViewFormatted,
  AllInstancesCache,
  FieldSelection,
  TimeRangeSelection,
  QuerySelection,
  TimeRange,
  Preferences,
} from "./types";
import { loadAllInstancesCaches, CACHE_PATH } from "./tools/cache";
import { buildDiscoverURL } from "./tools/url-builder";
import {
  TIME_RANGES,
  DEFAULT_TIME_RANGE,
  COMMON_FIELDS,
  DEFAULT_FIELDS,
} from "./tools/constants";
import { getDataViewIcon } from "./tools/helpers";
import { SetQueryForm, EmptyView } from "./components";

export default function Command() {
  const [allInstancesCaches, setAllInstancesCaches] =
    useState<AllInstancesCache>({});
  const [selectedInstance, setSelectedInstance] = useState<string>("");
  const [dataViews, setDataViews] = useState<DataViewFormatted[]>([]);
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
          message: "Please run 'Refresh data-views' command first",
        });
        setIsLoading(false);
        return;
      }

      setAllInstancesCaches(caches);

      // Get preferences and determine default instance
      const preferences = getPreferenceValues<Preferences>();
      const instanceNames = Object.keys(caches);

      // Use defaultInstance preference if set and exists, otherwise use first instance
      let defaultInstanceName = instanceNames[0];
      if (preferences.defaultInstance && caches[preferences.defaultInstance]) {
        defaultInstanceName = preferences.defaultInstance;
      }

      setSelectedInstance(defaultInstanceName);

      const firstCache = caches[defaultInstanceName];
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

      // Note: Query selections are NOT persisted - they reset each session

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

  const setQuery = (dataViewId: string, query: string) => {
    setQuerySelections((prev) => ({
      ...prev,
      [dataViewId]: query,
    }));
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
      searchBarPlaceholder="Search data-views by name..."
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
                    shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
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

      {!isLoading && dataViews.length === 0 && <EmptyView />}
    </List>
  );
}
