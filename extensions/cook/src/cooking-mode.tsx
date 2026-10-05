/**
 * COOKING MODE — Step-by-step interactive recipe cooking.
 *
 * HOW IT WORKS (pseudocode):
 *
 *   FUNCTION CookingMode(filePath):
 *     // STEP 1: Load the recipe data
 *     data = runCook(["recipe", filePath, "-f", "json"]) → parse JSON
 *     steps = flatten all sections into one list of step objects
 *
 *     // STEP 2: Show ONE step at a time
 *     currentStep = steps[stepIdx]   ← stepIdx starts at 0
 *     IF currentStep doesn't exist → show "Done!"
 *
 *     // STEP 3: Build the markdown display
 *     stepText = render step items (bold for ingredients, italic for cookware)
 *     show ingredients used IN THIS STEP ONLY
 *     show cookware used IN THIS STEP ONLY
 *     show timer if this step has one
 *     show progress list at bottom (▶ current, ✓ done, · upcoming)
 *
 *     // STEP 4: Navigation
 *     Enter key → go to NEXT step (first action in the panel wins default Enter)
 *     Shift+Enter → go to PREVIOUS step
 *     Timer buttons appear when a step has a timer
 */

import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  Form,
  showHUD,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import {
  runCook,
  recipeToMarkdown,
  RecipeData,
  formatQuantity,
  stepImgTag,
} from "./utils";
import { basename } from "path";

/** Shape of a timer: value=string, unit=string, label=display text. isCountable=false for ranges. */
interface TimerInfo {
  value: string;
  unit: string;
  label: string;
  isCountable: boolean;
  rangeFrom?: number;
  rangeTo?: number;
}

