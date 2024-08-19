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
import { useFetch, useForm } from "@raycast/utils";
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
          Cookie: `__Secure-next-auth.session-token=${preferences.LinkwardenApiKey}`,
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
    const axiosError = error as AxiosError;
    console.error("Error posting link:", axiosError);
    if (axiosError.response) {
      const status = axiosError.response.status;
      if (status === 409) {
        showToast({
          style: Toast.Style.Failure,
          title: "Conflict",
          message: "A link with this URL already exists.",
        });
      } else if (status === 400) {
        showToast({
          style: Toast.Style.Failure,
          title: "Bad Request",
          message: "The request was malformed. Please check the data and try again.",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to post link",
          message: axiosError.message,
        });
      }
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
      console.log("Browser path:", path);
      setBrowserPath(path);

      if (!path) {
        throw new Error("Could not fetch URL from the browser");
      }
    } catch (error) {
      console.error("Error fetching frontmost application:", error);
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

  const { data }: { data: ApiResponse | undefined } = useFetch<ApiResponse>(
    `${preferences.LinkwardenUrl}/api/v1/tags`,
    {
      headers: {
        Cookie: `__Secure-next-auth.session-token=${preferences.LinkwardenApiKey}`,
      },
      keepPreviousData: true,
    },
  );

  const dataArray = Array.isArray(data?.response) ? data.response : [];

  const firstOwnerID = dataArray.find((tag) => tag.ownerId);

  const ownerIDValue = firstOwnerID?.ownerId;

  const { itemProps, handleSubmit } = useForm<FormValues>({
    async onSubmit(values) {
      if (!values.url) {
        showToast({
          style: Toast.Style.Failure,
          title: "Validation Error",
          message: "URL cannot be empty.",
        });
        return;
      }

      await fetchLink(preferences, values, ownerIDValue);
    },
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
      <Form.TextField id="url" value={browserPath} title="URL" />
      <Form.TextField id="name" title="Name" placeholder="Keep default name" autoFocus />
      <Form.TagPicker {...itemProps.tagPicker} title="Tag Picker">
        {dataArray.map((tag) => (
          <Form.TagPicker.Item value={tag.name} title={tag.name} key={tag.id} />
        ))}
      </Form.TagPicker>
      <Form.TextArea title="Description" id="description" placeholder="A super website..." />
    </Form>
  );
};
