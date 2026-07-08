/**
 * SVG chart kit — now built on **visx** (Airbnb's low-level D3 + React viz
 * primitives) instead of hand-written SVG path strings.
 *
 * Raycast views render no live DOM, so visx components can't mount. Instead each
 * chart is a visx React tree rendered to a static SVG **string** via
 * `renderToStaticMarkup`, then encoded as an inline `data:image/svg+xml;base64`
 * image that Raycast's Detail/List markdown embeds via `![](…)`. Same delivery as
 * before — only the drawing layer changed:
 *
 *   • `@visx/scale`   — scaleLinear maps data → pixels
 *   • `@visx/shape`   — AreaClosed, LinePath, Bar, Arc, Pie, Line
 *   • `@visx/curve`   — curveCatmullRom smoothing (replaces the manual Catmull-Rom)
 *   • `@visx/gradient`— LinearGradient defs (replaces inline <linearGradient>)
 *   • `@visx/group`   — Group translate wrappers
 *
 * `defined` accessors give visx native null-gap handling, so the old manual
 * "split into contiguous runs" logic is gone. Every SVG background stays
 * transparent and ink/grid tones adapt to `environment.appearance`. Each chart is
 * its own SVG document, so gradient ids are safely reused across charts.
 */
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Color, environment } from "@raycast/api";
import { scaleLinear } from "@visx/scale";
import { Arc, AreaClosed, Bar, Line, LinePath, Pie } from "@visx/shape";
import { LinearGradient } from "@visx/gradient";
import { curveCatmullRom } from "@visx/curve";
import { Group } from "@visx/group";

// ── palette + theme ─────────────────────────────────────────────────────────

/** Map a Raycast Color (or pass-through hex) to a vivid hex for SVG strokes/fills. */
export function colorToHex(c: Color | string): string {
  if (typeof c === "string" && c.startsWith("#")) return c;
  switch (c) {
    case Color.Green:
      return "#34d399";
    case Color.Yellow:
      return "#f5c542";
    case Color.Red:
      return "#f0616d";
    case Color.Blue:
      return "#3291ff";
    case Color.Purple:
      return "#a78bfa";
    case Color.Orange:
      return "#f59e0b";
    case Color.Magenta:
      return "#e879c9";
    default:
      return "#8b93a1";
  }
}

interface Theme {
  ink: string;
  faint: string;
  grid: string;
  track: string;
}
function theme(): Theme {
  const dark = environment.appearance === "dark";
  return dark
    ? {
        ink: "#c7ccd4",
        faint: "#8b93a1",
        grid: "rgba(255,255,255,0.07)",
        track: "rgba(255,255,255,0.10)",
      }
    : {
        ink: "#3a3f47",
        faint: "#7a828e",
        grid: "rgba(0,0,0,0.06)",
        track: "rgba(0,0,0,0.08)",
      };
}

const FONT = "-apple-system,BlinkMacSystemFont,system-ui,sans-serif";

// ── encoding ────────────────────────────────────────────────────────────────

/** Render a visx/React SVG tree to a static markup string. */
function render(node: ReactElement): string {
  return renderToStaticMarkup(node);
}
function uri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
/** Wrap a raw SVG document as a markdown image line. */
export function chartImage(svg: string, alt = "chart"): string {
  return `![${alt}](${uri(svg)})`;
}
/** A bare data-URI for an SVG — usable as a Raycast `Image` source (e.g. an accessory icon). */
export function svgIcon(svg: string): string {
  return uri(svg);
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/** Root <svg> document with transparent background and the system font. */
function Svg(props: {
  width: number;
  height: number;
  children: React.ReactNode;
}): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.width}
      height={props.height}
      viewBox={`0 0 ${props.width} ${props.height}`}
      fontFamily={FONT}
    >
      {props.children}
    </svg>
  );
}

const isNum = (v: number | null | undefined): v is number =>
  v != null && Number.isFinite(v);

// ── area / line chart ───────────────────────────────────────────────────────

export interface AreaOpts {
  width?: number;
  height?: number;
  color?: Color | string;
  label?: string;
  unit?: string;
  dots?: boolean;
}

