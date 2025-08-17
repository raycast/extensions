import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  getFrontmostApplication,
  getPreferenceValues,
  Icon,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import axios, { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { useCollections, useTags } from "./hooks";
import { ApiResponse, Collection } from "./interfaces";
import { chromiumBrowserNames, getChromiumBrowserPath, getWebkitBrowserPath, webkitBrowserNames } from "./utils";

interface FormValues {
  name: string;
  url: string;
  collectionId: string;
  description: string;
  tagPicker: string[];
}

const fetchLink = async (preferences: Preferences, values: FormValues, collection: Collection) => {
  await showToast(Toast.Style.Animated, "Creating link");
  try {
    const response = await axios.post(
      `${preferences.LinkwardenUrl}/api/v1/links`,
      {
        name: values.name,
        url: values.url,
        description: values.description,
        type: "url",
        tags: values.tagPicker.map((tag) => ({ name: tag })),
        collection: {
          id: collection.id,
          name: collection.name,
          ownerId: collection.ownerId,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${preferences.LinkwardenApiKey}`,
        },
      },
    );

    if (response.status !== 200) {
      throw new Error("Failed to post link");
    }

    await showHUD("✅ Link added successfully");
    await closeMainWindow({ popToRootType: PopToRootType.Immediate });
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse<string>>;
    if (axiosError.response) {
      const { statusText } = axiosError.response;
      await showFailureToast(axiosError.response.data.response, { title: statusText });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to post link",
        message: axiosError.message,
      });
    }
  }
};

export default () => {
  const preferences = getPreferenceValues<Preferences>();

  const [browserPath, setBrowserPath] = useState("");

  const fetchBrowserPath = async () => {
    try {
      const app = await getFrontmostApplication();

      let path = "";
      if (webkitBrowserNames.includes(app.name)) {
        path = await getWebkitBrowserPath(app.name);
      } else if (chromiumBrowserNames.includes(app.name)) {
        path = await getChromiumBrowserPath(app.name);
      }
      setBrowserPath(path);

      if (!path) {
        throw new Error("Could not fetch URL from the browser");
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch URL",
        message: "Could not get URL from the browser. Please try again.",
      });
    }
  };

  useEffect(() => {
    fetchBrowserPath();
  }, []);

  const { isLoading: isLoadingTags, data: tags } = useTags();
  const { isLoading: isLoadingCollections, data: collections } = useCollections();

  const { itemProps, handleSubmit, reset } = useForm<FormValues>({
    async onSubmit(values) {
      const collection = collections.find((collection) => collection.id === Number(values.collectionId)) as Collection;
      await fetchLink(preferences, values, collection);
    },
    initialValues: {
      url: browserPath,
    },
    validation: {
      url: FormValidation.Required,
    },
  });

  useEffect(() => {
    if (browserPath) {
      reset({ url: browserPath });
    }
  }, [browserPath, reset]);

  return (
    <Form
      isLoading={isLoadingTags || isLoadingCollections}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.PlusSquare}
            title="Add the Website"
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.url} title="URL" placeholder="http://example.com/" />
      <Form.Dropdown title="Collection" {...itemProps.collectionId}>
        {collections.map((collection) => (
          <Form.Dropdown.Item
            key={collection.id}
            icon={{ source: Icon.Folder, tintColor: collection.color }}
            title={`${collection.name} (${collection._count.links}) [${collection.parent?.name ? `${collection.parent.name} > ` : ""}${collection.name}]`}
            value={collection.id.toString()}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField {...itemProps.name} title="Name" placeholder="Will be auto generated if left empty" autoFocus />
      <Form.TagPicker {...itemProps.tagPicker} title="Tag Picker" placeholder="Select...">
        {tags.map((tag) => (
          <Form.TagPicker.Item value={tag.name} title={tag.name} key={tag.id} />
        ))}
      </Form.TagPicker>
      <Form.TextArea title="Description" {...itemProps.description} placeholder="Notes, thoughts, etc." />
    </Form>
  );
};
