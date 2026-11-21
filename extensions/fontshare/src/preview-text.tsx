import { Action, ActionPanel, Color, Form, Grid, Icon, Keyboard, LaunchProps, useNavigation } from "@raycast/api";
import { useState } from "react";
import { fontKeywords, FONTSHARE_URL } from "./api";
import FontDetail from "./font-detail";
import { FontActions } from "./font-actions";
import { PREVIEW_PLACEHOLDER, useTextPreviews } from "./preview";
import { useCatalog } from "./use-catalog";

const DEFAULT_TEXT = "The quick brown fox jumps over the lazy dog";

const EDIT_TEXT_SHORTCUT = Keyboard.Shortcut.Common.Edit;

function EditTextForm({ text, onChange }: { text: string; onChange: (text: string) => void }) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="Edit Preview Text"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Update Preview"
            icon={Icon.Text}
            onSubmit={(values: { text: string }) => {
              onChange(values.text.trim() || DEFAULT_TEXT);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="text" title="Preview Text" defaultValue={text} />
    </Form>
  );
}

export default function Command(props: LaunchProps<{ arguments: Arguments.PreviewText }>) {
  const [text, setText] = useState(props.arguments.text?.trim() || DEFAULT_TEXT);
  const {
    fonts: { data: fonts, isLoading, error, revalidate },
    catalog,
  } = useCatalog("fonts");
  const { files: previews, isRendering } = useTextPreviews(fonts, text);

  const editText = (
    <Action.Push
      title="Edit Preview Text"
      icon={Icon.Pencil}
      shortcut={EDIT_TEXT_SHORTCUT}
      target={<EditTextForm text={text} onChange={setText} />}
    />
  );

  return (
    <Grid
      columns={3}
      aspectRatio="3/2"
      fit={Grid.Fit.Contain}
      isLoading={isLoading || isRendering}
      searchBarPlaceholder="Filter fonts by name, designer, category or tag"
    >
      {error && !fonts ? (
        <Grid.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load fonts"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action.OpenInBrowser title="Open Fontshare" url={FONTSHARE_URL} />
            </ActionPanel>
          }
        />
      ) : (
        <Grid.EmptyView
          icon={Icon.Text}
          title="No fonts found"
          description="Try a different name, designer or tag."
          actions={<ActionPanel>{editText}</ActionPanel>}
        />
      )}
      <Grid.Section title={`Preview: ${text}`}>
        {fonts?.map((font) => (
          <Grid.Item
            key={font.id}
            title={font.name}
            subtitle={font.categories.join(", ")}
            keywords={fontKeywords(font)}
            content={{
              value: previews[font.id]
                ? { source: previews[font.id], tintColor: Color.PrimaryText }
                : PREVIEW_PLACEHOLDER,
              tooltip: font.designers.join(", "),
            }}
            actions={
              <FontActions font={font} extra={editText}>
                <Action.Push
                  title="Show Details"
                  icon={Icon.Sidebar}
                  target={<FontDetail font={font} catalog={catalog} />}
                />
              </FontActions>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}