/** A smooth gradient-filled area chart with a glowing last point and min/max guides. */
export function areaChart(
  values: Array<number | null | undefined>,
  opts?: AreaOpts,
): string {
  const W = opts?.width ?? 720;
  const H = opts?.height ?? 150;
  const c = colorToHex(opts?.color ?? Color.Blue);
  const t = theme();
  const PL = 10;
  const PR = 44;
  const PT = 14;
  const PB = 14;
  const cw = W - PL - PR;
  const ch = H - PT - PB;

  const present = values.filter(isNum);
  if (present.length === 0) return "";
  const min = Math.min(...present);
  let max = Math.max(...present);
  if (max === min) max = min + 1;
  const n = values.length;

  const xScale = scaleLinear<number>({
    domain: [0, Math.max(1, n - 1)],
    range: [PL, PL + cw],
  });
  const yScale = scaleLinear<number>({
    domain: [min, max],
    range: [PT + ch, PT],
  });
  const x = (_d: unknown, i: number) => xScale(n <= 1 ? 0.5 : i);
  const y = (d: number | null | undefined) => yScale(isNum(d) ? d : min);
  const defined = (d: number | null | undefined) => isNum(d);
  const base = PT + ch;

  // Last present point → glowing marker + value badge.
  let lastIdx = -1;
  for (let i = n - 1; i >= 0; i--) {
    if (isNum(values[i])) {
      lastIdx = i;
      break;
    }
  }
  const lastV = values[lastIdx] as number;
  const lx = xScale(n <= 1 ? 0.5 : lastIdx);
  const ly = yScale(lastV);
  const badge = `${round1(lastV)}${opts?.unit ?? ""}`;

  return render(
    <Svg width={W} height={H}>
      <defs>
        <LinearGradient
          id="fill"
          from={c}
          to={c}
          fromOpacity={0.34}
          toOpacity={0.02}
        />
        <LinearGradient
          id="stroke"
          from={c}
          to={c}
          fromOpacity={0.75}
          toOpacity={1}
          vertical={false}
        />
      </defs>
      <Line
        from={{ x: PL, y: PT }}
        to={{ x: PL + cw, y: PT }}
        stroke={t.grid}
        strokeWidth={1}
      />
      <Line
        from={{ x: PL, y: base }}
        to={{ x: PL + cw, y: base }}
        stroke={t.grid}
        strokeWidth={1}
      />
      <AreaClosed
        data={values}
        x={x}
        y={y}
        yScale={yScale}
        defined={defined}
        curve={curveCatmullRom}
        fill="url(#fill)"
        stroke="none"
      />
      <LinePath
        data={values}
        x={x}
        y={y}
        defined={defined}
        curve={curveCatmullRom}
        fill="none"
        stroke="url(#stroke)"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {opts?.dots && n <= 40
        ? values.map((v, i) =>
            isNum(v) ? (
              <circle
                key={i}
                cx={xScale(n <= 1 ? 0.5 : i)}
                cy={yScale(v)}
                r={2}
                fill={c}
                opacity={0.55}
              />
            ) : null,
          )
        : null}
      <circle cx={lx} cy={ly} r={4.4} fill={c} opacity={0.28} />
      <circle cx={lx} cy={ly} r={3.4} fill={c} />
      <text
        x={Math.min(lx + 7, W - 4)}
        y={ly - 6}
        fontSize={11}
        fontWeight={600}
        fill={c}
        textAnchor={lx > W - 60 ? "end" : "start"}
      >
        {badge}
      </text>
      <text x={W - PR + 6} y={PT + 4} fontSize={9} fill={t.faint}>
        {round1(max)}
        {opts?.unit ?? ""}
      </text>
      <text x={W - PR + 6} y={base} fontSize={9} fill={t.faint}>
        {round1(min)}
        {opts?.unit ?? ""}
      </text>
      {opts?.label ? (
        <text x={PL} y={PT - 3} fontSize={10} fontWeight={600} fill={t.ink}>
          {opts.label}
        </text>
      ) : null}
    </Svg>,
  );
}

// ── multi-band area (e.g. ok vs error, ↓ vs ↑) ──────────────────────────────

