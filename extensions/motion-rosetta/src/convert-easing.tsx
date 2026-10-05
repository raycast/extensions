import {
  Action,
  ActionPanel,
  Color,
  Detail,
  environment,
  Icon,
  List,
  LocalStorage,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState, type ReactNode } from "react";
import { performance } from "node:perf_hooks";
import { join } from "node:path";
import { PreviewCache, previewKey } from "./lib/preview-cache.ts";
import {
  COMPONENTS,
  REVEALS,
  previewDuration as basePreviewDuration,
  type PreviewSpec,
} from "./lib/preview.ts";
import { convert as baseConvert } from "./lib/convert.ts";
import {
  DEFAULT_SHORTCUTS,
  parseShortcut,
  resolveShortcuts,
  SHORTCUT_STORAGE,
  durationSeconds,
  type ShortcutSettings,
} from "./lib/user-settings.ts";
import { retimeConversion } from "./lib/convert.ts";
import { BROWSE_PRESETS, PRESET_GROUPS, presetIcon } from "./presets.ts";
import {
  codePreview,
  durationLabel as baseDurationLabel,
  previewMarkdown,
} from "./lib/detail-layout.ts";
import { formatIcon } from "./lib/format-icons.ts";
import { InputActivation } from "./lib/input-activation.ts";
import { graphMarkdown } from "./lib/graph.ts";
import {
  crossings,
  formatNumber,
  springWindow,
  type Output,
  type Easing,
} from "./lib/model.ts";

const PREVIEW_MODES = ["Curve", ...COMPONENTS] as const;
type PreviewMode = (typeof PREVIEW_MODES)[number];
const IMAGE_DEBOUNCE_MS = 60;
type Conversion = ReturnType<typeof baseConvert>;
type ValidInput = { input: string; value: Conversion; startedAt: number };
type State = {
  input: string;
  value?: Conversion;
  error?: string;
  last?: ValidInput;
};

