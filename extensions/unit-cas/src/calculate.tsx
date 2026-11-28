import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Icon,
  Keyboard,
  List,
  confirmAlert,
  environment,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { createHash } from "crypto";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, utimesSync, writeFileSync } from "fs";
import { join } from "path";
import { useMemo, useState } from "react";
import { AngleMode, CalcResult, Formatted, calculate, encodeValue, suggestConversions } from "./engine";
import { texToSvg } from "./lib/mathjax";
import {
  ANGLE_KEY,
  ANGLE_MODES,
  DEFS_KEY,
  Definition,
  HISTORY_KEY,
  HistoryEntry,
  buildContext,
  getSettings,
  isAngleMode,
  withDefinition,
  withHistoryEntry,
} from "./lib/store";

const prefs = getPreferenceValues<Preferences>();

const MATH_DIR = join(environment.supportPath, "math");
/** Rendered formulas kept on disk; the least recently used beyond this are deleted. */
const MATH_CACHE_LIMIT = 200;

/** Deletes the least recently used cached formula images beyond the limit. */
function pruneMathCache() {
  try {
    const files = readdirSync(MATH_DIR)
      .filter((f) => f.endsWith(".svg"))
      .map((f) => ({ path: join(MATH_DIR, f), time: statSync(join(MATH_DIR, f)).mtimeMs }));
    if (files.length <= MATH_CACHE_LIMIT) return;
    files.sort((a, b) => b.time - a.time);
    for (const f of files.slice(MATH_CACHE_LIMIT)) unlinkSync(f.path);
  } catch {
    // The cache folder may not exist yet.
  }
}
pruneMathCache();

/** Writes the typeset formula to the support folder and returns a markdown image, or null. */
function mathImage(tex: string): string | null {
  if (!prefs.renderMath) return null;
  try {
    const color = environment.appearance === "dark" ? "#EDEDED" : "#1C1C1C";
    const file = join(
      MATH_DIR,
      createHash("sha1")
        .update(color + tex)
        .digest("hex") + ".svg",
    );
    if (existsSync(file)) {
      // Mark as recently used so pruning keeps it.
      const now = new Date();
      utimesSync(file, now, now);
    } else {
      mkdirSync(MATH_DIR, { recursive: true });
      writeFileSync(file, texToSvg(tex, color));
    }
    return `![](${encodeURI("file://" + file)})`;
  } catch {
    return null;
  }
}

/** Asks before an irreversible delete. */
function confirmDelete(title: string, message: string): Promise<boolean> {
  return confirmAlert({
    title,
    message,
    icon: Icon.Trash,
    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
  });
}

function fence(label: string, code: string): string {
  return `**${label}**\n\`\`\`\n${code}\n\`\`\``;
}

function detailMarkdown(r: CalcResult): string {
  const parts: string[] = [];
  const img = mathImage(r.solvedFor ? `${r.input.latex}\\;\\Rightarrow\\;${r.result.latex}` : r.equation.latex);
  if (img) parts.push(img);
  if (r.approx) {
    const a = mathImage(`\\approx ${r.approx.latex}`);
    if (a) parts.push(a);
  }
  if (r.notes.length) parts.push(r.notes.map((n) => `> ${n}`).join("\n"));
  parts.push(fence("Result · LaTeX", r.result.latex), fence("Result · TI-Nspire", r.result.nspire));
  if (r.approx) parts.push(fence("Decimal · TI-Nspire", r.approx.nspire));
  parts.push(fence("Input · LaTeX", r.input.latex), fence("Input · TI-Nspire", r.input.nspire));
  return parts.join("\n\n");
}

function CopyActions(props: { result: Formatted; input?: Formatted; onCopy?: () => void; equation?: Formatted }) {
  const { result, input, onCopy, equation } = props;
  const latexFirst = prefs.primaryCopy !== "nspire";
  const latex = <Action.CopyToClipboard key="l" title="Copy Result as LaTeX" content={result.latex} onCopy={onCopy} />;
  const nspire = (
    <Action.CopyToClipboard key="n" title="Copy Result as TI-Nspire" content={result.nspire} onCopy={onCopy} />
  );
  return (
    <>
      <ActionPanel.Section>
        {latexFirst ? [latex, nspire] : [nspire, latex]}
        <Action.Paste
          title={`Paste Result as ${latexFirst ? "LaTeX" : "TI-Nspire"}`}
          content={latexFirst ? result.latex : result.nspire}
          shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          onPaste={onCopy}
        />
      </ActionPanel.Section>
      {input && (
        <ActionPanel.Section title="Convert Input">
          <Action.CopyToClipboard
            title="Copy Input as LaTeX"
            content={input.latex}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          />
          <Action.CopyToClipboard
            title="Copy Input as TI-Nspire"
            content={input.nspire}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          />
          {equation && (
            <Action.CopyToClipboard
              title="Copy Equation as LaTeX"
              content={equation.latex}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            />
          )}
          {equation && <Action.CopyToClipboard title="Copy Equation as TI-Nspire" content={equation.nspire} />}
        </ActionPanel.Section>
      )}
    </>
  );
}

