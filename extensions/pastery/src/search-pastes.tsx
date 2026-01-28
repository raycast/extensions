import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, MutatePromise, useFetch, useForm } from "@raycast/utils";
import { API_URL, LANGUAGES } from "./constants";
import { ActionResult, ErrorResult, Paste } from "./types";
import { useState } from "react";

const generateApiUrl = (route = "", params?: URLSearchParams) => {
  const { api_key } = getPreferenceValues<Preferences>();
  const url = new URL(`api/paste/${route}`, API_URL);
  const searchParams = new URLSearchParams({ api_key });
  params?.forEach((val, key) => val && searchParams.append(key, val));
  return url + "?" + searchParams;
};

export default function SearchPastes() {
  const {
    isLoading,
    data: pastes,
    error,
    mutate,
  } = useFetch(generateApiUrl(), {
    mapResult(result: { pastes: Paste[] }) {
      return {
        data: result.pastes,
      };
    },
    initialData: [],
  });

  const deletePaste = async (id: string) => {
    const toast = await showToast(Toast.Style.Animated, "Deleting Paste", id);

    try {
      await mutate(
        fetch(generateApiUrl(id), { method: "DELETE" })
          .then((res) => res.json())
          .then((json: ActionResult) => {
            if (json.result == "error") throw new Error(json.error_msg);
          }),
        {
          optimisticUpdate(data) {
            return data.filter((paste) => paste.id !== id);
          },
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Deleted Paste";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `${error}`;
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search pastes">
      {!isLoading && !pastes.length && !error ? (
        <List.EmptyView
          title="Pastes"
          description="You haven't created any pastes...yet!"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Create Paste" target={<CreatePaste mutate={mutate} />} />
            </ActionPanel>
          }
        />
      ) : (
        pastes.map((paste) => (
          <List.Item
            key={paste.id}
            title={paste.title}
            subtitle={paste.url}
            accessories={[
              { tag: paste.language },
              !paste.duration
                ? { text: "Never expires" }
                : {
                    date: new Date(new Date().getTime() + paste.duration * 60 * 1000),
                    tooltip: `${paste.duration} mins`,
                  },
            ]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Text} title="View Details" target={<PasteDetails id={paste.id} />} />
                <Action.OpenInBrowser icon="pastery.png" url={paste.url} />
                <Action.Push
                  icon={Icon.Plus}
                  title="Create Paste"
                  target={<CreatePaste mutate={mutate} />}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Paste"
                  style={Action.Style.Destructive}
                  onAction={() => deletePaste(paste.id)}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function PasteDetails({ id }: { id: string }) {
  const { isLoading, data: paste } = useFetch(generateApiUrl(id), {
    async parseResponse(response) {
      type Result = { pastes: Array<Paste & { body: string }> } | ErrorResult;
      const json: Result = await response.json();
      if ("result" in json) throw new Error(json.result);
      return json.pastes[0];
    },
  });
  return (
    <Detail
      isLoading={isLoading}
      markdown={paste?.body}
      metadata={
        paste && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Title" text={paste.title || paste.id} />
            <Detail.Metadata.Label
              title="Duration"
              text={paste.duration ? `${paste.duration} mins` : undefined}
              icon={paste.duration ? undefined : Icon.Minus}
            />
            <Detail.Metadata.TagList title="Language">
              <Detail.Metadata.TagList.Item text={paste.language} />
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        )
      }
      actions={
        paste && (
          <ActionPanel>
            <Action.CopyToClipboard content={paste.body} />
            <Action.OpenInBrowser icon="pastery.png" url={paste.url} />
          </ActionPanel>
        )
      }
    />
  );
}

function CreatePaste({ mutate }: { mutate: MutatePromise<Paste[]> }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  type FormValues = {
    text: string;
    duration: string;
    title: string;
    language: string;
    max_views: string;
  };

  const { itemProps, handleSubmit } = useForm<FormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      const toast = await showToast(Toast.Style.Animated, "Creating Paste", values.title);
      const params = new URLSearchParams(values);
      params.delete("text");
      try {
        await mutate(
          fetch(generateApiUrl("", params), { method: "POST", body: values.text })
            .then((r) => r.json())
            .then((res) => {
              const json = res as ErrorResult | Paste;
              if ("result" in json) throw new Error(json.error_msg);
            }),
        );
        toast.style = Toast.Style.Success;
        toast.title = "Created Paste";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = `${error}`;
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      text: FormValidation.Required,
    },
    initialValues: {
      duration: "43199",
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Text" placeholder="The text of the paste" {...itemProps.text} />
      <Form.Separator />
      <Form.Description text="Optional" />
      <Form.TextField title="Title" placeholder="The title of the paste" {...itemProps.title} />
      <Form.Dropdown title="Expires in" {...itemProps.duration}>
        <Form.Dropdown.Item title="ten minutes" value="10" />
        <Form.Dropdown.Item title="an hour" value="60" />
        <Form.Dropdown.Item title="a day" value="1440" />
        <Form.Dropdown.Item title="a week" value="10080" />
        <Form.Dropdown.Item title="two weeks" value="20160" />
        <Form.Dropdown.Item title="a month" value="43199" />
        <Form.Dropdown.Item title="never" value="" />
      </Form.Dropdown>
      <Form.Dropdown title="Language" {...itemProps.language}>
        {Object.entries(LANGUAGES).map(([val, key]) => (
          <Form.Dropdown.Item key={key} title={key} value={val} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
