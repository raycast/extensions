import { Action, ActionPanel, Detail, Form, Icon, popToRoot } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import { useEffect, useMemo } from "react";
import { NotInstalled } from "./components/NotInstalled";
import { isPicmalInstalled } from "./lib/cli";
import { runAndReport } from "./lib/feedback";
import { selectedFinderPaths } from "./lib/finder";
import { FormatGroups, humanJoin, loadFormats, mediaRoots, selectedCategories, targetCategories } from "./lib/formats";
import { convertDefaults } from "./lib/preferences";
import { QUALITY_OPTIONS } from "./lib/constants";

const GROUPS: { key: keyof FormatGroups; title: string; icon: Icon }[] = [
  { key: "image", title: "Image", icon: Icon.Image },
  { key: "audio", title: "Audio", icon: Icon.Music },
  { key: "video", title: "Video", icon: Icon.Video },
  { key: "document", title: "Document", icon: Icon.Document },
];

interface ConvertFormValues {
  input: string[];
  format: string;
  compress: boolean;
  quality: string;
  stripMetadata: boolean;
  overwrite: boolean;
}

export default function Convert() {
  // Deferred so Spotlight (mdfind) never runs on the synchronous render path.
  const { data: installed } = usePromise(async () => isPicmalInstalled());
  const defaults = useMemo(() => convertDefaults(), []);
  const { data: formats, isLoading: loadingFormats } = usePromise(loadFormats);
  const { data: finderPaths, isLoading: loadingFinder } = usePromise(selectedFinderPaths);

  const { handleSubmit, itemProps, setValue, values } = useForm<ConvertFormValues>({
    async onSubmit(values) {
      await runAndReport("convert", {
        input: values.input,
        format: values.format,
        // Convert is a pure format change at maximum quality unless "Compress"
        // is on, in which case it encodes at the chosen quality (empty → the
        // CLI's per-format default).
        quality: values.compress ? (values.quality ? Number(values.quality) : undefined) : 100,
        stripMetadata: values.stripMetadata,
        overwrite: values.overwrite,
      });
      await popToRoot();
    },
    initialValues: {
      input: [],
      format: "",
      compress: defaults.compress,
      quality: defaults.quality != null ? String(defaults.quality) : "",
      stripMetadata: defaults.stripMetadata,
      overwrite: defaults.overwrite,
    },
    validation: {
      input: (value) => (!value || value.length === 0 ? "Select at least one file" : undefined),
      format: FormValidation.Required,
    },
  });

  // Prefill the file picker with the current Finder selection once it resolves.
  useEffect(() => {
    if (finderPaths && finderPaths.length > 0) setValue("input", finderPaths);
  }, [finderPaths]);

  // Apply the preferred default format once the supported list has loaded and
  // only if it's actually supported (the preference is free text).
  useEffect(() => {
    if (!defaults.format || !formats) return;
    const all = [...formats.image, ...formats.audio, ...formats.video, ...formats.document];
    if (all.includes(defaults.format)) setValue("format", defaults.format);
  }, [formats]);

  // Restrict target formats to what makes sense for the selected files' type.
  const sourceCategories = useMemo(
    () => (formats ? selectedCategories(values.input ?? [], formats) : null),
    [formats, values.input],
  );
  const targets = useMemo(() => (sourceCategories ? targetCategories(sourceCategories) : null), [sourceCategories]);
  const visibleGroups = GROUPS.filter((group) => !targets || targets.has(group.key));

  // A single target format can only serve one root kind. Warn (don't block)
  // when the selection mixes images, audio, and/or video.
  const mixedKinds = useMemo(() => {
    const roots = sourceCategories ? mediaRoots(sourceCategories) : new Set<string>();
    return roots.size > 1 ? humanJoin([...roots]) : null;
  }, [sourceCategories]);

  // When the selection changes media type, clear a now-hidden target format.
  useEffect(() => {
    if (!formats || !targets || !values.format) return;
    const visible = new Set(visibleGroups.flatMap((group) => formats[group.key]));
    if (!visible.has(values.format)) setValue("format", "");
  }, [targets]);

  if (installed === undefined) return <Detail isLoading />;
  if (!installed) return <NotInstalled />;

  const prefilledCount = finderPaths?.length ?? 0;

  return (
    <Form
      isLoading={loadingFormats || loadingFinder}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert" icon={Icon.Wand} onSubmit={handleSubmit} />
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
      <Form.Dropdown {...itemProps.format} title="Convert To">
        {visibleGroups.map(({ key, title, icon }) => {
          const items = formats?.[key] ?? [];
          if (items.length === 0) return null;
          return (
            <Form.Dropdown.Section key={key} title={title}>
              {items.map((fmt) => (
                <Form.Dropdown.Item key={fmt} value={fmt} title={fmt.toUpperCase()} icon={icon} />
              ))}
            </Form.Dropdown.Section>
          );
        })}
      </Form.Dropdown>
      {mixedKinds && (
        <Form.Description
          title="Mixed Selection"
          text={`Your selection mixes ${mixedKinds} files. One format applies to a single kind — files of the other kinds will be skipped.`}
        />
      )}
      <Form.Checkbox {...itemProps.compress} label="Compress after converting" />
      {values.compress && (
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
