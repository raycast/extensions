import {
  Clipboard,
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  openExtensionPreferences,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useMemo } from "react";
import { GlucoseEntry, Treatment } from "../types";
import {
  formatGlucoseValue,
  getDirectionArrow,
  formatDirection,
  getGlucoseLevel,
  isRecentReading,
  getTimeAgo,
} from "../utils/glucoseStats";
import { useServerUnits, useProfileTargets } from "../hooks";
import { getTreatmentIcon } from "../utils/treatmentIcons";
import { TreatmentFormList } from "./TreatmentFormList";

type EventItem = GlucoseEntry | Treatment;

interface EventListProps {
  readings?: GlucoseEntry[];
  treatments?: Treatment[];
  isLoading: boolean;
  onRefresh: () => void;
  defaultFilter?: string;
}

type FilterType =
  | "all"
  | "glucose"
  | "treatments"
  | "recent"
  | "high"
  | "low"
  | "target"
  | "glucoseCheck"
  | "carbs"
  | "insulin"
  | "notes";

// type guards
function isGlucoseEntry(item: EventItem): item is GlucoseEntry {
  return "sgv" in item && typeof item.sgv === "number";
}

function isTreatment(item: EventItem): item is Treatment {
  return "eventType" in item && typeof item.eventType === "string";
}

// helper to get timestamp from either type
function getEventTimestamp(item: EventItem): number {
  return isGlucoseEntry(item) ? item.date : new Date(item.eventTime || item.created_at).getTime();
}