export interface Band {
  values: Array<number | null | undefined>;
  color: Color | string;
  label: string;
}
export function multiAreaChart(
  bands: Band[],
  opts?: { width?: number; height?: number },
): string {
  const W = opts?.width ?? 720;
  const H = opts?.height ?? 160;
  const t = theme();
  const PL = 10;
  const PR = 10;
  const PT = 22;
  const PB = 12;
  const cw = W - PL - PR;
  const ch = H - PT - PB;
  const all = bands.flatMap((b) => b.values.filter(isNum));
  if (all.length === 0) return "";
  const min = Math.min(0, ...all);
  const max = Math.max(...all) || 1;
  const base = PT + ch;
  const yScale = scaleLinear<number>({ domain: [min, max], range: [base, PT] });

  return render(
    <Svg width={W} height={H}>
      <Line
        from={{ x: PL, y: base }}
        to={{ x: PL + cw, y: base }}
        stroke={t.grid}
      />
      {bands.map((b, bi) => {
        const c = colorToHex(b.color);
        const n = b.values.length;
        const xScale = scaleLinear<number>({
          domain: [0, Math.max(1, n - 1)],
          range: [PL, PL + cw],
        });
        const x = (_d: unknown, i: number) => xScale(n <= 1 ? 0.5 : i);
        const y = (d: number | null | undefined) => yScale(isNum(d) ? d : min);
        const defined = (d: number | null | undefined) => isNum(d);
        return (
          <Group key={bi}>
            <AreaClosed
              data={b.values}
              x={x}
              y={y}
              yScale={yScale}
              defined={defined}
              curve={curveCatmullRom}
              fill={c}
              fillOpacity={0.16}
              stroke="none"
            />
            <LinePath
              data={b.values}
              x={x}
              y={y}
              defined={defined}
              curve={curveCatmullRom}
              fill="none"
              stroke={c}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9 - bi * 0.05}
            />
          </Group>
        );
      })}
      {bands.map((b, i) => {
        const c = colorToHex(b.color);
        const gx = PL + i * 132;
        return (
          <Group key={`lg-${i}`}>
            <circle cx={gx + 4} cy={10} r={4} fill={c} />
            <text x={gx + 13} y={13} fontSize={10.5} fill={t.ink}>
              {b.label}
            </text>
          </Group>
        );
      })}
    </Svg>,
  );
}

// ── KPI stat cards (hero row) ────────────────────────────────────────────────

export interface StatCard {
  label: string;
  value: string;
  sub?: string;
  color?: Color | string;
  /** Optional trend series drawn as a faint sparkline across the card foot. */
  spark?: Array<number | null | undefined>;
  /** Tint the big value with `color` instead of the neutral ink. */
  accent?: boolean;
}

/** A single-row band of KPI "cards", each a big value + label + optional sparkline. */
export function statCards(
  cards: StatCard[],
  opts?: { width?: number; height?: number },
): string {
  const W = opts?.width ?? 720;
  const H = opts?.height ?? 104;
  const t = theme();
  const gap = 10;
  const n = Math.max(1, cards.length);
  const cardW = (W - (n - 1) * gap) / n;
  const padX = 14;

  return render(
    <Svg width={W} height={H}>
      {cards.map((card, i) => {
        const x = i * (cardW + gap);
        const c = colorToHex(card.color ?? Color.Blue);
        const sparkVals = card.spark?.filter(isNum) ?? [];
        const sparkY0 = H - 30;
        const sparkY1 = H - 12;
        let spark: ReactElement | null = null;
        if (card.spark && sparkVals.length >= 2) {
          const smin = Math.min(...sparkVals);
          let smax = Math.max(...sparkVals);
          if (smax === smin) smax = smin + 1;
          const m = card.spark.length;
          const sx = scaleLinear<number>({
            domain: [0, Math.max(1, m - 1)],
            range: [x + padX, x + cardW - padX],
          });
          const sy = scaleLinear<number>({
            domain: [smin, smax],
            range: [sparkY1, sparkY0],
          });
          spark = (
            <Group>
              <AreaClosed
                data={card.spark}
                x={(_d, k) => sx(k)}
                y={(d) => sy(isNum(d) ? d : smin)}
                yScale={sy}
                defined={(d) => isNum(d)}
                curve={curveCatmullRom}
                fill={c}
                fillOpacity={0.14}
                stroke="none"
              />
              <LinePath
                data={card.spark}
                x={(_d, k) => sx(k)}
                y={(d) => sy(isNum(d) ? d : smin)}
                defined={(d) => isNum(d)}
                curve={curveCatmullRom}
                fill="none"
                stroke={c}
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.85}
              />
            </Group>
          );
        }
        return (
          <Group key={i}>
            <Bar
              x={x}
              y={0}
              width={cardW}
              height={H}
              rx={12}
              fill={t.track}
              fillOpacity={0.6}
            />
            <Bar x={x} y={0} width={3} height={H} fill={c} fillOpacity={0.9} />
            <text
              x={x + padX}
              y={22}
              fontSize={9.5}
              fontWeight={600}
              fill={t.faint}
              letterSpacing={0.4}
            >
              {card.label.toUpperCase()}
            </text>
            <text
              x={x + padX}
              y={52}
              fontSize={27}
              fontWeight={700}
              fill={card.accent ? c : t.ink}
            >
              {card.value}
            </text>
            {card.sub ? (
              <text x={x + padX} y={70} fontSize={9.5} fill={t.faint}>
                {card.sub}
              </text>
            ) : null}
            {spark}
          </Group>
        );
      })}
    </Svg>,
  );
}

