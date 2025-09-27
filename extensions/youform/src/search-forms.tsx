import { ActionPanel, List, Action, Icon, Image, Keyboard, Color } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { PaginatedResult, Form, Submission, Block } from "./types";
import { API_URL, API_HEADERS, BLOCK_TYPE_ICONS } from "./config";

function getFormIcon(form: Form): Image.ImageLike {
  if (form.deleted_at) return { source: Icon.Trash, tintColor: Color.Red };
  if (form.closed) return { source: Icon.Xmark, tintColor: Color.Red };
  if (!form.published_at) return { source: Icon.Dot, tintColor: Color.Blue };
  if (form.close_by_date || form.close_by_submissions) return { source: Icon.Dot, tintColor: Color.Yellow };
  return { source: Icon.Dot, tintColor: Color.Green };
}
export default function SearchForms() {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-form-details", false);
  const { isLoading, data: forms } = useFetch(API_URL + "forms", {
    headers: API_HEADERS,
    mapResult(result: PaginatedResult<Form>) {
      return {
        data: result.data.data,
      };
    },
    initialData: [],
  });
  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail}>
      {!isLoading && !forms.length ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, mask: Image.Mask.Circle }}
          title="No forms created in this workspace yet."
          description="What would you like to do?"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                icon={Icon.PlusCircle}
                title="Create Form"
                url="https://app.youform.com/dashboard"
              />
              <Action.OpenInBrowser icon={Icon.AddPerson} title="Invite Team" url="https://app.youform.com/dashboard" />
            </ActionPanel>
          }
        />
      ) : (
        forms.map((form) => (
          <List.Item
            key={form.id}
            icon={getFormIcon(form)}
            title={form.name}
            subtitle={(!isShowingDetail && form.description) || undefined}
            accessories={
              isShowingDetail
                ? undefined
                : [
                    { text: `${form.submissions_count || "No"} responses` },
                    {
                      date: new Date(form.updated_at),
                    },
                  ]
            }
            detail={
              <List.Item.Detail
                markdown={form.description}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="User ID" text={form.user_id.toString()} />
                    <List.Item.Detail.Metadata.Label title="Workspace ID" text={form.workspace_id.toString()} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Design" />
                    <List.Item.Detail.Metadata.Label title="Font" text={form.design.font} />
                    <List.Item.Detail.Metadata.Label title="Corner" text={form.design.corner} />
                    <List.Item.Detail.Metadata.TagList title="Text Color">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={form.design["text-color"]}
                        color={form.design["text-color"]}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.TagList title="Rating Color">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={form.design["rating-color"]}
                        color={form.design["rating-color"]}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.TagList title="Background Color">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={form.design["background-color"]}
                        color={form.design["background-color"]}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.TagList title="Button Text Color">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={form.design["button-text-color"]}
                        color={form.design["button-text-color"]}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.TagList title="Button Text Color">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={form.design["button-text-color"]}
                        color={form.design["button-text-color"]}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Link
                      title="Background Image URL"
                      text={form.design["background-image-url"]}
                      target={form.design["background-image-url"]}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Button Background Color"
                      text={form.design["button-background-color"]}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Box} title="Blocks" target={<Blocks form={form} />} />
                <Action.Push icon={Icon.Document} title="Submissions" target={<Submissions formSlug={form.slug} />} />
                <Action
                  shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
                  icon={Icon.AppWindowSidebarLeft}
                  title="Toggle Details"
                  onAction={() => setIsShowingDetail((show) => !show)}
                />
                <Action.OpenInBrowser
                  shortcut={Keyboard.Shortcut.Common.Open}
                  icon="extension-icon.png"
                  title="Open in Dashboard"
                  url={`https://app.youform.com/form/${form.slug}/build`}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function BlockItem({ block }: { block: Block }) {
  const icon =
    block.post_submission_action === "button" ? Icon.ArrowRight : BLOCK_TYPE_ICONS[block.type] || Icon.QuestionMark;
  const title = `${block.position}. ${block.display_name || block.title || block.shadow_title || block.question || block.shadow_question || ""}`;
  return (
    <List.Item
      icon={{ value: icon, tooltip: block.type }}
      title={{ value: title, tooltip: title }}
      detail={
        <List.Item.Detail
          markdown={`| key | val |
|---|---|
${Object.entries(block)
  .map(([key, val]) => `| ${key} | ${JSON.stringify(val)} |`)
  .join(`\n`)}`}
        />
      }
    />
  );
}
function Blocks({ form }: { form: Form }) {
  return (
    <List navigationTitle={`Search Forms / ${form.slug} / Build`} isShowingDetail>
      <List.Section title="Fields">
        {form.fields?.blocks.map((block) => (
          <BlockItem key={block.id} block={block} />
        ))}
      </List.Section>
      <List.Section title="Draft Fields">
        {form.draft_fields?.blocks.map((block) => (
          <BlockItem key={block.id} block={block} />
        ))}
      </List.Section>
    </List>
  );
}

function Submissions({ formSlug }: { formSlug: string }) {
  const { isLoading, data: submissions } = useFetch(API_URL + `forms/${formSlug}/submissions`, {
    headers: API_HEADERS,
    mapResult(result: PaginatedResult<Submission>) {
      return {
        data: result.data.data,
      };
    },
    initialData: [],
  });
  return (
    <List navigationTitle={`Search Forms / ${formSlug} / Submissions`} isLoading={isLoading}>
      {!isLoading && !submissions.length ? (
        <List.EmptyView
          title="No submissions yet."
          description="Please share your form to the world to start collecting submissions."
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Share URL"
                content={`https://app.youform.com/form/${formSlug}/share`}
              />
            </ActionPanel>
          }
        />
      ) : (
        submissions.map((submission) => <List.Item key={submission.id} title={submission.uid} />)
      )}
    </List>
  );
}
