import { Action, ActionPanel, Color, Icon, List, environment, Keyboard } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import {
  align,
  applyLayout,
  listDisplays,
  nudge,
  placeBeside,
  setOffset,
  toggleRulers,
} from "swift:../swift/screen-align";
import {
  Arrangement,
  Axis,
  Display,
  SIDES,
  driftPercent,
  extentOf,
  formatOffset,
  mainOf,
  offsetFrom,
  pointsPerMM,
  positionOf,
  secondaryOf,
  toMM,
  wording,
} from "./displays";

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(
    async () => (await listDisplays()) as unknown as Arrangement,
  );
  // Captured once, so undo always returns to where the arrangement started.
  const original = useRef<Display[] | null>(null);
  useEffect(() => {
    if (data && !original.current) original.current = data.displays;
  }, [data]);

  const displays = data?.displays ?? [];
  const axis: Axis = data?.axis ?? "vertical";
  const main = mainOf(displays);
  const secondary = secondaryOf(displays);
  const words = wording(axis);

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
    } catch (error) {
      await showFailureToast(error, { title: "Could not change the arrangement" });
    } finally {
      revalidate();
    }
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not read the displays"
          description={error instanceof Error ? error.message : String(error)}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const actions = (display: Display) => {
    const movable = main && !display.isMain;
    const step = pointsPerMM(display, axis);
    return (
      <ActionPanel>
        <Action
          title="Toggle Screen Rulers"
          icon={Icon.Ruler}
          onAction={() => run(() => toggleRulers(environment.supportPath))}
        />
        {movable && (
          <ActionPanel.Section title={`Move ${display.name}`}>
            {[
              { label: words.decrease.label, key: words.decrease.key, sign: -1 },
              { label: words.increase.label, key: words.increase.key, sign: 1 },
            ].flatMap(({ label, key, sign }) => [
              <Action
                key={`${label}-1`}
                title={`${label} 1 Pt`}
                icon={sign < 0 ? Icon.ChevronUp : Icon.ChevronDown}
                shortcut={{ modifiers: ["opt"], key }}
                onAction={() => run(() => nudge(display.id, sign))}
              />,
              <Action
                key={`${label}-10`}
                title={`${label} 10 Pt`}
                icon={sign < 0 ? Icon.ChevronUp : Icon.ChevronDown}
                shortcut={{ modifiers: ["opt", "shift"], key }}
                onAction={() => run(() => nudge(display.id, sign * 10))}
              />,
              <Action
                key={`${label}-mm`}
                title={`${label} 1 Mm (${step} Pt)`}
                icon={sign < 0 ? Icon.ChevronUp : Icon.ChevronDown}
                shortcut={{ modifiers: ["opt", "cmd"], key }}
                onAction={() => run(() => nudge(display.id, sign * step))}
              />,
            ])}
          </ActionPanel.Section>
        )}
        {movable && (
          <ActionPanel.Section title="Snap">
            <Action
              title={words.start.label}
              icon={Icon.ArrowUpCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: words.start.key }}
              onAction={() => run(() => align(display.id, "start"))}
            />
            <Action
              title="Align Centers"
              icon={Icon.Center}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              onAction={() => run(() => align(display.id, "center"))}
            />
            <Action
              title={words.end.label}
              icon={Icon.ArrowDownCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: words.end.key }}
              onAction={() => run(() => align(display.id, "end"))}
            />
            <Action title="Flush with Main" icon={Icon.Maximize} onAction={() => run(() => setOffset(display.id, 0))} />
          </ActionPanel.Section>
        )}
        {movable && (
          <ActionPanel.Section title="Rearrange">
            {SIDES.map(({ label, side }) => (
              <Action
                key={side}
                title={label}
                icon={Icon.AppWindowGrid2x2}
                onAction={() => run(() => placeBeside(display.id, side))}
              />
            ))}
          </ActionPanel.Section>
        )}
        <ActionPanel.Section>
          <Action
            title="Undo Changes"
            icon={Icon.ArrowCounterClockwise}
            shortcut={{ modifiers: ["cmd"], key: "z" }}
            onAction={() => run(() => applyLayout((original.current ?? []).map(({ uuid, x, y }) => ({ uuid, x, y }))))}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => revalidate()}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search Displays"
      selectedItemId={secondary ? String(secondary.id) : undefined}
    >
      {displays.length === 0 && !isLoading && <List.EmptyView title="No displays found" icon={Icon.Monitor} />}
      {displays.map((display) => (
        <List.Item
          key={display.id}
          id={String(display.id)}
          title={display.name}
          icon={display.isMain ? Icon.Monitor : Icon.Desktop}
          accessories={[
            display.isMain
              ? { tag: { value: "Main", color: Color.SecondaryText } }
              : main
                ? { tag: { value: `${offsetFrom(display, main, axis)} pt`, color: Color.Blue } }
                : {},
          ]}
          detail={<Detail display={display} main={main} axis={axis} />}
          actions={actions(display)}
        />
      ))}
    </List>
  );
}

function Detail({ display, main, axis }: { display: Display; main?: Display; axis: Axis }) {
  const drift = main ? driftPercent(display, main, axis) : 0;
  const words = wording(axis);
  const density = axis === "vertical" ? display.ptPerMMY : display.ptPerMMX;
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Position" text={`x ${display.x}, y ${display.y} pt`} />
          <List.Item.Detail.Metadata.Label title="Size" text={`${display.width} × ${display.height} pt`} />
          <List.Item.Detail.Metadata.Label
            title="Panel"
            text={
              display.widthMM > 0
                ? `${display.widthMM.toFixed(0)} × ${display.heightMM.toFixed(0)} mm`
                : "No physical size reported"
            }
          />
          <List.Item.Detail.Metadata.Label
            title="Density"
            text={
              density > 0
                ? `${density.toFixed(3)} pt/mm ${axis === "vertical" ? "vertically" : "horizontally"}`
                : "Unknown — rulers show no scale"
            }
          />
          <List.Item.Detail.Metadata.Separator />
          {main && !display.isMain ? (
            <>
              <List.Item.Detail.Metadata.Label title="Arrangement" text={words.arrangement} />
              <List.Item.Detail.Metadata.Label title={words.offset} text={formatOffset(display, main, axis)} />
              <List.Item.Detail.Metadata.Label title="Pinned by macOS" text={words.pinned} />
              <List.Item.Detail.Metadata.Label
                title="Drift away from the match line"
                text={
                  Math.abs(drift) < 0.5
                    ? "None — the two densities match"
                    : `${drift > 0 ? "+" : ""}${drift.toFixed(1)}% per cm traveled`
                }
              />
              <List.Item.Detail.Metadata.Label title="Shared edge" text={overlapText(display, main, axis)} />
            </>
          ) : (
            <List.Item.Detail.Metadata.Label
              title="Anchor"
              text="macOS keeps the main display at the origin; the others move around it"
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function overlapText(display: Display, main: Display, axis: Axis) {
  const start = Math.max(positionOf(display, axis), positionOf(main, axis));
  const end = Math.min(
    positionOf(display, axis) + extentOf(display, axis),
    positionOf(main, axis) + extentOf(main, axis),
  );
  const points = end - start;
  if (points <= 0) return "None — the pointer cannot cross between them";
  const mm = toMM(display, points, axis);
  return mm > 0
    ? `${points} pt (${mm.toFixed(0)} mm) where the pointer can cross`
    : `${points} pt where the pointer can cross`;
}