function CopyActions({
  outputs,
  selected,
  onPreview,
  notes,
  onComponent,
  shortcuts,
  settingsActions,
}: {
  outputs: Output[];
  selected: Output;
  onPreview: () => void;
  notes: string;
  onComponent: (component: PreviewMode) => void;
  shortcuts: ShortcutSettings;
  settingsActions: ReactNode;
}) {
  const ordered = [
    selected,
    ...outputs.filter((o) => o.id !== selected.id),
  ].filter((o) => o.code !== undefined);
  return (
    <ActionPanel>
      {selected.code === undefined && (
        <Action.Push
          title="View Fidelity Note"
          icon={Icon.Info}
          target={
            <Detail
              markdown={`# ${selected.title}`}
              metadata={
                <Detail.Metadata>
                  <Detail.Metadata.Label
                    title="Fidelity"
                    text={selected.fidelity}
                  />
                  <Detail.Metadata.Label title="Reason" text={selected.note} />
                </Detail.Metadata>
              }
            />
          }
        />
      )}
      <ActionPanel.Section title="Copy Format">
        {ordered.map((output) => (
          <Action.CopyToClipboard
            key={output.id}
            title={`Copy ${output.title}`}
            content={output.code!}
            shortcut={parseShortcut(shortcuts[`copy:${output.id}`] || "")}
          />
        ))}
      </ActionPanel.Section>
      <ActionPanel.Section title="Motion Preview">
        {COMPONENTS.map((item) => (
          <Action
            key={item}
            title={`Preview on ${item}`}
            icon={Icon.Play}
            shortcut={parseShortcut(shortcuts[`preview:${item}`] || "")}
            onAction={() => onComponent(item)}
          />
        ))}
        <Action.Push
          title="View Full Conversion"
          icon={Icon.Info}
          target={
            <Detail
              markdown={`# ${selected.title}\n\n${selected.code ? `\`\`\`${selected.language}\n${selected.code}\n\`\`\`` : ""}\n\n${selected.note}\n\n${notes}`}
            />
          }
        />
        <Action
          title="Confirm Input and Preview"
          icon={Icon.Play}
          shortcut={parseShortcut(shortcuts.confirm || "")}
          onAction={onPreview}
        />
      </ActionPanel.Section>
      {settingsActions}
    </ActionPanel>
  );
}

export default function Command() {
  const [durationDraft, setDurationDraft] = useState<string>();
  const [curveDuration, setCurveDuration] = useState<number>();
  const [shortcuts, setShortcuts] = useState<ShortcutSettings>({
    ...DEFAULT_SHORTCUTS,
  });
  const convert = (input: string) => baseConvert(input, curveDuration);
  const previewDuration = (easing: Easing) =>
    basePreviewDuration(easing, curveDuration);
  const durationLabel = (easing: Easing) =>
    baseDurationLabel(easing, curveDuration);
  useEffect(() => {
    let active = true;
    void LocalStorage.getItem<string>(SHORTCUT_STORAGE)
      .then((saved) => {
        if (active)
          setShortcuts(
            resolveShortcuts(
              getPreferenceValues(),
              saved ? JSON.parse(saved) : {},
            ),
          );
      })
      .catch(() => {
        void showToast({
          style: Toast.Style.Failure,
          title: "Check shortcut preferences",
          message:
            "Invalid or conflicting shortcuts. Defaults are active; saved settings are unchanged.",
          primaryAction: {
            title: "Open Preferences",
            onAction: openExtensionPreferences,
          },
        });
      });
    return () => {
      active = false;
    };
  }, []);
  const [activation] = useState(() => new InputActivation());
  const [state, setState] = useState<State>({ input: "" });
  const [selected, setSelected] = useState<string | null>("ease-out");
  const [image, setImage] = useState<{
    markdown: string;
    input: string;
    startedAt: number;
  }>();
  const appearance = environment.appearance;
  const [cache] = useState(
    () =>
      new PreviewCache(
        join(environment.supportPath, "motion-previews"),
        environment.assetsPath,
      ),
  );
  const [component, setComponent] = useState<PreviewMode>("Sheet");
  const [request, setRequest] = useState<PreviewSpec>();
  const [animation, setAnimation] = useState<{ key: string; path: string }>();
  const [previewNote, setPreviewNote] = useState(
    "Use Confirm Input and Preview or select a format to animate.",
  );
  useEffect(() => {
    let active = true;
    void LocalStorage.getItem<string>("preview-component")
      .then((saved) => {
        if (
          active &&
          saved !== "Curve" &&
          PREVIEW_MODES.includes(saved as PreviewMode)
        )
          setComponent(saved as PreviewMode);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  function requestPreview(next = component) {
    if (next === "Curve") {
      setRequest(undefined);
      return;
    }
    if (environment.isDevelopment)
      console.log(
        `[preview-request] valid=${!!state.value} selected=${selected}`,
      );
    const source =
      state.value ||
      (!state.input.trim()
        ? convert(
            BROWSE_PRESETS.find((preset) => preset.input === selected)?.input ||
              "ease-out",
          )
        : undefined);
    if (!source) return;
    setRequest({
      easing: source.easing,
      duration: previewDuration(source.easing),
      component: next,
      appearance,
    });
    setPreviewNote("Static curve while the preview is prepared.");
  }
  function chooseComponent(next: PreviewMode) {
    setComponent(next);
    void LocalStorage.setItem("preview-component", next).catch(() =>
      setPreviewNote("Could not save preview choice."),
    );
    requestPreview(next);
  }
  useEffect(() => {
    if (!request) return;
    let active = true;
    const timer = setTimeout(() => {
      void cache
        .get(request)
        .then((result) => {
          if (!active) return;
          cache.setActive(result.path);
          setAnimation({ key: previewKey(request), path: result.path });
          setPreviewNote(
            `${result.cached ? "Cached" : "Generated"} · ${result.milliseconds.toFixed(1)} ms · sampled motion, 10 ms GIF timing precision${result.milliseconds > 400 ? " · Exceeds 400 ms budget" : ""}`,
          );
          if (environment.isDevelopment)
            console.log(
              `[preview] ${request.component}: ${result.milliseconds.toFixed(2)} ms, cached=${result.cached}`,
            );
        })
        .catch((error) => {
          if (!active) return;
          const message =
            error instanceof Error
              ? error.message
              : "Showing the static preview.";
          setPreviewNote(message);
          void showToast({
            style: Toast.Style.Failure,
            title: "Animation preview unavailable",
            message,
          });
        });
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [request, cache]);
  function setInput(input: string) {
    const startedAt = performance.now();
    try {
      // Synchronous detection and conversion. Only the image has a debounce.
      const value = baseConvert(input);
      const event = activation.accept(input, true);
      if (event.duplicate) return;
      setCurveDuration(undefined);
      setRequest(
        event.preview && component !== "Curve"
          ? {
              easing: value.easing,
              duration: basePreviewDuration(value.easing),
              component,
              appearance,
            }
          : undefined,
      );
      setPreviewNote("Preparing preview after typing pauses.");
      if (environment.isDevelopment)
        console.log(
          `[input-valid] selected=${selected}; initial=${event.initial}; scheduled=${event.preview}; duplicate=false`,
        );
      setState({ input, value, last: { input, value, startedAt } });
    } catch (error) {
      if (activation.accept(input, false).duplicate) return;
      setRequest(undefined);
      setState((previous) => ({
        input,
        last: input.trim() ? previous.last : undefined,
        error: error instanceof Error ? error.message : "Invalid easing.",
      }));
    }
  }
  useEffect(() => {
    if (!state.last) return;
    const last = state.last;
    const timer = setTimeout(
      () =>
        setImage({
          markdown: graphMarkdown(last.value.easing, appearance, "preview"),
          input: last.input,
          startedAt: last.startedAt,
        }),
      IMAGE_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [state.last, appearance]);
  useEffect(() => {
    // Development-only local timings: React commit is not a native paint callback.
    if (image && environment.isDevelopment)
      console.log(
        `[image-commit] ${(performance.now() - image.startedAt).toFixed(2)} ms (includes ${IMAGE_DEBOUNCE_MS} ms debounce; excludes native paint)`,
      );
  }, [image]);

  const preset = !state.input.trim()
    ? BROWSE_PRESETS.find((item) => item.input === selected) ||
      BROWSE_PRESETS[2]
    : undefined;
  const presetInput = preset?.input;
  useEffect(() => {
    if (!presetInput || component === "Curve") return;
    const easing = convert(presetInput).easing;
    setRequest({
      easing,
      duration: previewDuration(easing),
      component,
      appearance,
    });
  }, [presetInput, component, appearance, curveDuration]);
  const value = state.value || (preset ? convert(preset.input) : undefined);
  function openDuration() {
    if (!value) return;
    const easing = value.easing;
    setDurationDraft(
      String(
        Math.round(
          (easing.kind === "spring"
            ? (2 * Math.PI) / easing.omega0
            : (curveDuration ?? easing.duration ?? 0.5)) * 1000,
        ),
      ),
    );
  }
  function applyDuration() {
    if (!value || durationDraft === undefined) return;
    try {
      const seconds = durationSeconds(durationDraft);
      const easing = value.easing;
      if (easing.kind === "spring") {
        const input = state.input || preset!.input;
        const next = retimeConversion(value, seconds);
        // Register the source so controlled searchText echoes cannot overwrite
        // the canonical edit. A genuinely new input starts a new conversion.
        activation.accept(input, true);
        setState({
          input,
          value: next,
          last: { input, value: next, startedAt: performance.now() },
        });
        if (component !== "Curve")
          setRequest({
            easing: next.easing,
            duration: basePreviewDuration(next.easing),
            component,
            appearance,
          });
      } else {
        const next = baseConvert(state.input || preset!.input, seconds);
        setCurveDuration(seconds);
        setState((previous) => {
          if (!previous.value) return previous;
          return {
            ...previous,
            value: next,
            last: {
              input: previous.input,
              value: next,
              startedAt: performance.now(),
            },
          };
        });
        if (component !== "Curve")
          setRequest({
            easing: next.easing,
            duration: seconds,
            component,
            appearance,
          });
      }
      setDurationDraft(undefined);
    } catch (error) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Invalid duration",
        message: String(error),
      });
    }
  }
  const durationActions = (
    <ActionPanel>
      <Action
        title="Apply Duration"
        icon={Icon.Checkmark}
        onAction={applyDuration}
      />
      <Action
        title="Cancel Duration Edit"
        shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
        onAction={() => setDurationDraft(undefined)}
      />
    </ActionPanel>
  );
  const settingsActions = (
    <ActionPanel.Section title="Customize">
      {value && (
        <Action
          title="Edit Duration"
          icon={Icon.Pencil}
          onAction={openDuration}
        />
      )}
      <Action
        title="Open Shortcut Preferences"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </ActionPanel.Section>
  );
  const durationMetadata = value && (
    <List.Item.Detail.Metadata.TagList title="Duration">
      <List.Item.Detail.Metadata.TagList.Item
        text={
          durationDraft !== undefined
            ? `${value.easing.kind === "spring" ? "Spring period" : "Duration"} · ms · Cancel Edit`
            : `${durationLabel(value.easing)} · Edit`
        }
        onAction={
          durationDraft !== undefined
            ? () => setDurationDraft(undefined)
            : openDuration
        }
      />
    </List.Item.Detail.Metadata.TagList>
  );
  const layout = value || state.last?.value;
  const summary =
    value?.easing.kind === "spring"
      ? (() => {
          const s = value.easing,
            w = springWindow(s),
            count = crossings(s, w.seconds);
          return `${count} crossings · ${formatNumber(w.seconds)}s${w.truncated ? " · Not settled" : ""}${count >= 2 ? "\n\n**Not representable as a cubic-bezier.**" : ""}`;
        })()
      : "";
  const currentSpec = value &&
    component !== "Curve" && {
      easing: value.easing,
      duration: previewDuration(value.easing),
      component,
      appearance,
    };
  const animated =
    request &&
    currentSpec &&
    animation?.key === previewKey(currentSpec) &&
    animation.key === previewKey(request);
  const curve = preset
    ? graphMarkdown(value!.easing, appearance, "preview")
    : image?.markdown ||
      (layout ? graphMarkdown(layout.easing, appearance, "preview") : "");
  const prefix = previewMarkdown(
    curve,
    component,
    appearance,
    environment.assetsPath,
    animated ? animation.path : undefined,
  );
  const previewTags = (
    <List.Item.Detail.Metadata.TagList title="Preview">
      {COMPONENTS.map((item) => (
        <List.Item.Detail.Metadata.TagList.Item
          key={item}
          text={item === "Staggered List" ? "List" : item}
          color={item === component ? Color.Purple : Color.SecondaryText}
          onAction={() => chooseComponent(item)}
        />
      ))}
    </List.Item.Detail.Metadata.TagList>
  );
  const selection =
    (preset
      ? preset.input
      : layout?.outputs.some((o) => o.id === selected)
        ? selected
        : layout
          ? "swiftui"
          : selected) ?? undefined;

  return (
    <List
      searchBarPlaceholder={
        durationDraft !== undefined
          ? value?.easing.kind === "spring"
            ? "Edit Spring Period · ms (not settling time)"
            : "Edit Duration · ms"
          : "Paste an easing or choose a preset…"
      }
      searchText={durationDraft ?? state.input}
      onSearchTextChange={
        durationDraft !== undefined ? setDurationDraft : setInput
      }
      filtering={false}
      throttle={false}
      isShowingDetail
      selectedItemId={selection}
      onSelectionChange={(id) => {
        if (durationDraft !== undefined) return;
        if (environment.isDevelopment)
          console.log(
            `[selection] previous=${selected} next=${id} valid=${!!state.value}`,
          );
        if (id !== selected) {
          setSelected(id);
          if (id && state.value?.outputs.some((output) => output.id === id))
            requestPreview();
        }
      }}
    >
      {!state.input.trim() ? (
        <>
          {PRESET_GROUPS.map((group) => (
            <List.Section key={group.title} title={group.title}>
              {group.items.map((preset) => (
                <List.Item
                  key={preset.name}
                  id={preset.input}
                  title={preset.name}
                  icon={presetIcon(preset.input, appearance)}
                  detail={
                    <List.Item.Detail
                      markdown={`${prefix}${codePreview(
                        convert(preset.input).outputs.find(
                          (output) =>
                            output.id ===
                            (convert(preset.input).easing.kind === "spring"
                              ? "swiftui"
                              : "css-bezier"),
                        )!,
                        convert(preset.input).easing,
                      )}`}
                      metadata={
                        <List.Item.Detail.Metadata>
                          {previewTags}
                          <List.Item.Detail.Metadata.Label
                            title="Fidelity"
                            text={`Exact · ${group.source}`}
                          />
                          {durationMetadata}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    durationDraft !== undefined ? (
                      durationActions
                    ) : (
                      <ActionPanel>
                        <Action
                          title="Use Preset"
                          icon={Icon.ArrowRight}
                          onAction={() => setInput(preset.input)}
                        />
                        {COMPONENTS.map((item) => (
                          <Action
                            key={item}
                            title={`Preview on ${item}`}
                            icon={Icon.Play}
                            shortcut={parseShortcut(
                              shortcuts[`preview:${item}`] || "",
                            )}
                            onAction={() => chooseComponent(item)}
                          />
                        ))}
                        {settingsActions}
                      </ActionPanel>
                    )
                  }
                />
              ))}
            </List.Section>
          ))}
        </>
      ) : layout ? (
        <List.Section
          title={
            value
              ? `Detected · ${value.format}`
              : "Input Not Recognized · Copies Disabled"
          }
        >
          {layout.outputs.map((output) => (
            <List.Item
              key={output.id}
              id={output.id}
              title={output.title}
              icon={formatIcon(output.id, appearance)}
              accessories={[{ text: value ? output.fidelity : "Pending" }]}
              detail={
                <List.Item.Detail
                  markdown={
                    value
                      ? `${prefix}${codePreview(output, value.easing)}`
                      : `${image?.markdown || ""}\n\n### Check Input\n\n${state.error}\n\n*Showing the previous valid curve. Output and copying are unavailable until the new input is recognized.*`
                  }
                  metadata={
                    value ? (
                      <List.Item.Detail.Metadata>
                        {previewTags}
                        <List.Item.Detail.Metadata.Label
                          title="Fidelity"
                          text={
                            value.easing.kind === "spring" &&
                            output.fidelity !== "Unavailable"
                              ? `${output.fidelity} · ${crossings(value.easing, springWindow(value.easing).seconds)} crossings`
                              : output.fidelity
                          }
                        />
                        {durationMetadata}
                      </List.Item.Detail.Metadata>
                    ) : undefined
                  }
                />
              }
              actions={
                durationDraft !== undefined ? (
                  durationActions
                ) : value ? (
                  <CopyActions
                    shortcuts={shortcuts}
                    settingsActions={settingsActions}
                    outputs={value.outputs}
                    selected={output}
                    onPreview={() => requestPreview()}
                    onComponent={chooseComponent}
                    notes={[
                      summary,
                      component !== "Curve" ? REVEALS[component] : "",
                      previewNote,
                      ...value.notes,
                    ]
                      .filter(Boolean)
                      .join("\n\n")}
                  />
                ) : undefined
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.Item
          title="Check Input"
          icon={Icon.Pencil}
          detail={
            <List.Item.Detail
              markdown={`## Easing not recognized yet\n\n${state.error}\n\n### Accepted inputs\n\n- \`0.42, 0, 0.58, 1\`\n- \`cubic-bezier(0.42, 0, 0.58, 1)\`\n- \`[0.42, 0, 0.58, 1]\`\n- \`linear(0, 0.4 30%, 1)\`\n- \`{ type: "spring", stiffness: 100, damping: 10 }\`\n- \`.spring(duration: 0.5, bounce: 0.6)\``}
            />
          }
        />
      )}
    </List>
  );
}
