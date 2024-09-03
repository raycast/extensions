import {
  Action,
  ActionPanel,
  Icon,
  Form,
  showToast,
  Toast,
  getPreferenceValues,
  getFrontmostApplication,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { FormValidation, showFailureToast, useFetch, useForm } from "@raycast/utils";
import axios, { AxiosError } from "axios";
import { chromiumBrowserNames, getChromiumBrowserPath, getWebkitBrowserPath, webkitBrowserNames } from "./utils";

interface FormValues {
  name: string;
  url: string;
  description: string;
  tagPicker: string[];
}

interface Tag {
  id: number;
  name: string;
  ownerId: number;
}

interface ApiResponse {
  response: Tag[];
}

const fetchLink = async (preferences: Preferences, values: FormValues, ownerIDValue: number | undefined) => {
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
          name: "Unorganized",
          ownerId: ownerIDValue,
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

    showToast({
      style: Toast.Style.Success,
      title: "Link posted successfully",
    });
  } catch (error) {
    const axiosError = error as AxiosError<{ response: string }>;
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

  const { data: tags } = useFetch(`${preferences.LinkwardenUrl}/api/v1/tags`, {
    headers: {
      Authorization: `Bearer ${preferences.LinkwardenApiKey}`,
    },
    mapResult(result: ApiResponse) {
      return {
        data: result.response,
      };
    },
    initialData: [],
    keepPreviousData: true,
  });

  const firstOwnerID = tags.find((tag) => tag.ownerId);

  const ownerIDValue = firstOwnerID?.ownerId;

  const { itemProps, handleSubmit } = useForm<FormValues>({
    async onSubmit(values) {
      await fetchLink(preferences, values, ownerIDValue);
    },
    initialValues: {
      url: browserPath
    },
    validation: {
      url: FormValidation.Required
    }
  });

  return (
    <Form
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
