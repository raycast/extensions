import {
  Action,
  ActionPanel,
  Form,
  Grid,
  Icon,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CaptureActions } from "./capture";
import {
  getCaptureImage,
  listApplications,
  listDomains,
  type CaptureDetail,
  type TimelineArgs,
} from "./coast";
import { filterGalleryFrames, loadGalleryFrames } from "./gallery-data";
import { offsetDate, readableTime, recentRange, today } from "./dates";
import { useLoad } from "./use-load";

export function GalleryFilters({
  onApply,
  initial,
}: {
  onApply: (app: string, domain: string) => void;
  initial?: { app: string; domain: string };
}) {
  const { pop } = useNavigation();
  const load = useCallback(
    async () => ({
      apps: await listApplications(),
      domains: await listDomains(),
    }),
    [],
  );
  const state = useLoad(load);
  return (
    <Form
      isLoading={state.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply Filters"
            onSubmit={(values: { app: string; domain: string }) => {
              onApply(values.app, values.domain);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          state.error ||
          "Choose an application and/or domain. Both filters apply together."
        }
      />
      <Form.Dropdown
        id="app"
        title="Application"
        defaultValue={initial?.app || ""}
      >
        <Form.Dropdown.Item value="" title="All Applications" />
        {state.data?.apps.map((app) => (
          <Form.Dropdown.Item
            key={app.bundle_id}
            value={app.bundle_id}
            title={app.display_name || app.bundle_id}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="domain"
        title="Domain"
        defaultValue={initial?.domain || ""}
      >
        <Form.Dropdown.Item value="" title="All Domains" />
        {state.data?.domains.map((domain) => (
          <Form.Dropdown.Item key={domain} value={domain} title={domain} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function ScreenshotGrid({
  frames,
  scope,
  isLoading,
  error,
  retry,
  accessory,
  onFilter,
}: {
  frames: CaptureDetail[];
  scope: TimelineArgs;
  isLoading: boolean;
  error?: string;
  retry: () => void;
  accessory: Parameters<typeof Grid>[0]["searchBarAccessory"];
  onFilter: (app: string, domain: string) => void;
}) {
  const [visible, setVisible] = useState(12);
  const [query, setQuery] = useState("");
  const matchingFrames = useMemo(
    () => filterGalleryFrames(frames, query),
    [frames, query],
  );
  const [images, setImages] = useState<
    Record<number, { path?: string; error?: string }>
  >({});
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    let active = true;
    const queue = matchingFrames
      .slice(0, visible)
      .filter((frame) => !images[frame.frame_id]);
    async function worker() {
      while (active && queue.length) {
        const frame = queue.shift()!;
        let result: { path?: string; error?: string };
        try {
          result = { path: await getCaptureImage(frame.frame_id) };
        } catch {
          result = { error: "Screenshot unavailable" };
        }
        if (active)
          setImages((current) => ({ ...current, [frame.frame_id]: result }));
      }
    }
    void Promise.all([worker(), worker(), worker()]);
    return () => {
      active = false;
    };
    // Images are accumulated by this batch; changing them must not restart it.
  }, [matchingFrames, visible, generation]);
  const filterAction = (
    <Action.Push
      title="Filter Application and Domain…"
      icon={Icon.Filter}
      target={
        <GalleryFilters
          initial={{
            app: scope.appFilters?.[0] || "",
            domain: scope.domainFilters?.[0] || "",
          }}
          onApply={onFilter}
        />
      }
    />
  );
  return (
    <Grid
      columns={3}
      aspectRatio="16/9"
      fit={Grid.Fit.Contain}
      isLoading={isLoading}
      searchBarAccessory={accessory}
      searchBarPlaceholder="Filter captured titles…"
      filtering={false}
      onSearchTextChange={(value) => {
        setQuery(value);
        setVisible(12);
      }}
      pagination={{
        pageSize: 12,
        hasMore: visible < matchingFrames.length,
        onLoadMore: () => setVisible((count) => count + 12),
      }}
    >
      <Grid.EmptyView
        title={error ? "Could Not Load Gallery" : "No Recorded Moments"}
        description={error || "Try another time range or clear the filters."}
        actions={
          <ActionPanel>
            <Action title="Refresh" onAction={retry} />
            {filterAction}
          </ActionPanel>
        }
      />
      <Grid.Section
        title={`${Math.min(visible, matchingFrames.length)} of ${matchingFrames.length} selected moments`}
        subtitle="Screenshots stay local until explicitly shared"
      >
        {matchingFrames.slice(0, visible).map((capture) => (
          <Grid.Item
            key={capture.frame_id}
            content={
              images[capture.frame_id]?.path
                ? { source: images[capture.frame_id].path! }
                : Icon.Image
            }
            title={capture.title || capture.application}
            subtitle={
              images[capture.frame_id]?.error ||
              `${capture.application} · ${readableTime(capture.timestamp)}`
            }
            actions={
              <CaptureActions
                capture={capture}
                frames={matchingFrames}
                scope={scope}
              >
                {visible < matchingFrames.length ? (
                  <Action
                    title="Load More Moments"
                    icon={Icon.ArrowDown}
                    onAction={() => setVisible((count) => count + 12)}
                  />
                ) : null}
                {filterAction}
                <Action
                  title="Refresh Gallery"
                  icon={Icon.ArrowClockwise}
                  onAction={() => {
                    setImages({});
                    setGeneration((value) => value + 1);
                    retry();
                  }}
                />
              </CaptureActions>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}

export default function Command() {
  const [preset, setPreset] = useState("30m");
  const [filters, setFilters] = useState({ app: "", domain: "" });
  const [revision, setRevision] = useState(0);
  const scope = useMemo(
    () => ({
      tr:
        preset === "30m"
          ? recentRange(30)
          : preset === "1h"
            ? recentRange(60)
            : preset === "yesterday"
              ? offsetDate(1)
              : today(),
      appFilters: filters.app ? [filters.app] : undefined,
      domainFilters: filters.domain ? [filters.domain] : undefined,
    }),
    [preset, filters, revision],
  );
  const load = useCallback(
    () => loadGalleryFrames(scope, preset === "30m"),
    [scope, preset],
  );
  const state = useLoad(load);
  const frames = useMemo(() => state.data || [], [state.data]);
  return (
    <ScreenshotGrid
      key={JSON.stringify(scope)}
      frames={frames}
      scope={scope}
      isLoading={state.isLoading}
      error={state.error}
      retry={() => setRevision((value) => value + 1)}
      onFilter={(app, domain) => setFilters({ app, domain })}
      accessory={
        <Grid.Dropdown
          tooltip="Gallery Range"
          value={preset}
          onChange={setPreset}
          storeValue
        >
          <Grid.Dropdown.Item title="Last 30 Minutes" value="30m" />
          <Grid.Dropdown.Item title="Last Hour Highlights" value="1h" />
          <Grid.Dropdown.Item title="Today Highlights" value="today" />
          <Grid.Dropdown.Item title="Yesterday Highlights" value="yesterday" />
        </Grid.Dropdown>
      }
    />
  );
}
