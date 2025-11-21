import {
  Action,
  ActionPanel,
  Color,
  Grid,
  Icon,
  List,
  showToast,
  Toast,
  getPreferenceValues,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { getAttendance, clockInOut, getModifyPageData } from "./lib/api";
import { ensureValidSession } from "./lib/auth";
import { CACHE_KEYS, getCached, setCached, removeCached } from "./lib/cache";
import { AttendanceEntry, AttendanceResponse, AttendanceStatus } from "./lib/types";
import { ICON_PACK_MAP } from "./lib/constants";
import { GridItem } from "./components/GridItem";
import { ListItem } from "./components/ListItem";
import { ClockFormWrapper } from "./components/ClockFormWrapper";
import { getStoredFieldSchema, hasFieldSchemaChanged, getAllRememberedFieldValues } from "./lib/clock-storage";

function getCurrentAndPreviousMonth(): {
  current: { year: number; month: number };
  previous: { year: number; month: number };
} {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  let previousYear = currentYear;
  let previousMonth = currentMonth - 1;

  if (previousMonth < 1) {
    previousMonth = 12;
    previousYear = currentYear - 1;
  }

  return {
    current: { year: currentYear, month: currentMonth },
    previous: { year: previousYear, month: previousMonth },
  };
}

function getStatusIcon(
  entry: AttendanceEntry,
  iconPack: "raycast" | "pduck" | "gif",
): Icon | string | { source: string; tintColor?: Color } {
  const iconConfig = ICON_PACK_MAP[entry.status];
  const icon = iconConfig[iconPack];

  // Handle raycast icons (Icon enum or string asset)
  if (iconPack === "raycast") {
    if (typeof icon === "string") {
      // Asset image - return as object with source
      // Padding will be handled by GridItem component if needed
      return { source: icon };
    }
    // Icon enum
    return icon;
  }

  // Handle pduck and gif assets - return as string
  // Don't add padding here - let GridItem handle it for specific assets
  return icon;
}

function getStatusColor(entry: AttendanceEntry): Color {
  switch (entry.status) {
    case AttendanceStatus.Pending:
      return Color.Orange;
    case AttendanceStatus.HolidayWork:
    case AttendanceStatus.Logged:
      return Color.Green;
    case AttendanceStatus.Absence:
    case AttendanceStatus.Late:
      return Color.Yellow;
    case AttendanceStatus.PaidVacation:
    case AttendanceStatus.SubstitutionHoliday:
      return Color.Blue;
    case AttendanceStatus.Holiday:
    case AttendanceStatus.Unlogged:
    default:
      return Color.PrimaryText;
  }
}

function formatStatus(entry: AttendanceEntry): string {
  if (entry.rawStatus.length === 0) {
    return entry.status;
  }
  return entry.rawStatus.join(", ");
}

function formatDate(date: string, dayOfWeek: string): string {
  const dateObj = new Date(date);
  const month = dateObj.toLocaleString("en-US", { month: "short" });
  const day = dateObj.getDate();
  return `${month} ${day} (${dayOfWeek})`;
}

interface Preferences {
  hideHolidays: boolean;
  useGridsOverLists: boolean;
  gridColumns: string;
  attendancePeriodFilter: string;
  iconPack: "raycast" | "pduck" | "gif";
}

export default function Command() {
  const { current, previous } = getCurrentAndPreviousMonth();
  const preferences = getPreferenceValues<Preferences>();
  const [attendance, setAttendance] = useState<AttendanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<"current" | "previous" | "last30days" | "all">(
    (preferences.attendancePeriodFilter as "current" | "previous" | "last30days" | "all") || "all",
  );
  const [hideHolidays, setHideHolidays] = useState<boolean>(preferences.hideHolidays);
  const [useGrid, setUseGrid] = useState<boolean>(preferences.useGridsOverLists);
  const [gridColumns, setGridColumns] = useState<number>(parseInt(preferences.gridColumns, 10) || 4);
  const [clockingInOutProgress, setClockingInOutProgress] = useState<string | null>(null);
  const [iconPack, setIconPack] = useState<"raycast" | "pduck" | "gif">(preferences.iconPack);
  const hasFetchedRef = useRef(false);
  const clockingLockRef = useRef<Set<string>>(new Set()); // Track dates currently being clocked

  // Handle icon pack change
  const handleIconPackChange = (newIconPack: "raycast" | "pduck" | "gif") => {
    setIconPack(newIconPack);
  };

  useEffect(() => {
    // Prevent duplicate requests in React StrictMode
    if (hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = true;

    async function fetchAttendance() {
      try {
        setIsLoading(true);
        setError(null);

        if (selectedPeriod === "current") {
          // Fetch only current month
          const cacheKey = CACHE_KEYS.attendance(current.year, current.month);
          const cached = await getCached<AttendanceResponse>(cacheKey);

          if (cached && cached.entries.length > 0) {
            setAttendance(cached);
            setIsLoading(false);

            // Fetch fresh data in background
            try {
              await ensureValidSession();
              const data = await getAttendance(current.year, current.month);
              setAttendance(data);
              await setCached(cacheKey, data);
            } catch (error) {
              console.debug(`[Search Attendance] Background refresh failed: ${error}`);
            }
            return;
          }

          await ensureValidSession();
          const data = await getAttendance(current.year, current.month);
          setAttendance(data);
          await setCached(cacheKey, data);
        } else if (selectedPeriod === "previous") {
          // Fetch only previous month
          const cacheKey = CACHE_KEYS.attendance(previous.year, previous.month);
          const cached = await getCached<AttendanceResponse>(cacheKey);

          if (cached && cached.entries.length > 0) {
            setAttendance(cached);
            setIsLoading(false);

            // Fetch fresh data in background
            try {
              await ensureValidSession();
              const data = await getAttendance(previous.year, previous.month);
              setAttendance(data);
              await setCached(cacheKey, data);
            } catch (error) {
              console.debug(`[Search Attendance] Background refresh failed: ${error}`);
            }
            return;
          }

          await ensureValidSession();
          const data = await getAttendance(previous.year, previous.month);
          setAttendance(data);
          await setCached(cacheKey, data);
        } else {
          // Fetch both current and previous months for "all" and "last30days"
          const currentCacheKey = CACHE_KEYS.attendance(current.year, current.month);
          const previousCacheKey = CACHE_KEYS.attendance(previous.year, previous.month);

          const cachedCurrent = await getCached<AttendanceResponse>(currentCacheKey);
          const cachedPrevious = await getCached<AttendanceResponse>(previousCacheKey);

          // If both are cached, use them and fetch in background
          if (cachedCurrent && cachedPrevious) {
            setAttendance({
              entries: [...cachedPrevious.entries, ...cachedCurrent.entries],
              year: current.year,
              month: current.month,
            });
            setIsLoading(false);

            // Fetch fresh data in background
            try {
              await ensureValidSession();
              const [currentData, previousData] = await Promise.all([
                getAttendance(current.year, current.month),
                getAttendance(previous.year, previous.month),
              ]);
              setAttendance({
                entries: [...previousData.entries, ...currentData.entries],
                year: current.year,
                month: current.month,
              });
              await setCached(currentCacheKey, currentData);
              await setCached(previousCacheKey, previousData);
            } catch (error) {
              console.debug(`[Search Attendance] Background refresh failed: ${error}`);
              if (
                error instanceof Error &&
                (error.message.includes("authentication") || error.message.includes("preferences"))
              ) {
                await removeCached(currentCacheKey);
                await removeCached(previousCacheKey);
                setAttendance(null);
                setError(error.message);
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Authentication required",
                  message: "Please check your credentials in extension preferences",
                });
                return;
              }
            }
            return;
          }

          // No cache, fetch fresh data
          await ensureValidSession();
          const [currentData, previousData] = await Promise.all([
            getAttendance(current.year, current.month),
            getAttendance(previous.year, previous.month),
          ]);
          setAttendance({
            entries: [...previousData.entries, ...currentData.entries],
            year: current.year,
            month: current.month,
          });
          await setCached(currentCacheKey, currentData);
          await setCached(previousCacheKey, previousData);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch attendance";
        setError(errorMessage);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchAttendance();
  }, [
    selectedPeriod,
    current.year,
    current.month,
    previous.year,
    previous.month,
    preferences.hideHolidays,
    preferences.useGridsOverLists,
    preferences.gridColumns,
    preferences.attendancePeriodFilter,
  ]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period as "current" | "previous" | "last30days" | "all");
    hasFetchedRef.current = false;
  };

  // Filter entries: exclude future dates, today, and holidays (if hideHolidays is true)
  // But always show holidays that have work data (clockIn, clockOut, workingHours)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredEntries = (
    attendance?.entries.filter((entry) => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);

      // Exclude future dates and today
      if (entryDate >= today) {
        return false;
      }

      // Check if entry has work data (clockIn, clockOut, and workingHours)
      const hasWorkData = entry.clockIn && entry.clockOut && entry.workingHours;

      // Exclude holidays if hideHolidays is true, but always show holidays with work data
      if (hideHolidays && entry.holidayType && !hasWorkData) {
        return false;
      }

      return true;
    }) || []
  ).sort((a, b) => {
    // Sort by date in descending order (latest first)
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });

  const rotateGridColumns = () => {
    const columns = [5, 6, 7, 8];
    const currentIndex = columns.indexOf(gridColumns);
    const nextIndex = (currentIndex + 1) % columns.length;
    setGridColumns(columns[nextIndex]);
  };

  const handleLogAll = async () => {
    // Find all absence entries
    const absenceEntries = filteredEntries.filter(
      (e) => e.status === AttendanceStatus.Absence && !clockingLockRef.current.has(e.date),
    );

    if (absenceEntries.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Days to Log",
        message: "No absence entries found to log",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Clocking In & Out All Days",
      message: `Processing ${absenceEntries.length} day(s)...`,
    });

    let successCount = 0;
    let failureCount = 0;
    const failedDates: string[] = [];

    // Get remembered values (should be set from first clock)
    const rememberedValues = await getAllRememberedFieldValues();

    // Check if we have required values
    if (!rememberedValues.notice) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Form Required",
        message: "Please clock in/out a single day first to set up form fields",
      });
      return;
    }

    // Process each entry sequentially
    for (let i = 0; i < absenceEntries.length; i++) {
      const entry = absenceEntries[i];

      // Check lock again (in case another process started)
      if (clockingLockRef.current.has(entry.date)) {
        failureCount++;
        failedDates.push(entry.date);
        continue;
      }

      // Acquire lock
      clockingLockRef.current.add(entry.date);
      setClockingInOutProgress(entry.date);

      try {
        const entryDate = new Date(entry.date);

        toast.message = `Processing ${i + 1}/${absenceEntries.length}: ${formatDate(entry.date, entry.dayOfWeek)}...`;

        // Use remembered values as field map
        await clockInOut(entryDate, rememberedValues as Record<string, string>);

        successCount++;
      } catch (error) {
        console.error(`[Search Attendance] Failed to log ${entry.date}:`, error);
        failureCount++;
        failedDates.push(entry.date);
      } finally {
        // Release lock
        clockingLockRef.current.delete(entry.date);
        setClockingInOutProgress(null);
      }
    }

    // Invalidate cache for all affected months
    const affectedMonths = new Set<string>();
    for (const entry of absenceEntries) {
      const entryDate = new Date(entry.date);
      const month = entryDate.getMonth() + 1;
      const year = entryDate.getFullYear();
      affectedMonths.add(`${year}-${month}`);
      await removeCached(CACHE_KEYS.attendance(year, month));
    }

    // Refetch data based on selected period
    hasFetchedRef.current = false;
    setIsLoading(true);

    try {
      if (selectedPeriod === "current") {
        const data = await getAttendance(current.year, current.month);
        await setCached(CACHE_KEYS.attendance(current.year, current.month), data);
        setAttendance(data);
      } else if (selectedPeriod === "previous") {
        const data = await getAttendance(previous.year, previous.month);
        await setCached(CACHE_KEYS.attendance(previous.year, previous.month), data);
        setAttendance(data);
      } else if (selectedPeriod === "all" || selectedPeriod === "last30days") {
        const currentData = await getAttendance(current.year, current.month);
        const previousData = await getAttendance(previous.year, previous.month);
        await setCached(CACHE_KEYS.attendance(current.year, current.month), currentData);
        await setCached(CACHE_KEYS.attendance(previous.year, previous.month), previousData);
        setAttendance({
          entries: [...previousData.entries, ...currentData.entries],
          year: current.year,
          month: current.month,
        });
      }
    } catch (error) {
      console.error("[Search Attendance] Failed to refetch after log all:", error);
    }

    setIsLoading(false);

    // Show final result
    if (failureCount === 0) {
      toast.style = Toast.Style.Success;
      toast.title = "All Days Clocked In & Out Successfully";
      toast.message = `Successfully clocked in/out ${successCount} day(s)`;
    } else if (successCount === 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "All Days Failed";
      toast.message = `Failed to Clock In & Out ${failureCount} day(s)`;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Partially Completed";
      toast.message = `Clocked in/out ${successCount} day(s), ${failureCount} failed`;
    }
  };

  const handleClockSuccess = async (entry: AttendanceEntry) => {
    // Invalidate cache and refetch
    const entryDate = new Date(entry.date);
    const entryMonth = entryDate.getMonth() + 1;
    const entryYear = entryDate.getFullYear();
    const cacheKey = CACHE_KEYS.attendance(entryYear, entryMonth);
    await removeCached(cacheKey);

    // Refetch the data based on selected period
    hasFetchedRef.current = false;
    setIsLoading(true);

    if (selectedPeriod === "current" && entryYear === current.year && entryMonth === current.month) {
      const data = await getAttendance(current.year, current.month);
      await setCached(CACHE_KEYS.attendance(current.year, current.month), data);
      setAttendance(data);
    } else if (selectedPeriod === "previous" && entryYear === previous.year && entryMonth === previous.month) {
      const data = await getAttendance(previous.year, previous.month);
      await setCached(CACHE_KEYS.attendance(previous.year, previous.month), data);
      setAttendance(data);
    } else if (selectedPeriod === "all" || selectedPeriod === "last30days") {
      const currentData = await getAttendance(current.year, current.month);
      const previousData = await getAttendance(previous.year, previous.month);
      await setCached(CACHE_KEYS.attendance(current.year, current.month), currentData);
      await setCached(CACHE_KEYS.attendance(previous.year, previous.month), previousData);
      setAttendance({
        entries: [...previousData.entries, ...currentData.entries],
        year: current.year,
        month: current.month,
      });
    } else {
      const data = await getAttendance(entryYear, entryMonth);
      await setCached(cacheKey, data);
      setAttendance(data);
    }

    setIsLoading(false);
  };

  const { push } = useNavigation();

  const handleClockInOut = async (entry: AttendanceEntry) => {
    const entryDate = new Date(entry.date);

    try {
      // Load form data before pushing
      const year = entryDate.getFullYear();
      const month = entryDate.getMonth() + 1;
      const day = entryDate.getDate();

      const modifyData = await getModifyPageData(year, month, day);
      const detectedFields = modifyData.formFields;
      const rememberedValues = await getAllRememberedFieldValues();

      // Get stored schema and compare
      const storedSchema = await getStoredFieldSchema();
      const schemaChanged = hasFieldSchemaChanged(detectedFields, storedSchema);

      // Check if all required fields have stored values
      const allRequiredFieldsHaveValues = detectedFields
        .filter((f) => f.required)
        .every((f) => rememberedValues[f.name]);

      // If schema unchanged and all required fields have values, proceed directly
      if (!schemaChanged && allRequiredFieldsHaveValues) {
        // Execute clock with stored values
        try {
          await clockInOut(entryDate, rememberedValues as Record<string, string>);
          await showToast({
            style: Toast.Style.Success,
            title: "Success",
            message: "Clock In & Out completed successfully",
          });
          await handleClockSuccess(entry);
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: error instanceof Error ? error.message : "Failed to clock in/out",
          });
          // Show form on error so user can fix values
          push(
            <ClockFormWrapper
              entryDate={entryDate}
              fields={detectedFields}
              rememberedValues={rememberedValues}
              onSuccess={() => handleClockSuccess(entry)}
            />,
          );
        }
        return;
      }

      // Otherwise, push form
      push(
        <ClockFormWrapper
          entryDate={entryDate}
          fields={detectedFields}
          rememberedValues={rememberedValues}
          onSuccess={() => handleClockSuccess(entry)}
        />,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to load form data",
      });
    }
  };

  const commonActions = (entry: AttendanceEntry) => {
    const canClockInOutDay = entry.status === AttendanceStatus.Absence;
    const canClockInOutAll =
      entry.status === AttendanceStatus.Absence && filteredEntries.some((e) => e.status === AttendanceStatus.Absence);
    const isClocking = clockingInOutProgress === entry.date;

    return (
      <ActionPanel>
        {canClockInOutDay && (
          <Action
            title={isClocking ? "Clocking in & out…" : "Clock in & out"}
            icon={isClocking ? Icon.Hourglass : Icon.Clock}
            onAction={() => handleClockInOut(entry)}
          />
        )}
        {canClockInOutAll && <Action title="Clock in & out All" icon={Icon.CheckList} onAction={handleLogAll} />}
        <Action
          title={useGrid ? "Switch to List View" : "Switch to Grid View"}
          icon={useGrid ? Icon.List : Icon.AppWindowGrid3x3}
          onAction={() => setUseGrid(!useGrid)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        />
        <Action
          title={hideHolidays ? "Show Holidays" : "Hide Holidays"}
          icon={Icon.Eye}
          onAction={() => setHideHolidays(!hideHolidays)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
        />
        {useGrid && (
          <Action
            title={"Change Grid Size"}
            icon={Icon.AppWindowGrid3x3}
            onAction={rotateGridColumns}
            shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
          />
        )}
        <ActionPanel.Submenu
          title="Change Icon Pack"
          icon={Icon.Image}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        >
          <Action
            title="Raycast Icons"
            icon={iconPack === "raycast" ? Icon.Check : undefined}
            onAction={() => handleIconPackChange("raycast")}
          />
          <Action
            title="PDuck"
            icon={iconPack === "pduck" ? Icon.Check : undefined}
            onAction={() => handleIconPackChange("pduck")}
          />
          <Action
            title="GIF"
            icon={iconPack === "gif" ? Icon.Check : undefined}
            onAction={() => handleIconPackChange("gif")}
          />
        </ActionPanel.Submenu>
      </ActionPanel>
    );
  };

  if (error && !attendance) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Error Loading Attendance" description={error} />
      </List>
    );
  }

  if (useGrid) {
    return (
      <Grid
        isLoading={isLoading}
        columns={gridColumns}
        searchBarPlaceholder="Search attendance..."
        searchBarAccessory={
          <Grid.Dropdown tooltip="Select Period" value={selectedPeriod} onChange={handlePeriodChange}>
            <Grid.Dropdown.Item key="all" title="All" value="all" />
            <Grid.Dropdown.Item key="last30days" title="Last 30 Days" value="last30days" />
            <Grid.Dropdown.Item key="current" title="Current Month" value="current" />
            <Grid.Dropdown.Item key="previous" title="Previous Month" value="previous" />
          </Grid.Dropdown>
        }
      >
        {filteredEntries.length === 0 && !isLoading ? (
          <Grid.EmptyView
            icon={Icon.Calendar}
            title="No Attendance Data"
            description="No attendance records found for the selected period"
          />
        ) : (
          filteredEntries.map((entry: AttendanceEntry) => {
            const isClocking = clockingInOutProgress === entry.date;
            const icon = isClocking ? Icon.Hourglass : getStatusIcon(entry, iconPack);

            // Determine icon type: string (asset), object with source (custom image), or Icon enum
            const isAsset = typeof icon === "string";
            const isIconObject = typeof icon === "object" && icon !== null && "source" in icon;

            return (
              <GridItem
                key={entry.date}
                title={formatDate(entry.date, entry.dayOfWeek)}
                {...(isAsset
                  ? {
                      assetSource: icon,
                    }
                  : isIconObject
                    ? {
                        icon: icon,
                      }
                    : {
                        // Icon enum - always apply tintColor
                        icon: icon,
                        tintColor: isClocking ? Color.Orange : getStatusColor(entry),
                      })}
                actions={commonActions(entry)}
              />
            );
          })
        )}
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search attendance..."
      searchBarAccessory={
        <List.Dropdown tooltip="Select Period" value={selectedPeriod} onChange={handlePeriodChange}>
          <List.Dropdown.Item key="all" title="All" value="all" />
          <List.Dropdown.Item key="last30days" title="Last 30 Days" value="last30days" />
          <List.Dropdown.Item key="current" title="Current Month" value="current" />
          <List.Dropdown.Item key="previous" title="Previous Month" value="previous" />
        </List.Dropdown>
      }
    >
      {filteredEntries.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Attendance Data"
          description="No attendance records found for the selected period"
        />
      ) : (
        filteredEntries.map((entry: AttendanceEntry) => {
          const isClocking = clockingInOutProgress === entry.date;
          const icon = isClocking ? Icon.Hourglass : getStatusIcon(entry, iconPack);

          // Determine icon type: string (asset), object with source (custom image), or Icon enum
          const isAsset = typeof icon === "string";
          const isIconObject = typeof icon === "object" && icon !== null && "source" in icon;

          return (
            <ListItem
              key={entry.date}
              title={formatDate(entry.date, entry.dayOfWeek)}
              subtitle={
                entry.clockIn && entry.clockOut
                  ? `${entry.clockIn} - ${entry.clockOut}`
                  : entry.shiftTime || entry.holidayType || "No data"
              }
              {...(isAsset
                ? {
                    assetSource: icon,
                  }
                : isIconObject
                  ? {
                      icon: icon,
                    }
                  : {
                      // Icon enum - always apply tintColor
                      icon: icon,
                      tintColor: isClocking ? Color.Orange : getStatusColor(entry),
                    })}
              accessories={[
                ...(entry.workingHours
                  ? [
                      {
                        text: `Hours: ${entry.workingHours}`,
                        icon: Icon.Clock,
                      },
                    ]
                  : []),
                ...(entry.rawStatus.length > 0
                  ? [
                      {
                        text: formatStatus(entry),
                        icon: Icon.Tag,
                      },
                    ]
                  : []),
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Date" text={formatDate(entry.date, entry.dayOfWeek)} />
                      {entry.holidayType && (
                        <List.Item.Detail.Metadata.Label title="Holiday Type" text={entry.holidayType} />
                      )}
                      {entry.shiftTime && <List.Item.Detail.Metadata.Label title="Shift Time" text={entry.shiftTime} />}
                      {entry.clockIn && <List.Item.Detail.Metadata.Label title="Clock In" text={entry.clockIn} />}
                      {entry.clockOut && <List.Item.Detail.Metadata.Label title="Clock Out" text={entry.clockOut} />}
                      {entry.workingHours && (
                        <List.Item.Detail.Metadata.Label title="Working Hours" text={entry.workingHours} />
                      )}
                      {entry.overtime && entry.overtime !== "00:00" && (
                        <List.Item.Detail.Metadata.Label title="Overtime" text={entry.overtime} />
                      )}
                      {entry.nightShift && entry.nightShift !== "00:00" && (
                        <List.Item.Detail.Metadata.Label title="Night Shift" text={entry.nightShift} />
                      )}
                      {entry.break && entry.break !== "00:00" && (
                        <List.Item.Detail.Metadata.Label title="Break" text={entry.break} />
                      )}
                      {entry.rawStatus.length > 0 && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Status" text={formatStatus(entry)} />
                          {entry.statusTooltip && (
                            <List.Item.Detail.Metadata.Label title="Status Details" text={entry.statusTooltip} />
                          )}
                        </>
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={commonActions(entry)}
            />
          );
        })
      )}
    </List>
  );
}