// ── donut ───────────────────────────────────────────────────────────────────

export interface Seg {
  label: string;
  value: number;
  color: Color | string;
}
export function donutChart(
  segments: Seg[],
  opts?: { size?: number; centerValue?: string; centerLabel?: string },
): string {
  const size = opts?.size ?? 200;
  const t = theme();
  const cx = size / 2;
  const cy = size / 2;
  const stroke = 18;
  const r = size / 2 - 14;
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  const positive = segments.filter((s) => s.value > 0);
  const cv = opts?.centerValue ?? String(total);
  const cl = opts?.centerLabel ?? "";

  return render(
    <Svg width={size} height={size}>
      <Group top={cy} left={cx}>
        <circle r={r} fill="none" stroke={t.track} strokeWidth={stroke} />
        {total > 0 ? (
          <Pie
            data={positive}
            pieValue={(d) => Math.max(0, (d as Seg).value)}
            outerRadius={r + stroke / 2 - 0.5}
            innerRadius={r - stroke / 2 + 0.5}
            cornerRadius={4}
            padAngle={total > 0 ? 0.04 : 0}
          >
            {({ arcs, path }) =>
              arcs.map((a, i) => {
                const d = path(a);
                return d ? (
                  <path
                    key={i}
                    d={d}
                    fill={colorToHex((a.data as Seg).color)}
                  />
                ) : null;
              })
            }
          </Pie>
        ) : null}
        <text
          y={-2}
          textAnchor="middle"
          fontSize={30}
          fontWeight={700}
          fill={t.ink}
        >
          {cv}
        </text>
        {cl ? (
          <text y={18} textAnchor="middle" fontSize={11} fill={t.faint}>
            {cl}
          </text>
        ) : null}
      </Group>
    </Svg>,
  );
}

// ── horizontal bar chart ────────────────────────────────────────────────────

export interface BarItem {
  label: string;
  value: number;
  color?: Color | string;
  sub?: string;
}
export function barChart(
  items: BarItem[],
  opts?: { width?: number; max?: number; unit?: string; labelWidth?: number },
): string {
  const W = opts?.width ?? 720;
  const t = theme();
  const rowH = 26;
  const gap = 8;
  const lw = opts?.labelWidth ?? 150;
  const valW = 62;
  const barX = lw + 8;
  const barW = W - barX - valW;
  const max = opts?.max ?? Math.max(1, ...items.map((i) => i.value));
  const H = items.length * (rowH + gap) + 6;
  const wScale = scaleLinear<number>({ domain: [0, max], range: [0, barW] });

  return render(
    <Svg width={W} height={H}>
      {items.map((it, i) => {
        const y = 4 + i * (rowH + gap);
        const c = colorToHex(it.color ?? Color.Blue);
        const w = Math.max(2, wScale(it.value));
        const val = `${round1(it.value)}${opts?.unit ?? ""}`;
        const bh = rowH - 6;
        return (
          <Group key={i}>
            <text x={0} y={y + rowH / 2 + 4} fontSize={11.5} fill={t.ink}>
              {it.label}
            </text>
            {it.sub ? (
              <text x={0} y={y + rowH / 2 + 15} fontSize={8.5} fill={t.faint}>
                {it.sub}
              </text>
            ) : null}
            <Bar
              x={barX}
              y={y + 3}
              width={barW}
              height={bh}
              rx={bh / 2}
              fill={t.track}
            />
            <Bar
              x={barX}
              y={y + 3}
              width={w}
              height={bh}
              rx={bh / 2}
              fill={c}
            />
            <text
              x={W}
              y={y + rowH / 2 + 4}
              textAnchor="end"
              fontSize={11}
              fontWeight={600}
              fill={t.ink}
            >
              {val}
            </text>
          </Group>
        );
      })}
    </Svg>,
  );
}

