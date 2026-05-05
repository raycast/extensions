import { Action, ActionPanel, Form, showToast, Toast, launchCommand, LaunchType, Icon } from "@raycast/api";
import { useEffect } from "react";
import { useForm } from "@raycast/utils";
import { createLink, getShortcodes } from "./services/api";
import { urlValidation, slugValidation } from "./services/validation";
import { setUsedSlugs } from "./services/validation/slug/cache";
import { generateRandomSlug } from "./utils/random";

interface FormValues {
  url: string;
  slug: string;
  description?: string;
}

export default function Command() {
  // Fetch and cache all used slugs when the Shorten Link command loads
  useEffect(() => {
    const initializeSlugCache = async () => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Initializing slug cache...",
      });

      try {
        const slugs = await getShortcodes();
        setUsedSlugs(slugs);

        toast.style = Toast.Style.Success;
        toast.title = "Slug cache initialized";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to initialize slug cache";
        toast.message = error instanceof Error ? error.message : "Unknown error occurred";
      }
    };

    initializeSlugCache();
  }, []);

  const { handleSubmit, itemProps, setValue, setValidationError } = useForm<FormValues>({
    validation: {
      url: (value) => {
        const result = urlValidation.format(value);
        if (!result.isValid) return result.message;
      },
      slug: (value) => {
        const result = slugValidation.format(value);
        if (!result.isValid) return result.message;
      },
    },
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating short link...",
      });

      try {
        const response = await createLink({
          url: values.url,
          short_code: values.slug,
          description: values.description || null,
        });

        toast.style = Toast.Style.Success;
        toast.title = "Short link created";

        // Launch the list-links command
        await launchCommand({
          name: "list-links",
          type: LaunchType.UserInitiated,
          context: {
            searchText: response.short_code,
          },
        });
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create short link";
        toast.message = error instanceof Error ? error.message : "Unknown error occurred";
      }
    },
  });

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Short Link" icon={Icon.Plus} onSubmit={handleSubmit} />
          <Action
            title="Generate Random Slug"
            icon={Icon.Wand}
            onAction={() => {
              const newSlug = generateRandomSlug();
              setValue("slug", newSlug);
              setValidationError("slug", undefined);
            }}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.url} title="URL" placeholder="https://a-very-long-url.com" autoFocus />
      <Form.TextField
        {...itemProps.slug}
        title="Slug"
        placeholder="custom-slug or Cmd+G to generate random slug"
        info="Cmd+G to generate random slug"
      />
      <Form.TextField {...itemProps.description} title="Description" placeholder="Optional description for this link" />
    </Form>
  );
}
