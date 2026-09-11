import { Action, ActionPanel, Detail, Form, Icon, popToRoot } from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { useEffect, useMemo } from "react";
import { NotInstalled } from "./components/NotInstalled";
import { isPicmalInstalled } from "./lib/cli";
import { runAndReport } from "./lib/feedback";
import { selectedFinderPaths } from "./lib/finder";
import { humanJoin, loadFormats, mediaRoots, selectedCategories } from "./lib/formats";
import { compressDefaults } from "./lib/preferences";
import { loadPresets, Preset } from "./lib/presets";
import { QUALITY_OPTIONS } from "./lib/constants";

const KINDS: { key: Preset["kind"]; title: string; icon: Icon }[] = [
  { key: "image", title: "Image", icon: Icon.Image },
  { key: "audio", title: "Audio", icon: Icon.Music },
  { key: "video", title: "Video", icon: Icon.Video },
];

interface CompressFormValues {
  input: string[];
  preset: string;
  quality: string;
  stripMetadata: boolean;
  overwrite: boolean;
}

export default function Compress() {
  // Deferred so Spotlight (mdfind) never runs on the synchronous render path.
  const { data: installed } = usePromise(async () => isPicmalInstalled());
  const defaults = useMemo(() => compressDefaults(), []);
  const { data: presets, isLoading: loadingPresets } = usePromise(loadPresets);
  const { data: formats, isLoading: loadingFormats } = usePromise(loadFormats);
  const { data: finderPaths, isLoading: loadingFinder } = usePromise(selectedFinderPaths);

  const { handleSubmit, itemProps, setValue, values } = useForm<CompressFormValues>({
    async onSubmit(values) {
      await runAndReport("compress", {
        input: values.input,
        preset: values.preset || undefined,
        // Preset and quality are mutually exclusive — a chosen preset owns quality.
        quality: values.preset ? undefined : values.quality ? Number(values.quality) : undefined,
        stripMetadata: values.stripMetadata,
        overwrite: values.overwrite,
      });
      await popToRoot();
    },
    initialValues: {
      input: [],
      preset: "",
      quality: defaults.quality != null ? String(defaults.quality) : "",
      stripMetadata: defaults.stripMetadata,
      overwrite: defaults.overwrite,
    },
    validation: {
      input: (value) => (!value || value.length === 0 ? "Select at least one file" : undefined),
    },
  });

  // Prefill the file picker with the current Finder selection once it resolves.
  useEffect(() => {
    if (finderPaths && finderPaths.length > 0) setValue("input", finderPaths);
  }, [finderPaths]);

  // Restrict presets to the kind(s) matching the selected files' media type.
  const presetKinds = useMemo(() => {
    if (!formats) return null;
    const cats = selectedCategories(values.input ?? [], formats);
    if (cats.size === 0) return null;
    return mediaRoots(cats) as Set<Preset["kind"]>;
  }, [formats, values.input]);
  const visibleKinds = KINDS.filter((kind) => !presetKinds || presetKinds.has(kind.key));

  // A preset only applies to its own kind. Warn (don't block) when one is
  // chosen but the selection also contains files of other kinds.
  const presetMismatch = useMemo(() => {
    if (!values.preset || !presetKinds) return null;
    const chosen = (presets ?? []).find((p) => p.name === values.preset);
    if (!chosen) return null;
    const others = [...presetKinds].filter((kind) => kind !== chosen.kind);
    return others.length > 0 ? { kind: chosen.kind, others: humanJoin(others) } : null;
  }, [values.preset, presetKinds, presets]);

  // When the selection changes media type, clear a now-hidden preset.
  useEffect(() => {
    if (!presetKinds || !values.preset) return;
    const visible = new Set((presets ?? []).filter((p) => presetKinds.has(p.kind)).map((p) => p.name));
    if (!visible.has(values.preset)) setValue("preset", "");
  }, [presetKinds]);

  if (installed === undefined) return <Detail isLoading />;
  if (!installed) return <NotInstalled />;

  const prefilledCount = finderPaths?.length ?? 0;

  return (
    <Form
      isLoading={loadingPresets || loadingFormats || loadingFinder}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Compress" icon={Icon.ArrowDown} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker {...itemProps.input} title="Files" allowMultipleSelection />
      {prefilledCount > 0 && (
        <Form.Description
          title="From Finder"
          text={`Prefilled ${prefilledCount} file${prefilledCount === 1 ? "" : "s"}`}
        />
      )}
      <Form.Dropdown {...itemProps.preset} title="Preset">
        <Form.Dropdown.Item value="" title="None" icon={Icon.Minus} />
        {visibleKinds.map(({ key, title, icon }) => {
          const items = (presets ?? []).filter((p) => p.kind === key);
          if (items.length === 0) return null;
          return (
            <Form.Dropdown.Section key={key} title={title}>
              {items.map((preset) => (
                <Form.Dropdown.Item
                  key={`${preset.kind}:${preset.id}`}
                  value={preset.name}
                  title={preset.name}
                  icon={icon}
                />
              ))}
            </Form.Dropdown.Section>
          );
        })}
      </Form.Dropdown>
      {presetMismatch && (
        <Form.Description
          title="Mixed Selection"
          text={`This preset only applies to ${presetMismatch.kind} files. The ${presetMismatch.others} files in your selection will be skipped.`}
        />
      )}
      {values.preset ? (
        <Form.Description title="Quality" text="Controlled by the selected preset." />
      ) : (
        <Form.Dropdown {...itemProps.quality} title="Quality">
          {QUALITY_OPTIONS.map((opt) => (
            <Form.Dropdown.Item key={opt.value || "auto"} value={opt.value} title={opt.title} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Separator />
      <Form.Checkbox {...itemProps.stripMetadata} label="Strip metadata (EXIF/IPTC/XMP)" />
      <Form.Checkbox {...itemProps.overwrite} label="Overwrite existing files" />
    </Form>
  );
}
