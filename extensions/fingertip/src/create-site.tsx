import { useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  getPreferenceValues,
  openExtensionPreferences,
  Detail,
  open,
} from "@raycast/api";
import Fingertip from "fingertip";
import "node-fetch-native/polyfill";

interface FormValues {
  name: string;
  description: string;
  slug: string;
  businessType: string;
}

interface Preferences {
  apiKey: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);

  const client = useMemo(
    () =>
      new Fingertip({
        apiKey: preferences.apiKey,
      }),
    [preferences.apiKey],
  );

  // Check if API key is set
  if (!preferences.apiKey) {
    return (
      <Detail
        markdown="# Setup Required\n\nPlease add your Fingertip API key in the extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  async function handleSubmit(values: FormValues) {
    setIsLoading(true);

    try {
      const response = await client.v1.sites.create({
        name: values.name,
        description: values.description || null,
        slug: values.slug,
        status: "UNPUBLISHED",
        businessType: values.businessType || null,
        pages: [
          {
            slug: "index",
            name: values.name,
            description: values.description || null,
            pageTheme: {
              content: {},
              componentPageThemeId: null,
            },
          },
        ],
      });

      try {
        await open(`https://fingertip.com/sites/${response.site.slug}/pages`);
      } catch (openError) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Open Site",
          message: "Site was created but couldn't be opened in browser",
        });
      }
    } catch (err) {
      if (err instanceof Fingertip.APIError) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Create Site",
          message: err instanceof Error ? err.message : "Unknown error occurred",
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "Site Created",
          message: `Successfully created site: ${values.name}`,
        });

        throw err;
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Site" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextField id="name" title="Site Name" placeholder="My Awesome Site" info="The name of your site" />

      <Form.TextField
        id="slug"
        title="Site Slug"
        placeholder="my-awesome-site"
        info="URL-friendly version of the site name"
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="A brief description of your site"
        info="Optional description of your site"
      />

      <Form.TextField
        id="businessType"
        title="Business Type"
        placeholder="restaurant"
        info="Optional business category"
      />
    </Form>
  );
}