// ── stacked add/remove bars (drift sections) ────────────────────────────────

export interface StackRow {
  label: string;
  added: number;
  removed: number;
}
export function diffBars(rows: StackRow[], opts?: { width?: number }): string {
  const W = opts?.width ?? 720;
  const t = theme();
  const rowH = 22;
  const gap = 6;
  const lw = 220;
  const barX = lw + 8;
  const barW = W - barX - 8;
  const max = Math.max(1, ...rows.map((r) => r.added + r.removed));
  const H = rows.length * (rowH + gap) + 6;
  const g = colorToHex(Color.Green);
  const rd = colorToHex(Color.Red);
  const wScale = scaleLinear<number>({ domain: [0, max], range: [0, barW] });
  const bh = rowH - 6;

  return render(
    <Svg width={W} height={H}>
      {rows.map((r, i) => {
        const y = 4 + i * (rowH + gap);
        const aw = wScale(r.added);
        const rw = wScale(r.removed);
        return (
          <Group key={i}>
            <text x={0} y={y + rowH / 2 + 4} fontSize={10.5} fill={t.ink}>
              {r.label}
            </text>
            <Bar
              x={barX}
              y={y + 3}
              width={barW}
              height={bh}
              rx={3}
              fill={t.track}
            />
            <Bar x={barX} y={y + 3} width={aw} height={bh} rx={3} fill={g} />
            <Bar x={barX + aw} y={y + 3} width={rw} height={bh} fill={rd} />
            <text
              x={W}
              y={y + rowH / 2 + 4}
              textAnchor="end"
              fontSize={9.5}
              fill={t.faint}
            >
              +{r.added}/−{r.removed}
            </text>
          </Group>
        );
      })}
    </Svg>,
  );
}

// ── radial gauge (270° arc) ─────────────────────────────────────────────────

const GAUGE_START = (-135 * Math.PI) / 180;
const GAUGE_SWEEP = (270 * Math.PI) / 180;

/** One 270° gauge, drawn centred in its own local coordinate box of `size`. */
function GaugeBody(props: {
  pct: number;
  size: number;
  label?: string;
  sub?: string;
  color?: Color | string;
}): ReactElement {
  const { size } = props;
  const t = theme();
  const cx = size / 2;
  const cy = size / 2 + 6;
  const r = size / 2 - 16;
  const p = Math.max(0, Math.min(100, props.pct));
  const c = colorToHex(
    props.color ?? (p >= 85 ? Color.Red : p >= 60 ? Color.Yellow : Color.Green),
  );
  const ring = 11;
  const inner = r - ring / 2;
  const outer = r + ring / 2;
  return (
    <Group top={cy} left={cx}>
      <Arc
        innerRadius={inner}
        outerRadius={outer}
        startAngle={GAUGE_START}
        endAngle={GAUGE_START + GAUGE_SWEEP}
        cornerRadius={ring / 2}
        fill={t.track}
      />
      <Arc
        innerRadius={inner}
        outerRadius={outer}
        startAngle={GAUGE_START}
        endAngle={GAUGE_START + (GAUGE_SWEEP * p) / 100}
        cornerRadius={ring / 2}
        fill={c}
      />
      <text
        y={3}
        textAnchor="middle"
        fontSize={27}
        fontWeight={700}
        fill={t.ink}
      >
        {Math.round(p)}
        <tspan fontSize={13} fill={t.faint}>
          %
        </tspan>
      </text>
      {props.label ? (
        <text
          y={22}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill={t.faint}
        >
          {props.label}
        </text>
      ) : null}
      {props.sub ? (
        <text y={size / 2 - 10} textAnchor="middle" fontSize={9} fill={t.faint}>
          {props.sub}
        </text>
      ) : null}
    </Group>
  );
}

export function gaugeChart(
  pct: number,
  opts?: {
    label?: string;
    color?: Color | string;
    size?: number;
    sub?: string;
  },
): string {
  const size = opts?.size ?? 150;
  return render(
    <Svg width={size} height={size}>
      <GaugeBody
        pct={pct}
        size={size}
        label={opts?.label}
        sub={opts?.sub}
        color={opts?.color}
      />
    </Svg>,
  );
}

