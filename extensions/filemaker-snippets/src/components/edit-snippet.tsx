import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { detectType } from "../utils/FmClipTools";
import { v4 as uuidv4 } from "uuid";
import { getDefaultPath, getFromClipboard, saveSnippetFile } from "../utils/snippets";
import { Snippet, SnippetType, snippetTypesMap } from "../utils/types";
import { useLocations } from "../utils/use-locations";
import { useState } from "react";
import { rmSync } from "fs";

export type EditSnippetProps = {
  snippet: Partial<Snippet> & Required<Pick<Snippet, "snippet">>;
  onSubmit: () => void;
};
export type FormValues = Omit<Snippet, "tags"> & { tags: string };
type ItemPropsType<T extends Form.Value> = Partial<Form.ItemProps<T>> & { id: string };

export default function EditSnippet({ snippet, onSubmit }: EditSnippetProps) {
  const { handleSubmit, itemProps, snippetText, setSnippetText, locations } = useFormLogic({ snippet, onSubmit });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues> title="Save Snippet" onSubmit={handleSubmit} icon={Icon.Check} />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Raw XML"
              icon={Icon.CopyClipboard}
              content={snippet.snippet}
              shortcut={{ key: "c", modifiers: ["cmd"] }}
            />
            <Action
              title="Reload Snippet"
              shortcut={{ key: "r", modifiers: ["cmd"] }}
              icon={Icon.RotateAntiClockwise}
              onAction={async () => {
                if (
                  !snippet.customXML ||
                  (await confirmAlert({
                    title: "Custom XML Detected",
                    message: "If you reload the snippet now, you may overwrite those custom changes. Are you sure?",
                    primaryAction: {
                      title: "Reload",
                      style: Alert.ActionStyle.Destructive,
                    },
                    icon: Icon.Code,
                  }))
                ) {
                  getFromClipboard().then((data) => {
                    if (data) setSnippetText(data);
                  });
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" {...itemProps.name} autoFocus />
      <Form.TextArea title="Description" {...itemProps.description} />
      {locations.length > 0 ? (
        <Form.Dropdown title="Location" {...itemProps.locId} storeValue>
          <Form.Dropdown.Item title="My Computer" value="default" />
          {locations
            .filter((loc) => !loc.git)
            .map((location) => (
              <Form.Dropdown.Item title={location.name} value={location.id} key={location.id} />
            ))}
        </Form.Dropdown>
      ) : (
        <Form.Description text="My Computer" title="Location" />
      )}
      <Form.TextField {...itemProps.tags} title="Keywords" info="Comma-separated for easy searching" />
      {/* My type is more specific than just "string", this make the Form.Dropdown component happy */}
      <Form.Dropdown title="Type" {...(itemProps.type as ItemPropsType<string>)}>
        {(Object.keys(snippetTypesMap) as SnippetType[]).map((type) => (
          <Form.Dropdown.Item title={snippetTypesMap[type]} value={type} key={type} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description text="Press ⌘+R to re-capture the snippet from your clipboard" title="Tip" />
      <Form.Description text={limit(snippetText, 500)} title="Snippet" />
    </Form>
  );
}

export function useFormLogic({ onSubmit, snippet }: EditSnippetProps) {
  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: saveSnippet,
    initialValues: { ...snippet, type: detectType(snippet.snippet), tags: snippet.tags?.join(",") ?? "" },
    validation: { name: FormValidation.Required },
  });
  const [locations] = useLocations();
  const [snippetText, setSnippetText] = useState(snippet.snippet);

  async function saveSnippet(values: FormValues) {
    const toast = await showToast({ title: "Saving snippet...", style: Toast.Style.Animated });
    const id = snippet.id ?? uuidv4();
    const foundLocation = locations.find((l) => l.id === values.locId);

    const success = await saveSnippetFile(
      {
        ...values,
        tags: typeof values.tags === "string" ? values.tags?.split(",") ?? [] : values.tags,
        snippet: snippetText,
        id,
      },
      foundLocation
    );
    if (success) {
      if (snippet.locId && values.locId !== snippet.locId) {
        // location changed, need to move the file instead of just updating the snippet
        console.log(`Snippet Location moved from ${snippet.locId} to ${values.locId}`);
        const foundOldLocation = locations.find((l) => l.id === snippet.locId);
        const oldPath = foundOldLocation?.path ?? getDefaultPath();
        rmSync(`${oldPath}/${id}.json`);
      }

      toast.title = "Snippet saved!";
      toast.message = "";
      toast.style = Toast.Style.Success;
      onSubmit();
    } else {
      toast.message = "Error saving snippet";
      toast.style = Toast.Style.Failure;
    }
  }
  return { handleSubmit, itemProps, snippetText, setSnippetText, locations };
}

function limit(string = "", limit = 0) {
  const limited = string.substring(0, limit);
  if (limited.length < string.length) {
    return limited + "…";
  }
  return limited;
}
