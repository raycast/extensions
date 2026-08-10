import { Grid, Icon, getPreferenceValues } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useEffect, useState } from "react";
import { cursors } from "./data/cursors";
import { CursorActions } from "./actions";
import { prepareQuickLook, quickLookPath } from "./lib/png";
import { DEFAULT_BACKDROP, svgToDataUri, withBackdrop, type Backdrop } from "./lib/svg";
import { reportFailure } from "./lib/toast";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const columns = parseInt(preferences.gridSize, 10);

  const {
    value: backdrop,
    setValue: setBackdrop,
    isLoading,
  } = useLocalStorage<Backdrop>("preview-backdrop", DEFAULT_BACKDROP);
  const activeBackdrop = backdrop ?? DEFAULT_BACKDROP;
  // With a backdrop, the fill is baked into the SVG and must reach the tile
  // edges, so drop the inset; without one, keep the roomy default framing.
  const inset = activeBackdrop === DEFAULT_BACKDROP ? Grid.Inset.Large : undefined;

  // Pre-render PNGs once so Quick Look (⌘Y) has a file ready to preview. The
  // path is deterministic, but the file doesn't exist until it's rendered, so
  // track two things separately: whether prep has finished (drives the spinner)
  // and which cursors actually landed on disk (gates each tile's `quickLook`).
  // A per-cursor render failure must not expose ⌘Y on a missing file, and the
  // spinner must clear regardless — the tiles work fine without Quick Look.
  const [prepDone, setPrepDone] = useState(false);
  const [readyIds, setReadyIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    prepareQuickLook(cursors)
      .then(setReadyIds)
      .catch((error) => reportFailure("Couldn't prepare Quick Look previews", error))
      .finally(() => setPrepDone(true));
  }, []);

  return (
    <Grid columns={columns} inset={inset} isLoading={isLoading || !prepDone}>
      {cursors.map((cursor) => (
        <Grid.Item
          key={cursor.id}
          title={cursor.name}
          subtitle={cursor.nonStandard ? "macOS-only" : undefined}
          content={{ value: svgToDataUri(withBackdrop(cursor.svg, activeBackdrop)), tooltip: cursor.name }}
          quickLook={readyIds.has(cursor.id) ? { path: quickLookPath(cursor.id), name: cursor.name } : undefined}
          accessory={
            cursor.nonStandard ? { icon: Icon.Star, tooltip: "macOS-specific cursor (no CSS equivalent)" } : undefined
          }
          actions={
            <CursorActions
              cursor={cursor}
              primaryAction={preferences.primaryAction}
              backdrop={activeBackdrop}
              setBackdrop={setBackdrop}
            />
          }
        />
      ))}
    </Grid>
  );
}