/** Three gauges side by side in one SVG (device CPU/MEM/DISK). */
export function gaugeRow(
  gauges: Array<{
    pct: number;
    label: string;
    sub?: string;
    color?: Color | string;
  }>,
): string {
  const each = 150;
  const W = each * gauges.length;
  return render(
    <Svg width={W} height={each}>
      {gauges.map((g, i) => (
        <Group key={i} left={i * each}>
          <GaugeBody
            pct={g.pct}
            size={each}
            label={g.label}
            sub={g.sub}
            color={g.color}
          />
        </Group>
      ))}
    </Svg>,
  );
}

// ── GitHub-style activity heatmap ───────────────────────────────────────────

export interface HeatDay {
  day: string;
  count: number;
}
export function heatmapChart(
  days: HeatDay[],
  opts?: { color?: Color | string; max?: number },
): string {
  const t = theme();
  const cell = 12;
  const gapc = 3;
  const step = cell + gapc;
  const topPad = 16;
  const leftPad = 26;
  const max = opts?.max ?? Math.max(1, ...days.map((d) => d.count));
  const base = colorToHex(opts?.color ?? Color.Green);
  const cols = Math.ceil(days.length / 7);
  const W = leftPad + cols * step + 6;
  const H = topPad + 7 * step + 18;

  const level = (c: number): number =>
    c <= 0 ? 0 : Math.min(4, Math.ceil((c / max) * 4));
  const alpha = [0.08, 0.3, 0.5, 0.72, 1];
  const wl = ["", "Mon", "", "Wed", "", "Fri", ""];
  const legY = topPad + 7 * step + 10;

  return render(
    <Svg width={W} height={H}>
      {wl.map((lab, i) =>
        lab ? (
          <text
            key={`wl-${i}`}
            x={2}
            y={topPad + i * step + cell - 2}
            fontSize={8}
            fill={t.faint}
          >
            {lab}
          </text>
        ) : null,
      )}
      {days.map((d, i) => {
        const col = Math.floor(i / 7);
        const rowi = i % 7;
        const lv = level(d.count);
        return (
          <Bar
            key={i}
            x={leftPad + col * step}
            y={topPad + rowi * step}
            width={cell}
            height={cell}
            rx={2.5}
            fill={lv === 0 ? t.track : base}
            fillOpacity={alpha[lv]}
          >
            <title>{`${d.day} · ${d.count}`}</title>
          </Bar>
        );
      })}
      <text x={leftPad} y={legY} fontSize={8.5} fill={t.faint}>
        Less
      </text>
      {alpha.map((al, i) => (
        <Bar
          key={`leg-${i}`}
          x={leftPad + 30 + i * (cell + 2)}
          y={legY - 9}
          width={cell}
          height={cell}
          rx={2.5}
          fill={i === 0 ? t.track : base}
          fillOpacity={al}
        />
      ))}
      <text
        x={leftPad + 30 + alpha.length * (cell + 2) + 4}
        y={legY}
        fontSize={8.5}
        fill={t.faint}
      >
        More
      </text>
    </Svg>,
  );
}

// ── tiny inline sparkline for accessory icons ───────────────────────────────

export function sparklineIcon(
  values: Array<number | null | undefined>,
  color: Color | string,
): string {
  const W = 44;
  const H = 18;
  const c = colorToHex(color);
  const present = values.filter(isNum);
  if (present.length < 2) return "";
  const min = Math.min(...present);
  let max = Math.max(...present);
  if (max === min) max = min + 1;
  const n = values.length;
  const xScale = scaleLinear<number>({
    domain: [0, Math.max(1, n - 1)],
    range: [2, W - 2],
  });
  const yScale = scaleLinear<number>({ domain: [min, max], range: [H - 2, 2] });

  let lastIdx = -1;
  for (let i = n - 1; i >= 0; i--) {
    if (isNum(values[i])) {
      lastIdx = i;
      break;
    }
  }

  const svg = render(
    <Svg width={W} height={H}>
      <LinePath
        data={values}
        x={(_d, i) => xScale(i)}
        y={(d) => yScale(isNum(d) ? d : min)}
        defined={(d) => isNum(d)}
        curve={curveCatmullRom}
        fill="none"
        stroke={c}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={xScale(lastIdx)}
        cy={yScale(values[lastIdx] as number)}
        r={1.8}
        fill={c}
      />
    </Svg>,
  );
  return svgIcon(svg);
}
