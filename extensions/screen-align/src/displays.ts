export type Display = {
  id: number;
  uuid: string;
  name: string;
  isMain: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  widthMM: number;
  heightMM: number;
  ptPerMMX: number;
  ptPerMMY: number;
};

/// The direction the displays can still be moved in. macOS pins them flush along the
/// edge they share, so side by side leaves vertical free and stacked leaves horizontal.
export type Axis = "vertical" | "horizontal";

export type Arrangement = { axis: Axis; displays: Display[] };

export const positionOf = (display: Display, axis: Axis) => (axis === "vertical" ? display.y : display.x);

export const extentOf = (display: Display, axis: Axis) =>
  axis === "vertical" ? display.height : display.width;

export const densityOf = (display: Display, axis: Axis) =>
  axis === "vertical" ? display.ptPerMMY : display.ptPerMMX;

export const toMM = (display: Display, points: number, axis: Axis) => {
  const density = densityOf(display, axis);
  return density > 0 ? points / density : 0;
};

/// How many points make up a millimeter on this display, never less than one.
export const pointsPerMM = (display: Display, axis: Axis) =>
  Math.max(1, Math.round(densityOf(display, axis)));

export const mainOf = (displays: Display[]) => displays.find((d) => d.isMain);

export const secondaryOf = (displays: Display[]) => displays.find((d) => !d.isMain);

/// Distance from the arrangement where the leading edges line up.
export const offsetFrom = (display: Display, main: Display, axis: Axis) =>
  positionOf(display, axis) - positionOf(main, axis);

export const formatOffset = (display: Display, main: Display, axis: Axis) => {
  const points = offsetFrom(display, main, axis);
  const mm = toMM(display, points, axis);
  const sign = points > 0 ? "+" : "";
  return `${sign}${points} pt (${sign}${mm.toFixed(1)} mm)`;
};

/// The two screens only agree physically at one point when their densities differ; this
/// is how fast they drift apart either side of the match line.
export const driftPercent = (display: Display, main: Display, axis: Axis) => {
  const here = densityOf(display, axis);
  const there = densityOf(main, axis);
  if (!here || !there) return 0;
  return (there / here - 1) * 100;
};

/// Everything whose wording depends on which way the displays can move.
///
/// `decrease` and `increase` describe what happens to the display itself, which is what
/// the Arrange list shows. The ruler overlay is the other way round on purpose: there you
/// are watching the match line, so the keys move the line and the display follows.
export const wording = (axis: Axis) =>
  axis === "vertical"
    ? {
        arrangement: "Side by side",
        pinned: "Horizontal position is pinned by macOS",
        decrease: { label: "Up", key: "arrowUp" as const },
        increase: { label: "Down", key: "arrowDown" as const },
        start: { label: "Align Tops", key: "t" as const },
        end: { label: "Align Bottoms", key: "b" as const },
        sides: [
          { label: "Put on the Left", side: "left", key: "arrowLeft" as const },
          { label: "Put on the Right", side: "right", key: "arrowRight" as const },
        ],
        offset: "Offset from aligned tops",
      }
    : {
        arrangement: "Stacked",
        pinned: "Vertical position is pinned by macOS",
        decrease: { label: "Left", key: "arrowLeft" as const },
        increase: { label: "Right", key: "arrowRight" as const },
        start: { label: "Align Left Edges", key: "l" as const },
        end: { label: "Align Right Edges", key: "r" as const },
        sides: [
          { label: "Put Above", side: "above", key: "arrowUp" as const },
          { label: "Put Below", side: "below", key: "arrowDown" as const },
        ],
        offset: "Offset from aligned left edges",
      };
