import { Action, ActionPanel, Form, Toast, showToast, Clipboard, LaunchProps, Icon, useNavigation } from "@raycast/api";
import { FormValidation, useForm, useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import got from "got";
import { baseURL, characters, MIN_SLUG_SIZE, RAND_SLUG_SIZE, smcUrl } from "./Constants";
import useStoredRecents from "./hooks/useStoredRecents";
import flourite from "flourite";
import CodeView from "./components/CodeView";
import useParser from "./hooks/useParser";

type CodeChekResponse = {
  timestamp: number;
  size: number;
};

interface SMCFormValues {
  slug: string;
  content: string;
}

interface LaunchPropsType {
  slug: string;
}

export default function CreateCommand(props: LaunchProps<{ arguments: LaunchPropsType }>) {
  const { slug } = props.arguments;

  const [randomSlug, setRandomSlug] = useState<string>("");
  const [newSlug, setNewSlug] = useState<string>(slug || "");
  const [autoSlug, setAutoSlug] = useState<boolean>(!slug);

  const { addRecent } = useStoredRecents();
  const { push } = useNavigation();

  const { handleSubmit, itemProps, values, setValue, setValidationError } = useForm<SMCFormValues>({
    async onSubmit(values: SMCFormValues) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Sharing code",
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

        toast.style = Toast.Style.Success;
        toast.title = "Shared code!";
        toast.message = `Copied ${smcUrl}/${values.slug} to your clipboard`;

        const newStoredRecent = {
          slug: values.slug,
          content: values.content,
          date: new Date(),
          language: flourite(values.content).language,
        };
        addRecent(newStoredRecent);
        push(<CodeView code={{ code: values.content, parsedCode: parsedData }} slug={values.slug} isLoading={false} />);
      } catch (error) {
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

  const parsedData = useParser(values.content || "");

  const { data, isLoading } = useFetch<CodeChekResponse>(`${baseURL}/code_check.php?slug=${newSlug}`, {
    execute: newSlug !== "" && newSlug.length >= MIN_SLUG_SIZE,
  });

  useEffect(() => {
    let error = "";

    if (values.slug != randomSlug) setAutoSlug(false);

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

  return (
    <Form
      isLoading={isLoading}
      searchBarAccessory={<Form.LinkAccessory text="Help" target="https://sharemycode.fr/help" />}
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
        placeholder="Enter the text you want to share here"
        {...itemProps.content}
      />
    </Form>
  );
}
