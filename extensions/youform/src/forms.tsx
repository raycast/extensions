import { ActionPanel, List, Action, Icon, Image, Keyboard } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { PaginatedResult, Form, Block } from "./types";
import { API_URL, API_HEADERS, BLOCK_TYPE_ICONS } from "./config";
import Submissions from "./submissions";
import { getBlockTitle, getFormIcon } from "./utils";

function ColorTag({ title, color }: { title: string; color: string }) {
  return (
    <List.Item.Detail.Metadata.TagList title={title}>
      <List.Item.Detail.Metadata.TagList.Item text={color} color={color} />
    </List.Item.Detail.Metadata.TagList>
  );
}
export default function Forms() {
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
                    <ColorTag title="Text Color" color={form.design["text-color"]} />

                    <ColorTag title="Rating Color" color={form.design["rating-color"]} />

                    <ColorTag title="Background Color" color={form.design["background-color"]} />

                    <ColorTag title="Button Text Color" color={form.design["button-text-color"]} />

                    <ColorTag title="Button Text Color" color={form.design["button-text-color"]} />

                    <List.Item.Detail.Metadata.Link
                      title="Background Image URL"
                      text={form.design["background-image-url"]}
                      target={form.design["background-image-url"]}
                    />
                    <ColorTag title="Button Background Color" color={form.design["button-background-color"]} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Box} title="Blocks" target={<Blocks form={form} />} />
                <Action.Push icon={Icon.Document} title="Submissions" target={<Submissions form={form} />} />
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
    block.post_submission_action === "button" ? Icon.ArrowRight : (BLOCK_TYPE_ICONS[block.type] ?? Icon.QuestionMark);
  const title = `${block.position}. ${getBlockTitle(block)}`;
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
