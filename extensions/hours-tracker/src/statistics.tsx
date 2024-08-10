import { useState, useEffect } from "react";
import { List, ActionPanel, Action, useNavigation, Color, Icon, Toast, showToast, Detail } from "@raycast/api";
import { format, startOfDay, differenceInSeconds, startOfWeek, startOfMonth } from "date-fns";
import { deleteEntry, getEntriesForTopic, getTopics, getTrackEntry, stopTrackEntry, STORAGE_OBJECTS } from "./storage";
import { Topic, TrackEntry } from "./types";
import { useEnsureFiles } from "./hooks/useEnsureFiles";

const dateRanges = [
  { label: "Today", value: "today" },
  { label: "This week", value: "week" },
  { label: "This month", value: "month" },
  { label: "All time", value: "all" },
];

const ITEMS_PER_PAGE = 10;

function OngoingTrackingSection({
  ongoingEntry,
  handleStopTracking,
  formatDuration,
  isVisible,
}: {
  ongoingEntry: TrackEntry;
  handleStopTracking: () => void;
  formatDuration: (totalSeconds: number) => string;
  isVisible: boolean;
}) {
  const [currentDuration, setCurrentDuration] = useState(0);
  useEffect(() => {
    if (ongoingEntry && isVisible) {
      const timer = setInterval(() => {
        setCurrentDuration(differenceInSeconds(new Date(), ongoingEntry.startTime));
      }, 200);
      return () => clearInterval(timer);
    }
  }, [ongoingEntry, isVisible]);

  return (
    <List.Section title="Ongoing Tracking">
      <List.Item
        title="Current Session"
        subtitle={`Started at ${format(ongoingEntry.startTime, "HH:mm:ss, MMM dd")}`}
        accessories={[
          {
            text: {
              value: formatDuration(currentDuration),
              color: Color.Orange,
            },
          },
        ]}
        actions={
          <ActionPanel>
            <Action title="Stop Tracking" onAction={handleStopTracking} />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

function StatisticsSection({
  selectedDateRange,
  totalTime,
  formatDuration,
  setIsSelectingDateRange,
  push,
  DateRangeSelector,
}: {
  selectedDateRange: { label: string; value: string };
  totalTime: number;
  formatDuration: (totalSeconds: number) => string;
  setIsSelectingDateRange: (isSelecting: boolean) => void;
  push: (component: React.ReactNode) => void;
  DateRangeSelector: React.ComponentType;
}) {
  return (
    <List.Section title={`Statistics for ${selectedDateRange.label}`}>
      <List.Item
        title="Total tracked time"
        accessories={[
          {
            text: {
              value: formatDuration(totalTime),
              color: Color.Green,
            },
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title="Change Date Range"
              onAction={() => {
                setIsSelectingDateRange(true);
                push(<DateRangeSelector />);
              }}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

function EntriesSection({
  paginatedEntries,
  currentPage,
  totalPages,
  formatDuration,
  handleDeleteEntry,
}: {
  paginatedEntries: TrackEntry[];
  currentPage: number;
  totalPages: number;
  formatDuration: (totalSeconds: number) => string;
  handleDeleteEntry: (entry: TrackEntry) => void;
}) {
  function generateEntryTitle(entry: TrackEntry) {
    if (entry.endTime === null) return "";

    return `${format(entry.startTime, "MMM dd, yyyy HH:mm:ss")} - ${format(entry.endTime, "MMM dd, yyyy HH:mm:ss")}`;
  }

  return (
    <List.Section title={`Entries (Page ${currentPage} of ${totalPages})`}>
      {paginatedEntries.map((entry) => (
        <List.Item
          key={entry.startTime.toString()}
          title={generateEntryTitle(entry)}
          accessories={
            entry.endTime !== null
              ? [{ text: `${formatDuration(differenceInSeconds(entry.endTime, entry.startTime))}` }]
              : []
          }
          actions={
            <ActionPanel>
              <Action title="Delete Entry" onAction={() => handleDeleteEntry(entry)} style={Action.Style.Destructive} />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}

function NavigationSection({
  currentPage,
  totalPages,
  setCurrentPage,
}: {
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
}) {
  return (
    <List.Section title="Navigation">
      {currentPage > 1 && (
        <List.Item
          actions={
            <ActionPanel>
              <Action title="Previous Page" icon={Icon.ArrowLeft} onAction={() => setCurrentPage(currentPage - 1)} />
            </ActionPanel>
          }
          title="Previous Page"
          icon={Icon.ArrowLeft}
        />
      )}
      {currentPage < totalPages && (
        <List.Item
          actions={
            <ActionPanel>
              <Action title="Next Page" icon={Icon.ArrowRight} onAction={() => setCurrentPage(currentPage + 1)} />
            </ActionPanel>
          }
          title="Next Page"
          icon={Icon.ArrowRight}
        />
      )}
    </List.Section>
  );
}

export default function TopicStatisticsView() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState(dateRanges[0]);
  const [entries, setEntries] = useState<TrackEntry[]>([]);
  const [totalTime, setTotalTime] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [ongoingEntry, setOngoingEntry] = useState<TrackEntry | null>(null);
  const [isSelectingDateRange, setIsSelectingDateRange] = useState(false);
  const objectsToEnsure = [STORAGE_OBJECTS.TOPICS];
  const { objectsExists } = useEnsureFiles(objectsToEnsure);

  const { pop, push } = useNavigation();

  useEffect(() => {
    function fetchTopics() {
      const fetchedTopics = getTopics();
      if (fetchedTopics === null) {
        setTopics([]);
        showToast(Toast.Style.Failure, "Error parsing topics", "Please create a topic");
        return;
      }
      setTopics(fetchedTopics);
      if (fetchedTopics.length > 0) {
        setSelectedTopic(fetchedTopics[0].name);
      }
    }
    fetchTopics();
  }, []);

  useEffect(() => {
    function fetchOngoingEntry() {
      if (!selectedTopic) return;
      const fetchedOngoingEntry = getTrackEntry(selectedTopic);
      setOngoingEntry(fetchedOngoingEntry);
    }
    fetchOngoingEntry();
  }, [selectedTopic]);

  function fetchEntries() {
    if (!selectedTopic) return;
    const now = new Date();
    const endDate = now;
    let startDate;
    switch (selectedDateRange.value) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "week":
        startDate = startOfDay(startOfWeek(now, { weekStartsOn: 1 }));
        break;
      case "month":
        startDate = startOfMonth(now);
        break;
      case "all":
        startDate = new Date(0);
        break;
      default:
        startDate = new Date(0);
    }

    const fetchedEntries = getEntriesForTopic(selectedTopic, startDate, endDate).sort((a, b) =>
      a.endTime !== null && b.endTime !== null ? b.endTime - a.endTime : 0,
    );

    setEntries(fetchedEntries);
    const total = fetchedEntries.reduce(
      (sum, entry) => sum + (entry.endTime !== null ? differenceInSeconds(entry.endTime, entry.startTime) : 0),
      0,
    );
    setTotalTime(total);
    setCurrentPage(1);
  }

  useEffect(() => {
    fetchEntries();
  }, [selectedTopic, selectedDateRange]);

  function formatDuration(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    let formattedDuration = "";
    if (hours > 0) {
      formattedDuration += `${hours}h `;
    }
    if (minutes > 0 || hours > 0) {
      formattedDuration += `${minutes}m `;
    }
    formattedDuration += `${seconds}s`;
    return formattedDuration.trim();
  }

  function handleDeleteEntry(entry: TrackEntry) {
    if (selectedTopic === null) return;

    const deleted = deleteEntry(entry, selectedTopic);
    if (!deleted) {
      showToast(Toast.Style.Failure, "Error deleting entry", "Please try again");
      return;
    }
    fetchEntries();
  }

  function handleStopTracking() {
    const topic = selectedTopic;
    if (topic === null) return;
    if (ongoingEntry) {
      stopTrackEntry({ name: topic, createdAt: 0 });
      setOngoingEntry(null);
      fetchEntries();
    }
  }

  function handleDateRangeSelection(range: { label: string; value: string }) {
    setSelectedDateRange(range);
    setIsSelectingDateRange(false);
    fetchEntries();
    pop();
  }

  const DateRangeSelector = () => {
    useEffect(() => {
      setIsSelectingDateRange(true);
      return () => {
        setIsSelectingDateRange(false);
      };
    }, []);

    return (
      <List>
        {dateRanges.map((range) => (
          <List.Item
            key={range.value}
            title={range.label}
            actions={
              <ActionPanel>
                <Action title="Select Starting Date" onAction={() => handleDateRangeSelection(range)} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  };

  const paginatedEntries = entries.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(entries.length / ITEMS_PER_PAGE);

  if (objectsExists === false) {
    return <Detail markdown={`Error: Topics file not found}`} />;
  }

  return (
    <List
      searchBarAccessory={
        <List.Dropdown tooltip="Select Topic" storeValue={true} onChange={(newValue) => setSelectedTopic(newValue)}>
          {topics.map((topic) => (
            <List.Dropdown.Item key={topic.name} title={topic.name} value={topic.name} />
          ))}
        </List.Dropdown>
      }
    >
      {ongoingEntry && (
        <OngoingTrackingSection
          ongoingEntry={ongoingEntry}
          handleStopTracking={handleStopTracking}
          formatDuration={formatDuration}
          isVisible={!isSelectingDateRange}
        />
      )}

      <StatisticsSection
        selectedDateRange={selectedDateRange}
        totalTime={totalTime}
        formatDuration={formatDuration}
        setIsSelectingDateRange={setIsSelectingDateRange}
        push={push}
        DateRangeSelector={DateRangeSelector}
      />

      {selectedTopic && (
        <EntriesSection
          paginatedEntries={paginatedEntries}
          currentPage={currentPage}
          totalPages={totalPages}
          formatDuration={formatDuration}
          handleDeleteEntry={handleDeleteEntry}
        />
      )}

      {totalPages > 1 && (
        <NavigationSection currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} />
      )}
    </List>
  );
}