/** Whether a result depends on the angle mode (trig functions or their inverses). */
function usesAngles(nspire: string): boolean {
  return /\b(sin|cos|tan|sec|csc|cot)|arc(sin|cos|tan)/.test(nspire);
}

export default function Command() {
  const [text, setText] = useState("");
  const historyStore = useLocalStorage<HistoryEntry[]>(HISTORY_KEY, []);
  const defsStore = useLocalStorage<Definition[]>(DEFS_KEY, []);
  const angleStore = useLocalStorage<AngleMode>(ANGLE_KEY, prefs.angleMode ?? "rad");
  const history = historyStore.value ?? [];
  const defs = defsStore.value ?? [];
  const angle: AngleMode = isAngleMode(angleStore.value) ? angleStore.value : (prefs.angleMode ?? "rad");
  const loading = historyStore.isLoading || defsStore.isLoading || angleStore.isLoading;

  const changeAngle = (mode: AngleMode) => angleStore.setValue(mode);
  const nextAngle = ANGLE_MODES[(ANGLE_MODES.findIndex((m) => m.value === angle) + 1) % ANGLE_MODES.length];
  const angleAction = (
    <Action
      title={`Switch to ${nextAngle.title}`}
      icon={Icon.Gauge}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      onAction={() => changeAngle(nextAngle.value)}
    />
  );

  const ctx = useMemo(() => buildContext(getSettings(angle), defs), [defs, angle]);
  const result = useMemo(() => (text.trim() ? calculate(text, ctx) : null), [text, ctx]);
  const conversions = useMemo(() => (result?.ok ? suggestConversions(result.value, ctx) : []), [result, ctx]);

  const remember = (r: CalcResult) => async () => {
    await historyStore.setValue(
      withHistoryEntry(history, {
        input: text.trim(),
        inputLatex: r.input.latex,
        inputNspire: r.input.nspire,
        resultLatex: r.result.latex,
        resultNspire: r.result.nspire,
        time: Date.now(),
      }),
    );
  };

  const store = async (r: CalcResult) => {
    const a = r.assignment!;
    await defsStore.setValue(
      withDefinition(defs, {
        name: a.name,
        source: a.source,
        display: a.params ? r.input.nspire : `${a.name}:=${r.result.nspire}`,
        value: !a.params && a.value ? encodeValue(a.value) : undefined,
      }),
    );
    await remember(r)();
    await showToast({
      style: Toast.Style.Success,
      title: `Stored ${a.params ? `${a.name}(${a.params.join(",")})` : a.name}`,
    });
    setText("");
  };

  const canStore = (r: CalcResult) =>
    !!r.assignment && (!!r.assignment.params || r.value?.k === "q" || r.value?.k === "list");

  return (
    <List
      isLoading={loading}
      searchText={text}
      onSearchTextChange={setText}
      searchBarPlaceholder="Type or paste LaTeX / TI-Nspire — e.g. solve(x^2=2_m^2,x) or \frac{5\,\mathrm{km}}{2\,\mathrm{h}}"
      isShowingDetail={!!result}
      filtering={false}
      searchBarAccessory={
        <List.Dropdown tooltip="Angle Mode" value={angle} onChange={(v) => !loading && changeAngle(v as AngleMode)}>
          {ANGLE_MODES.map((m) => (
            <List.Dropdown.Item key={m.value} title={`${m.title} (${m.short})`} value={m.value} />
          ))}
        </List.Dropdown>
      }
    >
      {result && !result.ok && (
        <List.Item
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title={result.error}
          subtitle={result.input ? `${result.sourceFormat === "latex" ? "LaTeX" : "Nspire"} input` : undefined}
          detail={
            <List.Item.Detail
              markdown={[
                `**${result.error}**`,
                result.input ? fence("Input · LaTeX", result.input.latex) : "",
                result.input ? fence("Input · TI-Nspire", result.input.nspire) : "",
              ].join("\n\n")}
            />
          }
          actions={
            result.input && (
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Input as LaTeX" content={result.input.latex} />
                <Action.CopyToClipboard title="Copy Input as TI-Nspire" content={result.input.nspire} />
              </ActionPanel>
            )
          }
        />
      )}

      {result?.ok && (
        <List.Section title={result.solvedFor ? `Solved for ${result.solvedFor.join(", ")}` : "Result"}>
          <List.Item
            icon={Icon.Calculator}
            title={result.result.nspire}
            accessories={[
              ...(usesAngles(result.input.nspire)
                ? [{ text: ANGLE_MODES.find((m) => m.value === angle)!.short, tooltip: "Angle mode (⌘⇧A to switch)" }]
                : []),
              { tag: result.sourceFormat === "latex" ? "LaTeX" : "Nspire" },
            ]}
            detail={<List.Item.Detail markdown={detailMarkdown(result)} />}
            actions={
              <ActionPanel>
                {canStore(result) && (
                  <ActionPanel.Section>
                    <Action
                      title={`Store ${result.assignment!.name}`}
                      icon={Icon.SaveDocument}
                      onAction={() => store(result)}
                    />
                  </ActionPanel.Section>
                )}
                <CopyActions
                  result={result.result}
                  input={result.input}
                  equation={result.equation}
                  onCopy={remember(result)}
                />
                <ActionPanel.Section>{angleAction}</ActionPanel.Section>
              </ActionPanel>
            }
          />
          {result.approx && (
            <List.Item
              icon={Icon.Dot}
              title={`≈ ${result.approx.nspire}`}
              detail={<List.Item.Detail markdown={detailMarkdown(result)} />}
              actions={
                <ActionPanel>
                  <CopyActions result={result.approx} input={result.input} onCopy={remember(result)} />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      )}

      {result?.ok && conversions.length > 0 && (
        <List.Section title="Convert ►">
          {conversions.map((c) => (
            <List.Item
              key={c.unit.nspire}
              icon={Icon.Switch}
              title={c.result.nspire}
              subtitle={c.unit.desc}
              detail={
                <List.Item.Detail
                  markdown={[
                    mathImage(c.result.latex) ?? "",
                    fence("LaTeX", c.result.latex),
                    fence("TI-Nspire", c.result.nspire),
                  ].join("\n\n")}
                />
              }
              actions={
                <ActionPanel>
                  <CopyActions result={c.result} onCopy={remember(result)} />
                  <Action
                    title="Convert in Input"
                    icon={Icon.Pencil}
                    onAction={() => setText(`${result.input.nspire}►_${c.unit.nspire}`)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {!text.trim() && defs.length > 0 && (
        <List.Section title="Stored Variables & Functions">
          {defs.map((d) => (
            <List.Item
              key={d.name}
              icon={Icon.Tag}
              title={d.display}
              actions={
                <ActionPanel>
                  <Action title="Insert Name" icon={Icon.Pencil} onAction={() => setText(d.name)} />
                  <Action.CopyToClipboard title="Copy Definition" content={d.display} />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={async () => {
                      if (await confirmDelete(`Delete ${d.name}?`, "The stored definition will be removed."))
                        await defsStore.setValue(defs.filter((x) => x.name !== d.name));
                    }}
                  />
                  <Action
                    title="Delete All"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                    onAction={async () => {
                      if (
                        await confirmDelete(
                          "Delete All Definitions?",
                          "Every stored variable and function will be removed.",
                        )
                      )
                        await defsStore.setValue([]);
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {!text.trim() && (
        <List.Section title="History">
          {history.map((h) => (
            <List.Item
              key={h.input}
              icon={Icon.Clock}
              title={h.resultNspire}
              subtitle={h.inputNspire}
              actions={
                <ActionPanel>
                  <Action title="Edit Calculation" icon={Icon.Pencil} onAction={() => setText(h.input)} />
                  <CopyActions
                    result={{ latex: h.resultLatex, nspire: h.resultNspire }}
                    input={{ latex: h.inputLatex, nspire: h.inputNspire }}
                  />
                  <Action
                    title="Delete Entry"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={async () => {
                      if (await confirmDelete("Delete History Entry?", h.inputNspire))
                        await historyStore.setValue(history.filter((x) => x.input !== h.input));
                    }}
                  />
                  <Action
                    title="Clear History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                    onAction={async () => {
                      if (await confirmDelete("Clear History?", "Every calculation in the history will be removed."))
                        await historyStore.setValue([]);
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {!text.trim() && !loading && history.length === 0 && (
        <List.EmptyView
          icon={Icon.Calculator}
          title="Type or paste a calculation"
          description={
            "LaTeX or TI-Nspire text: 5_km/(2_hr) · 3_km►_mi · solve(x^2+x-1=0,x)\n\\frac{1}{2}m v^2=100\\,\\mathrm{J} \\mid m=2\\,\\mathrm{kg}"
          }
          actions={
            <ActionPanel>
              <Action
                title="Calculate Clipboard"
                icon={Icon.Clipboard}
                onAction={async () => setText((await Clipboard.readText()) ?? "")}
              />
              {angleAction}
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
