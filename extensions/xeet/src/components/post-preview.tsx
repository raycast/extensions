import { shortcuts } from "../lib/shortcuts";
import { Action, ActionPanel, Detail, Icon, showToast, Toast, useNavigation, Keyboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useRef, useState } from "react";
import { pathToFileURL } from "node:url";
import { renderPost, type Preview } from "../lib/renderer";
import { saveDraft } from "../lib/storage";
import { surfaces } from "../lib/settings";
import ImageActions from "./image-actions";
import PostForm from "./post-form";
import VariantGrid from "./variant-grid";

export default function PostPreview({ preview: initial, draftId }: { preview: Preview; draftId?: string }) {
  const [preview, setPreview] = useState(initial);
  const [savedId, setSavedId] = useState(draftId);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const { push } = useNavigation();
  async function changeAppearance(change: Partial<Preview["options"]>) {
    if (busy) return;
    setBusy(true);
    try {
      setPreview(await renderPost(preview.post, { ...preview.options, ...change }, preview.warnings, preview.source));
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Render Preview" });
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (saving.current) return;
    saving.current = true;
    try {
      const draft = await saveDraft(preview.post, preview.options, savedId);
      setSavedId(draft.id);
      await showToast({ style: Toast.Style.Success, title: "Draft Saved" });
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Save Draft" });
    } finally {
      saving.current = false;
    }
  }
  const { report, options } = preview;
  return (
    <Detail
      navigationTitle="Post Preview"
      isLoading={busy}
      markdown={`![Post preview](${pathToFileURL(preview.path).href}?raycast-width=${Math.min(report.size.width, 600)})`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Dimensions"
            text={`${Math.ceil(report.size.width * options.dpr)} × ${Math.ceil(report.size.height * options.dpr)} px`}
          />
          <Detail.Metadata.Label
            title="Characters"
            text={`${report.length.weighted} / ${report.length.limit}${report.length.weighted <= report.length.limit ? "" : " · Over standard limit"}`}
          />
          <Detail.Metadata.Label
            title="Text"
            text={
              report.text.hasShowMore
                ? `Show more (${report.text.showMore})`
                : options.expanded
                  ? "Expanded"
                  : report.text.truncated
                    ? "Truncated"
                    : "Fully visible"
            }
          />
          <Detail.Metadata.Label title="Surface" text={surfaces[options.surface]} />
          <Detail.Metadata.Label
            title="Appearance"
            text={`${options.theme === "light" ? "Light" : "Dark"} · ${options.width} px · ${options.dpr}×`}
          />
          {preview.source && <Detail.Metadata.Link title="Source" text="View Public Post" target={preview.source} />}
          {preview.warnings.length > 0 && <Detail.Metadata.Separator />}
          {preview.warnings.map((warning, index) => (
            <Detail.Metadata.Label key={index} title="Notice" text={warning} />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ImageActions path={preview.path} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Edit Post"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={() =>
                push(
                  <PostForm
                    navigationTitle="Edit Post"
                    initialPost={preview.post}
                    initialOptions={options}
                    draftId={savedId}
                  />,
                )
              }
            />
            <Action
              title="Switch Theme"
              icon={Icon.Moon}
              shortcut={shortcuts.switchTheme}
              onAction={() => changeAppearance({ theme: options.theme === "light" ? "dark" : "light" })}
            />
            <Action
              title={options.expanded ? "Collapse Post" : "Expand Post"}
              icon={Icon.ArrowsExpand}
              onAction={() => changeAppearance({ expanded: !options.expanded })}
            />
            <Action
              title="Compare Variants"
              icon={Icon.AppWindowGrid3x3}
              shortcut={shortcuts.compare}
              onAction={() =>
                push(
                  <VariantGrid
                    post={preview.post}
                    options={options}
                    warnings={preview.warnings}
                    source={preview.source}
                  />,
                )
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action title="Save Draft" icon={Icon.Document} onAction={save} />
            <Action.CopyToClipboard title="Copy Post Text" content={preview.post.text} />
            <Action.CopyToClipboard title="Copy Post JSON" content={JSON.stringify(preview.post, null, 2)} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