export function CookingMode({
  filePath,
  scale = 1,
}: {
  filePath: string;
  scale?: number;
}) {
  // === REACT STATE ===
  // Each variable is a piece of memory that, when changed, causes the UI to redraw.
  // useState returns [currentValue, setterFunction].
  // Think of it like a sticky note React watches — when you call setter, React redraws.

  const [data, setData] = useState<RecipeData | null>(null); // the parsed recipe JSON
  const [loading, setLoading] = useState(true); // is the recipe still loading?
  const [stepIdx, setStepIdx] = useState(0); // which step are we on? (0-based)
  const [timerSec, setTimerSec] = useState<number | null>(null); // seconds remaining on timer
  const [timerRunning, setTimerRunning] = useState(false); // is the countdown active?
  const [timerPaused, setTimerPaused] = useState(false); // is it paused mid-countdown?

  // useRef holds values that survive renders without triggering redraws
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerTotalRef = useRef<number>(0); // initial seconds when countdown started (for progress bar)

  // === LOAD RECIPE DATA (runs ONCE, when filePath changes) ===
  //
  // FUNCTION loadRecipe():
  //   TRY:
  //     raw = runCook CLI with args ["recipe", path, "-f", "json"]
  //     parsed = JSON.parse(raw)           ← turn text into an object
  //     setData(parsed)                    ← store in state → triggers redraw
  //   CATCH:
  //     (leave data as null — handled below)
  //   FINALLY:
  //     setLoading(false)                  ← always stop the spinner
  //     IF there's a running interval → clean it up when navigating away
  //
  useEffect(() => {
    let cancelled = false;

    async function loadRecipe() {
      try {
        const recipePath = scale === 1 ? filePath : `${filePath}:${scale}`;
        const json = await runCook(["recipe", recipePath, "-f", "json"]);
        if (!cancelled) setData(JSON.parse(json));
      } catch {
        /* data stays null → shows error state */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRecipe();
    // CLEANUP: runs when the component is removed from the screen
    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [filePath, scale]);

  // === GUARD: loading or missing data ===
  if (loading || !data) {
    return <Detail isLoading={loading} markdown="*Loading recipe…*" />;
  }

  // === DERIVED VALUES (computed from state, not stored separately) ===

  // Recipe name: use title from metadata, or fall back to the filename without extension
  const recipeName =
    (data.metadata.map.title as string) ||
    basename(filePath).replace(/\.(cook|menu)$/i, "");

  // Flatten ALL sections into ONE list of steps.
  //
  // FUNCTION flattenSteps(data):
  //   result = []
  //   FOR EACH section IN data.sections:
  //     FOR EACH contentBlock IN section.content:
  //       IF contentBlock.type == "step":
  //         result.push(contentBlock.value)  ← the actual step object
  //   RETURN result
  //
  const steps = data.sections
    .flatMap((s) =>
      s.content.filter((c) => c.type === "step").map((c) => c.value),
    )
    .map((s, i) => ({ ...s, number: i + 1 })); // renumber sequentially across sections

  // Get the single step for our current index
  const step = steps[stepIdx];
  // If we somehow went past the last step, show "done" screen
  if (!step)
    return (
      <Detail markdown="# Done! 🎉\n\nAll steps completed. Enjoy your meal!" />
    );

  // === RENDER STEP TEXT ===
  //
  // FUNCTION renderStepItems(step, data):
  //   FOR EACH item IN step.items:
  //     SWITCH item.type:
  //       "text"        → return item.value as-is
  //       "ingredient"  → return "**BOLD** ingredient name (look up by index)"
  //       "cookware"    → return "*ITALIC* cookware name (look up by index)"
  //       "timer"       → return "⏱ **value unit**" (look up timer by index)
  //   JOIN all pieces together into one string
  //
  const stepText = step.items
    .map((item) => {
      switch (item.type) {
        case "text":
          return item.value || "";
        case "ingredient":
          return `**${data.ingredients[item.index!]?.name || "??"}**`;
        case "cookware":
          return `*${data.cookware[item.index!]?.name || "??"}*`;
        case "timer": {
          const t = data.timers[item.index!] as
            | {
                quantity?: {
                  value?: { type?: string; value?: unknown };
                  unit?: string;
                };
              }
            | undefined;
          const label = timerLabel(t);
          return label ? `⏱ **${label}**` : "⏱ timer";
        }
        default:
          return "";
      }
    })
    .join("");

  // === FIND THIS STEP'S TIMER (if it has one) ===
  //
  // FUNCTION findTimer(step, data):
  //   timerRef = find first item in step WHERE type == "timer"
  //   IF timerRef exists:
  //     lookup timer by index in data.timers
  //     extract value and unit
  //     RETURN { value, unit, label } OR null
  //   ELSE:
  //     RETURN null
  //
  const timerRef = step.items.find((i) => i.type === "timer");
  const timer: TimerInfo | null = timerRef
    ? (() => {
        const t = data.timers[timerRef.index!] as
          | {
              quantity?: {
                value?: { type?: string; value?: unknown };
                unit?: string;
              };
            }
          | undefined;
        const info = parseTimer(t);
        return info;
      })()
    : null;

  /** Extract a display label from timer data. Handles both "number" (single value) and "text" (range like "10-20"). */
  function timerLabel(
    t:
      | {
          quantity?: {
            value?: { type?: string; value?: unknown };
            unit?: string;
          };
        }
      | undefined,
  ): string | null {
    const q = t?.quantity;
    if (!q) return null;
    const unit = q.unit || "";
    const v = q.value;
    if (!v) return unit || null;
    // type "text" → raw string like "10-20"
    if (v.type === "text") return `${v.value} ${unit}`.trim();
    // type "number" → drill into nested value
    if (v.type === "number") {
      const n = (v.value as { type?: string; value?: unknown })?.value as
        number | undefined;
      if (n !== undefined) return `${n} ${unit}`.trim();
    }
    return unit || null;
  }

  /** Parse timer data into TimerInfo. Returns null if unparseable. */
  function parseTimer(
    t:
      | {
          quantity?: {
            value?: { type?: string; value?: unknown };
            unit?: string;
          };
        }
      | undefined,
  ): TimerInfo | null {
    const q = t?.quantity;
    if (!q) return null;
    const unit = q.unit || "";
    const v = q.value;
    if (!v) return null;
    // Range / text timers: parse "10-20" into from/to for picker
    if (v.type === "text") {
      const s = String(v.value);
      const match = s.match(/^(\d+)-(\d+)$/);
      return match
        ? {
            value: s,
            unit,
            label: `${s} ${unit}`.trim(),
            isCountable: false,
            rangeFrom: parseInt(match[1]),
            rangeTo: parseInt(match[2]),
          }
        : { value: s, unit, label: `${s} ${unit}`.trim(), isCountable: false };
    }
    // Number timers: can count down
    if (v.type === "number") {
      const n = (v.value as { type?: string; value?: unknown })?.value as
        number | undefined;
      if (n !== undefined) {
        return {
          value: String(n),
          unit,
          label: `${n} ${unit}`.trim(),
          isCountable: true,
        };
      }
    }
    return null;
  }

  // === TIME CONVERSION HELPERS ===
  //
  // FUNCTION toSeconds(value, unit):
  //   u = unit.toLowerCase()
  //   IF u starts with "hour" → return value * 3600
  //   IF u starts with "min"  → return value * 60
  //   ELSE → return value (already seconds)
  //
  function toSeconds(v: number, unit: string): number {
    const u = unit.toLowerCase();
    if (u.startsWith("hour")) return v * 3600;
    if (u.startsWith("min")) return v * 60;
    return v;
  }

  // FUNCTION fmtTime(seconds):
  //   minutes = seconds / 60 (rounded down)
  //   secs = seconds % 60 (remainder)
  //   RETURN "minutes:secs" with secs always 2 digits (padded with leading zero)
  //
  function fmtTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0
      ? `${m}:${sec.toString().padStart(2, "0")}`
      : `0:${sec.toString().padStart(2, "0")}`;
  }

  // === TIMER CONTROLS ===
  // These functions manage the countdown interval.
  // Key concept: we DON'T count down by 1 each second (that drifts).
  // Instead, we use Date.now() to calculate ACTUAL elapsed time — wall-clock accurate.

  // FUNCTION startTimer():
  //   IF no timer → stop
  //   totalSeconds = toSeconds(timer.value, timer.unit)
  //   set timerSec = totalSeconds       ← store for display
  //   set timerRunning = true           ← show countdown UI
  //   set timerPaused = false           ← not paused
  //   CALL tick(totalSeconds)           ← begin the countdown
  //
  function startTimer() {
    if (!timer || !timer.isCountable) return;
    startCountdown(parseFloat(timer.value));
  }
  function startCountdown(val: number) {
    const total = toSeconds(val, timer!.unit);
    timerTotalRef.current = total;
    setTimerSec(total);
    setTimerRunning(true);
    setTimerPaused(false);
    tick(total);
  }

  // FUNCTION pauseTimer():
  //   set timerPaused = true            ← freeze the display
  //   clearInterval(intervalRef)        ← stop the ticking
  //   (timerSec stays at current value — we'll resume from here)
  //
  function pauseTimer() {
    setTimerPaused(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  // FUNCTION resumeTimer():
  //   IF no saved time → stop
  //   set timerPaused = false           ← unfreeze
  //   set timerRunning = true           ← show countdown again
  //   CALL tick(current timerSec)       ← restart from where we paused
  //
  function resumeTimer() {
    if (timerSec === null) return;
    setTimerPaused(false);
    setTimerRunning(true);
    tick(timerSec);
  }

  // FUNCTION stopTimer():
  //   set timerRunning = false
  //   set timerPaused = false
  //   set timerSec = null               ← clear the saved time
  //   clearInterval(intervalRef)        ← stop ticking
  //
  function stopTimer() {
    setTimerRunning(false);
    setTimerPaused(false);
    setTimerSec(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function goToStep(next: number | ((prev: number) => number)) {
    stopTimer();
    setStepIdx(next);
  }

  // FUNCTION tick(remainingSeconds):
  //   // Wall-clock timer — uses Date.now() for accuracy, not interval counting
  //   startTime = current timestamp in milliseconds
  //   startValue = remainingSeconds
  //   clear any existing interval
  //
  //   EVERY 200 milliseconds:           ← check 5 times per second
  //     elapsed = (now - startTime) converted to seconds (rounded down)
  //     remaining = startValue - elapsed
  //
  //     IF remaining <= 0:
  //       clearInterval                   ← stop checking
  //       set timerSec = 0
  //       set timerRunning = false        ← timer is done
  //       showHUD("⏰ Timer done!")        ← system notification
  //     ELSE:
  //       set timerSec = remaining         ← update the countdown display
  //
  function tick(remaining: number) {
    const start = Date.now();
    const from = remaining;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const now = from - elapsed;
      if (now <= 0) {
        clearInterval(intervalRef.current!);
        setTimerSec(0);
        setTimerRunning(false);
        setTimerPaused(false);
        showHUD("⏰ Timer done!");
        process.stdout.write("\x07"); // system bell
      } else {
        setTimerSec(now);
      }
    }, 200);
  }

  // === INGREDIENTS & COOKWARE FOR THIS SPECIFIC STEP ===
  //
  // FUNCTION getStepIngredients(step, data):
  //   // Collect all ingredient indices referenced in this step
  //   indices = new Set()
  //   FOR EACH item IN step.items WHERE item.type == "ingredient":
  //     indices.add(item.index)
  //   // Filter the full ingredients list to only those indices
  //   RETURN data.ingredients WHERE index is in indices
  //
  const stepIngredientIndices = new Set(
    step.items.filter((i) => i.type === "ingredient").map((i) => i.index!),
  );
  const stepIngredients = data.ingredients.filter((_, i) =>
    stepIngredientIndices.has(i),
  );
  const stepCookware = step.items
    .filter((i) => i.type === "cookware")
    .map((i) => data.cookware[i.index!])
    .filter(Boolean);

  // === BUILD THE MARKDOWN DISPLAY ===
  //
  // FUNCTION buildMarkdown(step, data, timer, stepIdx, steps):
  //   md = "# Recipe Name"
  //   md += "## Step X of Y"
  //   md += stepText (bold ingredients, italic cookware)
  //
  //   IF step has ingredients → list them with quantities
  //   IF step has cookware → list them
  //   IF step has a timer:
  //     IF timer is running → show countdown + progress bar
  //     ELSE → show "Timer: X minutes" (ready to start)
  //
  //   // Progress list at the bottom
  //   FOR i = 0 TO steps.length:
  //     IF i == stepIdx → "▶ Step N"     (current)
  //     IF i < stepIdx  → "✓ Step N"     (completed)
  //     ELSE           → "  Step N"      (upcoming)
  //
  let md = `# ${recipeName}\n\n---\n\n`;
  // Step image — Cooklang convention: RecipeName.N.jpg for step N
  const stepImg = stepImgTag(filePath, step.number);
  if (stepImg) md += stepImg + "\n\n";
  md += `## Step ${step.number} of ${steps.length}\n\n${stepText}\n\n`;

  if (stepIngredients.length) {
    md += "### 🥘 This step\n\n";
    for (const ing of stepIngredients) {
      md += `- ${formatQuantity(ing.quantity) ? `**${formatQuantity(ing.quantity)}** ` : ""}${ing.name}\n`;
    }
    md += "\n";
  }
  if (stepCookware.length) {
    md += "### 🔪 This step\n\n";
    for (const cw of stepCookware) md += `- ${cw.name}\n`;
    md += "\n";
  }
  if (timer) {
    if (timerRunning && timerSec !== null) {
      const label = timerPaused ? "⏸ PAUSED" : "⏳ counting down";
      const total = timerTotalRef.current;
      const pct = Math.max(
        0,
        Math.min(20, total > 0 ? Math.round((timerSec / total) * 20) : 0),
      );
      md += `### ⏱ Timer — ${label}\n\n**${fmtTime(timerSec)}** of ${fmtTime(total)}\n\n`;
      // Visual progress bar: █ = elapsed, ░ = remaining (20 chars wide)
      md += "`" + "█".repeat(pct) + "░".repeat(20 - pct) + "`\n\n";
    } else {
      md += `### ⏱ Timer: ${timer.label}\n\n`;
    }
  }

  // Progress tracker — build full text then truncate at word boundary
  md += "---\n\n";
  for (let i = 0; i < steps.length; i++) {
    const icon = i === stepIdx ? "▶" : i < stepIdx ? "✓" : "  ";
    const fullText = steps[i].items
      .map((it) =>
        it.type === "ingredient"
          ? data.ingredients[it.index!]?.name || "?"
          : it.type === "cookware"
            ? data.cookware[it.index!]?.name || "?"
            : it.type === "timer"
              ? "⏱"
              : it.value || "",
      )
      .join(" ")
      .replace(/\s+/g, " ");
    const preview =
      fullText.length > 75
        ? fullText.slice(0, 75).replace(/\s+\S*$/, "") + "…"
        : fullText;
    md += `${icon} **${steps[i].number}.** ${preview}\n\n`;
  }

  // === ACTION BAR LAYOUT ===
  //
  // CRITICAL RULE: Raycast uses the FIRST action in the panel as the default Enter key action.
  // So "Next →" must come BEFORE "← Previous" — otherwise Enter would go backward.
  //
  // Enter        → Next step  (first action, wins default)
  // Shift+Enter  → Previous step
  // Timer actions appear conditionally based on timer state
  // "Full Recipe" push navigates to a separate static view
  //
  return (
    <Detail
      key={stepIdx}
      isLoading={loading}
      markdown={md}
      actions={
        <ActionPanel>
          {/* === NEXT (first = default Enter key) === */}
          {stepIdx < steps.length - 1 && (
            <Action
              title="Next →"
              icon={Icon.ArrowRight}
              onAction={() => goToStep((prev) => prev + 1)}
            />
          )}
          {/* === PREVIOUS (Shift+Enter, never steals default Enter) === */}
          {stepIdx > 0 && (
            <Action
              title="← Previous"
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: ["shift"], key: "enter" }}
              onAction={() => goToStep((prev) => prev - 1)}
            />
          )}
          {/* === TIMER: start (Ctrl+Enter, only for countable timers) === */}
          {timer && timer.isCountable && !timerRunning && (
            <Action
              title={`Start Timer (${timer.label})`}
              icon={Icon.Clock}
              shortcut={{ modifiers: ["ctrl"], key: "enter" }}
              onAction={startTimer}
            />
          )}
          {/* === TIMER RANGE: pick any number between rangeFrom and rangeTo === */}
          {timer &&
            !timer.isCountable &&
            timer.rangeFrom &&
            timer.rangeTo &&
            !timerRunning && (
              <Action.Push
                title={`Set Timer (${timer.rangeFrom}-${timer.rangeTo} ${timer.unit})`}
                icon={Icon.Clock}
                target={
                  <RangeTimerForm
                    rangeFrom={timer.rangeFrom}
                    rangeTo={timer.rangeTo}
                    unit={timer.unit}
                    onStart={(val) => {
                      setTimerRunning(true);
                      startCountdown(val);
                    }}
                  />
                }
              />
            )}
          {/* === TIMER: pause (Ctrl+Enter, shown when running, not paused) === */}
          {timerRunning && !timerPaused && (
            <Action
              title="Pause Timer"
              icon={Icon.Pause}
              shortcut={{ modifiers: ["ctrl"], key: "enter" }}
              onAction={pauseTimer}
            />
          )}
          {/* === TIMER: resume (Ctrl+Enter, shown when running AND paused) === */}
          {timerRunning && timerPaused && (
            <Action
              title="Resume Timer"
              icon={Icon.Play}
              shortcut={{ modifiers: ["ctrl"], key: "enter" }}
              onAction={resumeTimer}
            />
          )}
          {/* === TIMER: stop (shown whenever timer is running) === */}
          {timerRunning && (
            <Action title="Stop Timer" icon={Icon.Stop} onAction={stopTimer} />
          )}
          {/* === VIEW FULL RECIPE (pushes a new screen) === */}
          <Action.Push
            title="Full Recipe"
            icon={Icon.Document}
            target={<StaticRecipe filePath={filePath} />}
          />
        </ActionPanel>
      }
    />
  );
}

// === STATIC RECIPE VIEW (fallback — same as the detail view in view-recipes) ===
//
// FUNCTION StaticRecipe(filePath):
//   // Load and display the full recipe in one page (no step navigation)
//   state: md = "Loading..."
//   WHEN component mounts:
//     json = runCook(["recipe", path, "-f", "json"])
//     md = recipeToMarkdown(json, path)
//   RENDER Detail(md)
//
function StaticRecipe({ filePath }: { filePath: string }) {
  const [md, setMd] = useState("*Loading…*");
  useEffect(() => {
    let cancelled = false;

    async function loadRecipe() {
      try {
        const json = await runCook(["recipe", filePath, "-f", "json"]);
        if (!cancelled) setMd(recipeToMarkdown(JSON.parse(json), filePath));
      } catch {
        if (!cancelled) setMd("# Error");
      }
    }

    loadRecipe();
    return () => {
      cancelled = true;
    };
  }, [filePath]);
  return <Detail markdown={md} />;
}

// ── RANGE TIMER FORM ──
//
// FUNCTION RangeTimerForm(rangeFrom, rangeTo, unit, onStart):
//   // Shows a text field pre-filled with the lower bound
//   // User can type any number between rangeFrom and rangeTo
//   // Submit calls onStart(value) and pops back to cooking mode
//
function RangeTimerForm({
  rangeFrom,
  rangeTo,
  unit,
  onStart,
}: {
  rangeFrom: number;
  rangeTo: number;
  unit: string;
  onStart: (val: number) => void;
}) {
  const defaultValue = String(rangeFrom);

  const { pop } = useNavigation();

  function handleSubmit(values: { minutes: string }) {
    const v = parseInt(values.minutes, 10);
    if (isNaN(v) || v < rangeFrom || v > rangeTo) return;
    onStart(v);
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Timer"
            icon={Icon.Clock}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={`Set Timer (${rangeFrom}-${rangeTo} ${unit})`}
        text={`Enter a value between ${rangeFrom} and ${rangeTo} ${unit}.`}
      />
      <Form.TextField
        id="minutes"
        title={`Minutes (${rangeFrom}-${rangeTo})`}
        placeholder={defaultValue}
        defaultValue={defaultValue}
      />
    </Form>
  );
}
