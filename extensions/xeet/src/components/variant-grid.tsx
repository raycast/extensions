import { Action, ActionPanel, Form, Grid, Icon, useNavigation } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import type { Post } from "@xeet/core";
import { useState } from "react";
import { renderContactSheet, renderVariants } from "../lib/renderer";
import { surfaces, type Options } from "../lib/settings";
import { variantOptions, type Dimension } from "../lib/variants";
import AppearanceFields from "./appearance-fields";
import ImageActions, { saveImage } from "./image-actions";
import PostPreview from "./post-preview";

const dimensions = {
  theme: "Theme",
  surface: "Surface",
  width: "Width",
  dpr: "Resolution",
  expanded: "Collapsed / Expanded",
};

function OptionsForm({ options, onSave }: { options: Options; onSave: (value: Options) => void }) {
  const [value, setValue] = useState(options);
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Update Comparison"
            icon={Icon.Checkmark}
            onSubmit={() => {
              onSave(value);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <AppearanceFields options={value} onChange={setValue} />
    </Form>
  );
}

export default function VariantGrid({
  post,
  options: initialOptions,
  warnings = [],
  source,
}: {
  post: Post;
  options: Options;
  warnings?: string[];
  source?: string;
}) {
  const [options, setOptions] = useState(initialOptions);
  const [dimension, setDimension] = useState<Dimension>("theme");
  const [exporting, setExporting] = useState(false);
  const { push } = useNavigation();
  const { data, isLoading, error, revalidate } = usePromise(
    renderVariants,
    [post, variantOptions(options, dimension)],
    { failureToastOptions: { title: "Could Not Compare Layouts" } },
  );
  const busy = isLoading || exporting;
  const previews =
    isLoading || error
      ? []
      : (data ?? []).map((result) => ({
          ...result,
          source,
          warnings: [...new Set([...warnings, ...result.warnings])],
        }));

  async function exportSheet() {
    if (busy) return;
    setExporting(true);
    try {
      await saveImage(await renderContactSheet(post, options.dpr));
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Export Contact Sheet" });
    } finally {
      setExporting(false);
    }
  }
  const commonActions = (
    <>
      <Action
        title="Change Rendering Options"
        icon={Icon.Gear}
        onAction={() => push(<OptionsForm options={options} onSave={setOptions} />)}
      />
      <Action title="Export Web Timeline Theme and Width Sheet" icon={Icon.Download} onAction={exportSheet} />
      <Action title="Regenerate Variants" icon={Icon.ArrowClockwise} onAction={revalidate} />
    </>
  );
  return (
    <Grid
      navigationTitle="Compare Post Layouts"
      columns={2}
      isLoading={busy}
      searchBarPlaceholder="Filter variants…"
      searchBarAccessory={
        <Grid.Dropdown tooltip="Compare by" value={dimension} onChange={(value) => setDimension(value as Dimension)}>
          {Object.entries(dimensions).map(([value, title]) => (
            <Grid.Dropdown.Item key={value} value={value} title={title} />
          ))}
        </Grid.Dropdown>
      }
    >
      <Grid.EmptyView
        title={busy ? "Rendering Variants…" : "Could Not Render Variants"}
        description={error?.message}
        actions={<ActionPanel>{commonActions}</ActionPanel>}
      />
      {previews.map((preview) => {
        const title =
          dimension === "surface"
            ? surfaces[preview.options.surface]
            : dimension === "expanded"
              ? preview.options.expanded
                ? "Expanded"
                : "Collapsed"
              : dimension === "theme"
                ? preview.options.theme === "light"
                  ? "Light"
                  : "Dark"
                : `${preview.options[dimension]}${dimension === "width" ? " px" : "×"}`;
        return (
          <Grid.Item
            key={preview.path}
            title={title}
            subtitle={`${Math.ceil(preview.report.size.width * preview.options.dpr)} × ${Math.ceil(preview.report.size.height * preview.options.dpr)} px`}
            content={{ source: preview.path }}
            actions={
              <ActionPanel>
                <Action title="Open Preview" icon={Icon.Eye} onAction={() => push(<PostPreview preview={preview} />)} />
                <ImageActions path={preview.path} />
                {commonActions}
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
