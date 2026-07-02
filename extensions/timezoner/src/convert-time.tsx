import {
  Action,
  ActionPanel,
  environment,
  Form,
  getPreferenceValues,
  Grid,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { resolveTimezone } from "./aliases";
import { parseQuery, parseTimeForZone } from "./parser";
import {
  buildReferenceDate,
  formatTime,
  formatDate,
  formatForCopy,
  formatAllForCopy,
} from "./formatter";
import {
  buildSvgDataUri,
  buildZoneCardSvg,
  buildTimezoneMapSvg,
  TIMEZONE_MAP_ASPECT_RATIO,
} from "./map-preview";
import { buildTimeZonerURL } from "./timezoner-url";
import {
  addZone,
  loadZones,
  removeZone,
  replaceZone,
  saveZones,
} from "./zones";
import type { ParsedConversionQuery, ZoneInfo, ZoneResult } from "./types";

interface ZoneFormValues {
  label: string;
  zone: string;
}

interface EditingClock {
  baseline: ParsedConversionQuery;
  label: string;
  timezone: string;
  anchorDate: Date;
}

const SYSTEM_TIME_SETTINGS_TARGET =
  "/System/Library/PreferencePanes/DateAndTime.prefPane";

function appendMissingZone(zones: ZoneInfo[], zone: ZoneInfo): ZoneInfo[] {
  if (zones.some((existing) => existing.timezone === zone.timezone)) {
    return zones;
  }
  return [...zones, zone];
}

function hasSavedZone(zones: ZoneInfo[], zone: ZoneInfo): boolean {
  return zones.some((savedZone) => savedZone.timezone === zone.timezone);
}

function zoneGridItemId(zone: Pick<ZoneInfo, "timezone">): string {
  return `zone-${zone.timezone}`;
}

function errorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

function ZoneForm(props: {
  initialLabel?: string;
  initialZone?: string;
  mode: "add" | "edit";
  onSave: (zone: ZoneInfo) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [label, setLabel] = useState(props.initialLabel ?? "");
  const [zone, setZone] = useState(props.initialZone ?? "");
  const title = props.mode === "add" ? "Add Zone" : "Edit Zone";

  async function handleSubmit(values: ZoneFormValues) {
    const zoneInput = values.zone.trim();
    const timezone = resolveTimezone(zoneInput);

    if (!timezone) {
      await showToast(
        Toast.Style.Failure,
        "Unknown city or timezone",
        zoneInput || "Enter a city, abbreviation, or IANA timezone",
      );
      return;
    }

    await props.onSave({
      label: values.label.trim() || zoneInput,
      timezone,
    });
    pop();
  }

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={title}
            icon={props.mode === "add" ? Icon.Plus : Icon.Pencil}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="label"
        title="Label"
        placeholder="SF"
        value={label}
        onChange={setLabel}
      />
      <Form.TextField
        id="zone"
        title="City or Timezone"
        placeholder="San Francisco, SF, or America/Los_Angeles"
        value={zone}
        onChange={setZone}
      />
      <Form.Description text="Examples: SF, Tokyo, Hong Kong, London, America/New_York" />
    </Form>
  );
}

export default function ConvertTime() {
  const prefs = getPreferenceValues<Preferences>();
  const [zones, setZones] = useState<ZoneInfo[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [editingClock, setEditingClock] = useState<EditingClock | undefined>();
  const [editHasTyped, setEditHasTyped] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const zoneLoadVersionRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadVersion = zoneLoadVersionRef.current;
    setIsLoadingZones(true);

    loadZones(prefs.defaultZones)
      .then((loadedZones) => {
        if (!cancelled && zoneLoadVersionRef.current === loadVersion) {
          setZones(loadedZones);
        }
      })
      .catch(async (error: unknown) => {
        if (!cancelled && zoneLoadVersionRef.current === loadVersion) {
          await showToast(
            Toast.Style.Failure,
            "Could not load zones",
            errorMessage(error),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingZones(false);
      });

    return () => {
      cancelled = true;
    };
  }, [prefs.defaultZones]);

  const parsed = useMemo(
    () =>
      !editingClock && searchText.trim() ? parseQuery(searchText) : undefined,
    [editingClock, searchText],
  );
  const parsedConversion = parsed?.kind === "conversion" ? parsed : undefined;
  const editingConversion = useMemo(() => {
    if (!editingClock) return undefined;

    const trimmed = searchText.trim();
    if (!trimmed) return editingClock.baseline;

    const parsed = parseTimeForZone(
      trimmed,
      editingClock.label,
      editingClock.timezone,
    );

    return parsed
      ? { ...parsed, anchorDate: editingClock.anchorDate }
      : editingClock.baseline;
  }, [editingClock, searchText]);
  const conversion = parsedConversion ?? editingConversion;

  function handleSearchTextChange(value: string) {
    if (editingClock) {
      if (editHasTyped && !value.trim()) {
        setSearchText("");
        setEditingClock(undefined);
        setEditHasTyped(false);
        return;
      }

      if (value.trim()) setEditHasTyped(true);
      setSearchText(value);
      return;
    }

    setSearchText(value);
  }

  function resetSearchMode() {
    setSearchText("");
    setEditingClock(undefined);
    setEditHasTyped(false);
  }

  const refDate = useMemo(
    () =>
      conversion
        ? buildReferenceDate(
            conversion.hour,
            conversion.minute,
            conversion.sourceTimezone,
            conversion.anchorDate,
          )
        : now,
    [conversion, now],
  );

  const displayZones = useMemo(() => {
    if (!conversion) return zones;

    let next = appendMissingZone(zones, {
      label: conversion.sourceLabel,
      timezone: conversion.sourceTimezone,
    });

    if (conversion.targetTimezone && conversion.targetLabel) {
      next = appendMissingZone(next, {
        label: conversion.targetLabel,
        timezone: conversion.targetTimezone,
      });
    }

    return next;
  }, [conversion, zones]);

  const results = useMemo(
    (): ZoneResult[] =>
      displayZones.map((zone) => ({
        ...zone,
        time: formatTime(refDate, zone.timezone, prefs.timeFormat),
        date: formatDate(refDate, zone.timezone),
        isSource: conversion
          ? zone.timezone === conversion.sourceTimezone
          : false,
        isTarget: conversion?.targetTimezone
          ? zone.timezone === conversion.targetTimezone
          : false,
      })),
    [displayZones, refDate, conversion, prefs.timeFormat],
  );

  const mapSvg = useMemo(
    () =>
      results.length > 0
        ? buildTimezoneMapSvg(
            results,
            refDate,
            undefined,
            environment.appearance,
          )
        : "",
    [results, refDate],
  );
  const mapImageUrl = useMemo(
    () => (mapSvg ? buildSvgDataUri(mapSvg) : undefined),
    [mapSvg],
  );
  const cardImageUrls = useMemo(
    () =>
      Object.fromEntries(
        results.map((zone) => {
          const svg = buildZoneCardSvg(zone, environment.appearance);
          return [zone.timezone, buildSvgDataUri(svg)];
        }),
      ),
    [results],
  );
  const zoneResultByItemId = useMemo(
    () => new Map(results.map((zone) => [zoneGridItemId(zone), zone])),
    [results],
  );

  async function handleAddZone(zone: ZoneInfo) {
    zoneLoadVersionRef.current += 1;
    setIsLoadingZones(false);

    try {
      const currentZones = await loadZones(prefs.defaultZones);
      const next = addZone(currentZones, zone);
      await saveZones(next);
      setZones(next);
      resetSearchMode();
      await showToast(Toast.Style.Success, `Added ${zone.label}`);
    } catch (error) {
      await showToast(
        Toast.Style.Failure,
        `Could not add ${zone.label}`,
        errorMessage(error),
      );
    }
  }

  async function handleEditZone(originalTimezone: string, zone: ZoneInfo) {
    zoneLoadVersionRef.current += 1;
    setIsLoadingZones(false);

    try {
      const currentZones = await loadZones(prefs.defaultZones);
      const next = replaceZone(currentZones, originalTimezone, zone);
      await saveZones(next);
      setZones(next);
      resetSearchMode();
      await showToast(Toast.Style.Success, `Saved ${zone.label}`);
    } catch (error) {
      await showToast(
        Toast.Style.Failure,
        `Could not save ${zone.label}`,
        errorMessage(error),
      );
    }
  }

  async function enterEditModeForZone(zone: ZoneResult) {
    const conversion = parseTimeForZone(zone.time, zone.label, zone.timezone);

    if (!conversion) {
      await showToast(
        Toast.Style.Failure,
        `Could not edit ${zone.label} time`,
        "Try typing 4:30 PM in the search bar",
      );
      return;
    }

    setSelectedItemId(zoneGridItemId(zone));
    setEditingClock({
      baseline: { ...conversion, anchorDate: refDate },
      label: zone.label,
      timezone: zone.timezone,
      anchorDate: refDate,
    });
    setEditHasTyped(false);
    setSearchText("");
    await showToast(
      Toast.Style.Success,
      `Editing ${zone.label}`,
      "Type a new time in the search bar",
    );
  }

  async function handleEditTimeInSearch(zone: ZoneResult) {
    await enterEditModeForZone(zone);
  }

  function handleSelectionChange(id: string | null) {
    setSelectedItemId(id ?? undefined);
    if (!id) return;
    if (!editingClock) return;

    const zone = zoneResultByItemId.get(id);
    if (!zone || zone.timezone === editingClock.timezone) return;

    void enterEditModeForZone(zone);
  }

  async function handleRemoveZone(label: string) {
    zoneLoadVersionRef.current += 1;
    setIsLoadingZones(false);

    try {
      const currentZones = await loadZones(prefs.defaultZones);
      const next = removeZone(currentZones, label);
      if (next.length === currentZones.length) {
        await showToast(Toast.Style.Failure, `No zone matched ${label}`);
        return;
      }

      await saveZones(next);
      setZones(next);
      resetSearchMode();
      await showToast(Toast.Style.Success, `Removed ${label}`);
    } catch (error) {
      await showToast(
        Toast.Style.Failure,
        `Could not remove ${label}`,
        errorMessage(error),
      );
    }
  }

  const openURL = buildTimeZonerURL(conversion);
  const searchBarPlaceholder = editingClock
    ? `Change time for ${editingClock.label}: 4:30 PM, 16:30, 15, 430pm, noon, midnight`
    : "3pm in SF, Tokyo, remove NYC...";
  const searchModeKey = editingClock
    ? `editing-${editingClock.timezone}`
    : "normal-search";

  return (
    <Grid
      key={searchModeKey}
      isLoading={isLoadingZones}
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder={searchBarPlaceholder}
      selectedItemId={selectedItemId}
      onSelectionChange={handleSelectionChange}
      filtering={false}
      throttle
      columns={3}
      aspectRatio="3/2"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Zero}
    >
      {parsed?.kind === "addZone" ? (
        <Grid.Item
          content={Icon.Plus}
          title={`Add ${parsed.label}`}
          subtitle={parsed.timezone}
          actions={
            <ActionPanel>
              <Action
                title="Add Zone"
                icon={Icon.Plus}
                onAction={() =>
                  handleAddZone({
                    label: parsed.label,
                    timezone: parsed.timezone,
                  })
                }
              />
              <Action.Push
                title="Edit Before Adding"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={
                  <ZoneForm
                    mode="add"
                    initialLabel={parsed.label}
                    initialZone={parsed.label}
                    onSave={handleAddZone}
                  />
                }
              />
              <Action.Open
                title="Open in Timezoner"
                target="timezoner://open"
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </ActionPanel>
          }
        />
      ) : parsed?.kind === "removeZone" ? (
        <Grid.Item
          content={Icon.Minus}
          title={`Remove ${parsed.label}`}
          subtitle="Remove a matching label or timezone"
          actions={
            <ActionPanel>
              <Action
                title="Remove Zone"
                icon={Icon.Minus}
                onAction={() => handleRemoveZone(parsed.label)}
              />
              <Action.Push
                title="Add Zone"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<ZoneForm mode="add" onSave={handleAddZone} />}
              />
              <Action.Open
                title="Open in Timezoner"
                target="timezoner://open"
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </ActionPanel>
          }
        />
      ) : results.length === 0 && !isLoadingZones ? (
        <Grid.Item
          content={Icon.Plus}
          title="Add Zone"
          subtitle="Create your first saved zone"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Zone"
                icon={Icon.Plus}
                target={<ZoneForm mode="add" onSave={handleAddZone} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <Grid.Section
            columns={Math.min(4, Math.max(1, results.length))}
            aspectRatio="16/9"
            fit={Grid.Fit.Fill}
            inset={Grid.Inset.Zero}
          >
            {results.map((zone, index) => {
              const savedZone = hasSavedZone(zones, zone);

              return (
                <Grid.Item
                  key={`${zone.label}-${index}`}
                  id={zoneGridItemId(zone)}
                  content={{
                    value: cardImageUrls[zone.timezone] ?? { color: "#242422" },
                    tooltip: `${zone.time} in ${zone.label}. Press Enter to edit this clock.`,
                  }}
                  keywords={[zone.label, zone.timezone, zone.time, zone.date]}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Edit Clock Time"
                        icon={Icon.Clock}
                        onAction={() => handleEditTimeInSearch(zone)}
                      />
                      {!savedZone ? (
                        <Action
                          title="Add Zone"
                          icon={Icon.Plus}
                          onAction={() =>
                            handleAddZone({
                              label: zone.label,
                              timezone: zone.timezone,
                            })
                          }
                        />
                      ) : null}
                      {savedZone ? (
                        <Action.Push
                          title="Edit Zone"
                          icon={Icon.Pencil}
                          shortcut={{ modifiers: ["cmd"], key: "e" }}
                          target={
                            <ZoneForm
                              mode="edit"
                              initialLabel={zone.label}
                              initialZone={zone.timezone}
                              onSave={(updatedZone) =>
                                handleEditZone(zone.timezone, updatedZone)
                              }
                            />
                          }
                        />
                      ) : null}
                      <Action.Push
                        title={savedZone ? "Add Zone" : "Edit Before Adding"}
                        icon={savedZone ? Icon.Plus : Icon.Pencil}
                        shortcut={{
                          modifiers: ["cmd"],
                          key: savedZone ? "n" : "e",
                        }}
                        target={
                          <ZoneForm
                            mode="add"
                            initialLabel={savedZone ? undefined : zone.label}
                            initialZone={savedZone ? undefined : zone.timezone}
                            onSave={handleAddZone}
                          />
                        }
                      />
                      <Action.CopyToClipboard
                        title="Copy Time"
                        content={formatForCopy(
                          refDate,
                          zone.timezone,
                          zone.label,
                          prefs.timeFormat,
                          prefs.copyFormat,
                        )}
                      />
                      <Action.CopyToClipboard
                        title="Copy All Times"
                        content={formatAllForCopy(
                          refDate,
                          displayZones,
                          prefs.timeFormat,
                          prefs.copyFormat,
                        )}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                      {savedZone ? (
                        <Action
                          title="Remove Zone"
                          icon={Icon.Minus}
                          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                          onAction={() => handleRemoveZone(zone.label)}
                        />
                      ) : null}
                      <Action.Open
                        title="Open in Timezoner"
                        target={openURL}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                      <Action.Open
                        title="Open System Timezone Settings"
                        icon={Icon.Gear}
                        target={SYSTEM_TIME_SETTINGS_TARGET}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </Grid.Section>
          <Grid.Section
            columns={1}
            aspectRatio={TIMEZONE_MAP_ASPECT_RATIO}
            fit={Grid.Fit.Fill}
            inset={Grid.Inset.Zero}
          >
            <Grid.Item
              id="timezone-map"
              content={mapImageUrl ?? { color: "#242422" }}
              keywords={["map", "timezone", "world"]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Add Zone"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={<ZoneForm mode="add" onSave={handleAddZone} />}
                  />
                  <Action.CopyToClipboard
                    title="Copy All Times"
                    content={formatAllForCopy(
                      refDate,
                      displayZones,
                      prefs.timeFormat,
                      prefs.copyFormat,
                    )}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.Open
                    title="Open in Timezoner"
                    target={openURL}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action.Open
                    title="Open System Timezone Settings"
                    icon={Icon.Gear}
                    target={SYSTEM_TIME_SETTINGS_TARGET}
                  />
                </ActionPanel>
              }
            />
          </Grid.Section>
        </>
      )}
    </Grid>
  );
}
