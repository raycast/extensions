import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  Clipboard,
  LaunchProps,
  Icon,
  open,
  popToRoot,
  getPreferenceValues,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { FormValidation, useForm, useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import got from "got";
import { baseURL, characters, MIN_SLUG_SIZE, RAND_SLUG_SIZE, smcUrl } from "./Constants";
import useStoredRecents from "./hooks/useStoredRecents";
import flourite, { DetectedLanguage } from "flourite";
import { SMCFormValues, CodeCheckResponse } from "./types";

interface LaunchPropsType {
  slug: string;
}

export default function CreateCommand(props: LaunchProps<{ arguments: LaunchPropsType }>) {
  const { slug } = props.arguments;
  const preferences = getPreferenceValues();

  const [randomSlug, setRandomSlug] = useState<string>("");
  const [newSlug, setNewSlug] = useState<string>(slug || "");
  const [autoSlug, setAutoSlug] = useState<boolean>(!slug);

  const [detectedLanguage, setDetectedLanguage] = useState<DetectedLanguage>();

  const { addRecent } = useStoredRecents();

  const { handleSubmit, itemProps, values, setValue, setValidationError } = useForm<SMCFormValues>({
    async onSubmit(values: SMCFormValues) {
      setNewSlug(values.slug);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Sharing code...",
      });
      const formData = new URLSearchParams();
      formData.append("slug", values.slug);
      formData.append("code", values.content);

      try {
        await got.post(`${baseURL}/code_update.php`, {
          body: formData.toString(),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });

        await Clipboard.copy(smcUrl + "/" + values.slug);

        const newStoredRecent = {
          slug: values.slug,
          content: values.content,
          date: new Date(),
          language: flourite(values.content).language,
        };
        addRecent(newStoredRecent);

        toast.style = Toast.Style.Success;
        toast.title = "Shared succesfully!";
        toast.message = `Link copied to your clipboard.`;

        const actions = {
          view: {
            title: "View the Shared Code",
            onAction: () => {
              launchCommand({ name: "get", type: LaunchType.UserInitiated, arguments: { slug: values.slug } });
            },
          },
          open: {
            title: "Open in Browser",
            onAction: () => {
              open(smcUrl + "/" + values.slug);
            },
          },
        };

        if (preferences.openAfterCreation) {
          toast.primaryAction = actions.open;
          launchCommand({ name: "get", type: LaunchType.UserInitiated, arguments: { slug: values.slug } });
        } else {
          toast.primaryAction = actions.view;
          toast.secondaryAction = actions.open;
          popToRoot();
        }
      } catch (error) {
        console.error(error);
        toast.style = Toast.Style.Failure;
        toast.title = "Failed sharing code";
        toast.message = "There seems to be a problem with the server. Please try again later.";
      }
    },
    validation: {
      slug: FormValidation.Required,
      content: FormValidation.Required,
    },
  });

  const { data, isLoading } = useFetch<CodeCheckResponse>(`${baseURL}/code_check.php?slug=${newSlug}`, {
    execute: newSlug !== "" && newSlug.length >= MIN_SLUG_SIZE,
  });

  useEffect(() => {
    let error = "";

    if (values.slug != randomSlug) setAutoSlug(false);

    if (autoSlug && values.slug && data?.size === 0) {
      createRandomSlug();
    }

    if (values.slug && !/^[a-zA-Z0-9_-]*$/.test(values.slug)) {
      error = "Slug can only contain letters, numbers, - and _";
    } else if (values.slug && values.slug.length < MIN_SLUG_SIZE) {
      error = "Slug must be at least 3 characters long";
    } else if (newSlug == values.slug && data && data.size !== 0) {
      error = "Slug is already taken";
    }

    setValidationError("slug", error);
  }, [data, values.slug]);

  const createRandomSlug = () => {
    let slug = "";
    for (let i = 0; i < RAND_SLUG_SIZE; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      slug += characters[randomIndex];
    }
    return slug;
  };

  useEffect(() => {
    if (autoSlug) {
      const newRandomSlug = createRandomSlug();
      setRandomSlug(newRandomSlug);
      setNewSlug(newRandomSlug);
      setValue("slug", newRandomSlug);
    }
  }, [autoSlug]);

  useEffect(() => {
    if (slug) {
      setValue("slug", slug);
    } else {
      setAutoSlug(true);
    }
  }, [slug]);

  useEffect(() => {
    if (values.content) {
      const flouriteDetect = flourite(values.content);
      setDetectedLanguage(flouriteDetect);
    }
  }, [values.content]);

  return (
    <Form
      isLoading={isLoading}
      searchBarAccessory={<Form.LinkAccessory text="Help" target={smcUrl + "/help"} />}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} icon={Icon.Upload} />
        </ActionPanel>
      }
    >
      <Form.Checkbox
        id="auto-slug"
        title="Auto-Slug"
        label="Generate a random slug"
        value={autoSlug}
        onChange={setAutoSlug}
      />
      <Form.TextField
        title="Slug"
        placeholder="theSlugYouWant"
        info="The slug is the part of the URL that comes after sharemycode.fr/"
        {...itemProps.slug}
        onBlur={() => {
          setNewSlug(values.slug);
        }}
      />
      <Form.TextArea
        title="Content"
        autoFocus
        enableMarkdown
        placeholder="Enter the text you want to share here"
        {...itemProps.content}
      />
      {detectedLanguage && detectedLanguage.language != "Unknown" && (
        <Form.Description title="Detected language" text={detectedLanguage?.language || "Unknown"} />
      )}
    </Form>
  );
}