export function EventList({ readings = [], treatments = [], isLoading, defaultFilter }: EventListProps) {
  const preferences = getPreferenceValues<Preferences>();
  const { units } = useServerUnits();

  const currentTime = useMemo(() => Date.now(), []);
  const { targets } = useProfileTargets(currentTime, treatments);
  const useMmol = units === "mmol";

  const targetLow = targets?.low || 70;
  const targetHigh = targets?.high || 180;

  const [filterType, setFilterType] = useState<FilterType>((defaultFilter as FilterType) || "all");
  const [searchText, setSearchText] = useState<string>("");

  // combine and sort all events by timestamp
  const allEvents = useMemo(() => {
    const events: EventItem[] = [...readings, ...treatments];
    return events.sort((a, b) => getEventTimestamp(b) - getEventTimestamp(a));
  }, [readings, treatments]);

  const filteredEvents = useMemo(() => {
    let filtered = [...allEvents];

    switch (filterType) {
      case "glucose":
        filtered = filtered.filter(isGlucoseEntry);
        break;
      case "treatments":
        filtered = filtered.filter(isTreatment);
        break;
      case "recent": {
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
        filtered = filtered.filter((event) => getEventTimestamp(event) > thirtyMinutesAgo);
        break;
      }
      case "high":
        filtered = filtered.filter((event) => {
          if (isGlucoseEntry(event)) {
            return getGlucoseLevel(event.sgv, targetLow, targetHigh) === "high";
          }
          return false;
        });
        break;
      case "low":
        filtered = filtered.filter((event) => {
          if (isGlucoseEntry(event)) {
            return getGlucoseLevel(event.sgv, targetLow, targetHigh) === "low";
          }
          return false;
        });
        break;
      case "target":
        filtered = filtered.filter((event) => {
          if (isGlucoseEntry(event)) {
            return getGlucoseLevel(event.sgv, targetLow, targetHigh) === "target";
          }
          return false;
        });
        break;
      case "glucoseCheck":
        filtered = filtered.filter((event) => isTreatment(event) && event.glucose && event.glucose > 0);
        break;
      case "carbs":
        filtered = filtered.filter((event) => isTreatment(event) && event.carbs && event.carbs > 0);
        break;
      case "insulin":
        filtered = filtered.filter((event) => isTreatment(event) && event.insulin && event.insulin > 0);
        break;
      case "notes":
        filtered = filtered.filter((event) => isTreatment(event) && event.notes && event.notes.trim() !== "");
        break;
      default:
        break;
    }

    // apply text search filter
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter((event) => {
        if (isGlucoseEntry(event)) {
          return (
            event.sgv.toString().includes(searchLower) ||
            (event.direction && event.direction.toLowerCase().includes(searchLower)) ||
            getGlucoseLevel(event.sgv, targetLow, targetHigh).includes(searchLower) ||
            new Date(event.date).toLocaleTimeString().toLowerCase().includes(searchLower)
          );
        } else {
          return (
            event.eventType.toLowerCase().includes(searchLower) ||
            (event.notes && event.notes.toLowerCase().includes(searchLower)) ||
            (event.enteredBy && event.enteredBy.toLowerCase().includes(searchLower)) ||
            (event.carbs && event.carbs.toString().includes(searchLower)) ||
            (event.insulin && event.insulin.toString().includes(searchLower))
          );
        }
      });
    }

    return filtered;
  }, [allEvents, filterType, searchText, targetLow, targetHigh]);

  // group events by time periods for sections
  const groupedEvents = useMemo(() => {
    const now = Date.now();
    const groups: Record<string, EventItem[]> = {
      "Last Hour": [],
      "3+ Hours": [],
      "6+ Hours": [],
      "12+ Hours": [],
      Older: [],
    };

    filteredEvents.forEach((event) => {
      const ageHours = (now - getEventTimestamp(event)) / (1000 * 60 * 60);

      if (ageHours <= 1) {
        groups["Last Hour"].push(event);
      } else if (ageHours <= 3) {
        groups["3+ Hours"].push(event);
      } else if (ageHours <= 6) {
        groups["6+ Hours"].push(event);
      } else if (ageHours <= 12) {
        groups["12+ Hours"].push(event);
      } else {
        groups["Older"].push(event);
      }
    });

    // remove empty groups
    Object.keys(groups).forEach((key) => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  }, [filteredEvents]);

  const getEventIcon = (event: EventItem) => {
    if (isGlucoseEntry(event)) {
      const level = getGlucoseLevel(event.sgv, targetLow, targetHigh);

      switch (level) {
        case "low":
          return { source: Icon.ArrowDown, tintColor: Color.Red };
        case "high":
          return { source: Icon.ArrowUp, tintColor: Color.Yellow };
        default:
          return { source: Icon.CheckCircle, tintColor: Color.Green };
      }
    } else {
      return getTreatmentIcon(event.eventType);
    }
  };

  const getEventTitle = (event: EventItem): string => {
    if (isGlucoseEntry(event)) {
      return formatGlucoseValue(event.sgv, useMmol);
    } else {
      return event.eventType;
    }
  };

  const getEventSubtitle = (event: EventItem): string => {
    if (isGlucoseEntry(event)) {
      return getDirectionArrow(event.direction || "UNKNOWN");
    } else {
      return "";
    }
  };

  const getEventAccessories = (event: EventItem): List.Item.Accessory[] => {
    const accessories: List.Item.Accessory[] = [];
    const timestamp = getEventTimestamp(event);

    if (!isGlucoseEntry(event)) {
      // treatment type tag
      if (event.insulin && event.insulin > 0) {
        accessories.push({ tag: { value: `${event.insulin}u`, color: Color.Purple } });
      }
      if (event.carbs && event.carbs > 0) {
        accessories.push({ tag: { value: `${event.carbs}g`, color: Color.Orange } });
      }
      if (event.eventType == "BG Check" && event.glucose && event.glucose > 0) {
        const displayValue = useMmol ? (event.glucose / 18.0).toFixed(1) : event.glucose.toString();
        const displayUnit = useMmol ? "mmol/L" : "mg/dL";
        accessories.push({ tag: { value: `${displayValue} ${displayUnit}`, color: Color.Blue } });
      }
    }

    const timeAgo = getTimeAgo(timestamp);
    accessories.push({
      text: timeAgo,
      tooltip: new Date(timestamp).toLocaleString(),
    });

    return accessories;
  };

  const getEventKeywords = (event: EventItem): string[] => {
    if (isGlucoseEntry(event)) {
      return [
        event.sgv.toString(),
        formatGlucoseValue(event.sgv, useMmol),
        getGlucoseLevel(event.sgv, targetLow, targetHigh),
        event.direction || "",
        formatDirection(event.direction || "UNKNOWN"),
        new Date(event.date).toLocaleTimeString(),
      ];
    } else {
      return [
        "treatment",
        event.eventType,
        event.notes || "",
        event.enteredBy || "",
        event.carbs?.toString() || "",
        event.insulin?.toString() || "",
        event.glucoseType || "",
      ];
    }
  };

  const getEventDetail = (event: EventItem) => {
    const level = isGlucoseEntry(event) ? getGlucoseLevel(event.sgv, targetLow, targetHigh) : null;
    if (isGlucoseEntry(event)) {
      return (
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Glucose Value"
                text={formatGlucoseValue(event.sgv, useMmol)}
                icon={getEventIcon(event)}
              />
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item
                  text={getGlucoseLevel(event.sgv, targetLow, targetHigh).toUpperCase()}
                  color={level === "target" ? Color.Green : level === "high" ? Color.Yellow : Color.Red}
                />
                {!isRecentReading(event) && (
                  <List.Item.Detail.Metadata.TagList.Item text="STALE" color={Color.Orange} />
                )}
              </List.Item.Detail.Metadata.TagList>

              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.Label
                title="Direction"
                text={event.direction ? formatDirection(event.direction) : "Unknown"}
              />
              <List.Item.Detail.Metadata.Label
                title="Time"
                text={new Date(event.date).toLocaleString()}
                icon={Icon.Clock}
              />

              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.Label title="Device" text={event.device || "Unknown"} icon={Icon.Mobile} />
              <List.Item.Detail.Metadata.Label title="Type" text={event.type || "Unknown"} icon={Icon.Document} />
            </List.Item.Detail.Metadata>
          }
        />
      );
    } else {
      // group metadata items logically
      const treatmentItems = [];
      const deviceItems = [];
      const timeItems = [];

      // treatment-related items
      if (event.insulin && event.insulin > 0) {
        treatmentItems.push(
          <List.Item.Detail.Metadata.Label
            key="insulin"
            title="Insulin"
            text={`${event.insulin}u`}
            icon={Icon.Syringe}
          />,
        );
      }
      if (event.carbs && event.carbs > 0) {
        treatmentItems.push(
          <List.Item.Detail.Metadata.Label
            key="carbs"
            title="Carbohydrates"
            text={`${event.carbs}g`}
            icon={Icon.Coins}
          />,
        );
      }
      if (event.protein && event.protein > 0) {
        treatmentItems.push(
          <List.Item.Detail.Metadata.Label key="protein" title="Protein" text={`${event.protein}g`} icon={Icon.Dna} />,
        );
      }
      if (event.fat && event.fat > 0) {
        treatmentItems.push(
          <List.Item.Detail.Metadata.Label key="fat" title="Fat" text={`${event.fat}g`} icon={Icon.Heart} />,
        );
      }
      if (event.relative && event.relative > 0) {
        treatmentItems.push(
          <List.Item.Detail.Metadata.Label
            key="relative"
            title="Extended Insulin"
            text={`${event.relative}u`}
            icon={Icon.Hourglass}
          />,
        );
      }
      if (event.duration) {
        treatmentItems.push(
          <List.Item.Detail.Metadata.Label
            key="duration"
            title="Duration"
            text={`${event.duration} minutes`}
            icon={Icon.Clock}
          />,
        );
      }
      if (event.glucose) {
        treatmentItems.push(
          <List.Item.Detail.Metadata.Label
            key="glucose"
            title="Glucose"
            text={`${event.glucose} ${useMmol ? "mmol/L" : "mg/dL"}`}
            icon={Icon.Circle}
          />,
        );
      }
      if (event.glucoseType) {
        treatmentItems.push(
          <List.Item.Detail.Metadata.Label
            key="glucoseType"
            title="Glucose Type"
            text={event.glucoseType}
            icon={event.glucoseType === "Finger" ? Icon.Fingerprint : Icon.Wifi}
          />,
        );
      }
      if (event.percent) {
        treatmentItems.push(
          <List.Item.Detail.Metadata.Label
            key="percent"
            title="Basal Change"
            text={`${event.percent}%`}
            icon={Icon.ArrowClockwise}
          />,
        );
      }
      if (event.absolute) {
        treatmentItems.push(
          <List.Item.Detail.Metadata.Label
            key="absolute"
            title="Basal Rate"
            text={`${event.absolute}u`}
            icon={Icon.ArrowClockwise}
          />,
        );
      }
      if (event.profile) {
        treatmentItems.push(
          <List.Item.Detail.Metadata.Label
            key="profile"
            title="Profile"
            text={event.profile}
            icon={Icon.PersonCircle}
          />,
        );
      }

      // device-related items
      if (event.transmitterId) {
        deviceItems.push(
          <List.Item.Detail.Metadata.Label
            key="transmitterId"
            title="Transmitter ID"
            text={event.transmitterId}
            icon={Icon.Wifi}
          />,
        );
      }
      if (event.sensorCode) {
        deviceItems.push(
          <List.Item.Detail.Metadata.Label
            key="sensorCode"
            title="Sensor Code"
            text={event.sensorCode}
            icon={Icon.BarCode}
          />,
        );
      }

      // time-related items
      if (event.eventTime) {
        timeItems.push(
          <List.Item.Detail.Metadata.Label
            key="eventTime"
            title="Event Time"
            text={new Date(event.eventTime).toLocaleString()}
            icon={Icon.Calendar}
          />,
        );
      }
      if (event.created_at) {
        timeItems.push(
          <List.Item.Detail.Metadata.Label
            key="created_at"
            title="Logged At"
            text={new Date(event.created_at).toLocaleString()}
            icon={Icon.CheckList}
          />,
        );
      }
      if (event.enteredBy) {
        timeItems.push(
          <List.Item.Detail.Metadata.Label
            key="enteredBy"
            title="Entered By"
            text={event.enteredBy}
            icon={Icon.Person}
          />,
        );
      }

      return (
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Event Type" text={event.eventType} icon={getEventIcon(event)} />

              {treatmentItems.length > 0 && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  {treatmentItems}
                </>
              )}

              {deviceItems.length > 0 && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  {deviceItems}
                </>
              )}

              {timeItems.length > 0 && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  {timeItems}
                </>
              )}

              {event.notes && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Notes" text={event.notes} icon={Icon.Document} />
                </>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      );
    }
  };

  if (readings.length === 0 && treatments.length === 0 && !isLoading) {
    return (
      <List isLoading={isLoading} searchBarPlaceholder="No events available">
        <List.EmptyView
          icon={Icon.HeartDisabled}
          title="No Event Data"
          description="No glucose readings or treatments found. Check your Nightscout connection."
          actions={
            <ActionPanel>
              <Action.Push title="Add Treatment" icon={Icon.Plus} target={<TreatmentFormList />} />
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const FilterDropdown = () => (
    <List.Dropdown
      tooltip="Filter Events"
      value={filterType}
      onChange={(newValue) => setFilterType(newValue as FilterType)}
    >
      <List.Dropdown.Section title="Data Type">
        <List.Dropdown.Item title="All Events" value="all" />
        <List.Dropdown.Item title="Blood Glucose" value="glucose" />
        <List.Dropdown.Item title="Treatments" value="treatments" />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Time Filters">
        <List.Dropdown.Item title="Recent (30 min)" value="recent" />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Glucose Filters">
        <List.Dropdown.Item title="Target Range" value="target" />
        <List.Dropdown.Item title="High Readings" value="high" />
        <List.Dropdown.Item title="Low Readings" value="low" />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Treatment Filters">
        <List.Dropdown.Item title="With Blood Glucose" value="glucoseCheck" />
        <List.Dropdown.Item title="With Carbs" value="carbs" />
        <List.Dropdown.Item title="With Insulin" value="insulin" />
        <List.Dropdown.Item title="With Notes" value="notes" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search events..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={<FilterDropdown />}
      actions={
        <ActionPanel>
          <Action.Push title="Add Treatment" icon={Icon.Plus} target={<TreatmentFormList />} />
        </ActionPanel>
      }
    >
      {Object.entries(groupedEvents).map(([sectionTitle, sectionEvents]) => (
        <List.Section
          key={sectionTitle}
          title={sectionTitle}
          subtitle={`${sectionEvents.length} event${sectionEvents.length !== 1 ? "s" : ""}`}
        >
          {sectionEvents.map((event) => (
            <List.Item
              key={isGlucoseEntry(event) ? event._id || event.date : event._id || event.created_at}
              icon={getEventIcon(event)}
              title={getEventTitle(event)}
              subtitle={getEventSubtitle(event)}
              accessories={getEventAccessories(event)}
              keywords={getEventKeywords(event)}
              detail={getEventDetail(event)}
              actions={
                <ActionPanel>
                  <Action.Push title="Add Treatment" icon={Icon.Plus} target={<TreatmentFormList />} />
                  {isGlucoseEntry(event) && (
                    <Action
                      title="Copy Value"
                      icon={Icon.Clipboard}
                      onAction={async () => {
                        await Clipboard.copy(event.sgv.toString());
                      }}
                    />
                  )}
                  <Action.OpenInBrowser
                    title="Open in Nightscout"
                    url={preferences.instance}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}

      {filteredEvents.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Results Found"
          description={`No events in the last 24 hours match your current search filter.`}
          actions={
            <ActionPanel>
              <Action
                title="Clear Filters"
                icon={Icon.XMarkCircle}
                onAction={() => {
                  setFilterType("all");
                  setSearchText("");
                }}
              />
              <Action.Push title="Add Treatment" icon={Icon.Plus} target={<TreatmentFormList />} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
