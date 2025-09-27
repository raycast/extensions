import { ActionPanel, List, Action, Icon, Image, Keyboard } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { PaginatedResult, Form, Submission, Block } from "./types";
import { API_URL, API_HEADERS } from "./config";

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
            icon={
              form.design["background-image-url"] || { source: Icon.List, tintColor: form.design["background-color"] }
            }
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
                    <List.Item.Detail.Metadata.Label title="Text Color" text={form.design["text-color"]} />
                    <List.Item.Detail.Metadata.Label title="Rating Color" text={form.design["rating-color"]} />
                    <List.Item.Detail.Metadata.Label title="Background Color" text={form.design["background-color"]} />
                    <List.Item.Detail.Metadata.Label
                      title="Button Text Color"
                      text={form.design["button-text-color"]}
                    />
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
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function BlockItem({ block }: { block: Block }) {
  let icon: Icon;
  switch (block.type) {
    case "input":
      icon = block.is_email ? Icon.AtSymbol : Icon.TextInput;
      break;
    case "text":
      icon = Icon.Text;
      break;
    case "textarea":
      icon = Icon.Paragraph;
      break;
    case "star_rating":
      icon = Icon.Stars;
      break;

    default:
      icon = Icon.Document;
      break;
  }
  const title = `${block.position} | ${block.display_name || block.title || block.shadow_title || block.question || block.shadow_question || ""}`;
  return (
    <List.Item
      icon={{ source: icon, tooltip: block.type }}
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
    <List isShowingDetail>
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
    <List isLoading={isLoading}>
      {!isLoading && !submissions.length ? (
        <List.EmptyView
          title="No complete submissions yet."
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
