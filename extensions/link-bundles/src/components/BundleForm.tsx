import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { useState, Fragment } from "react";
import { Bundle } from "../types";
import { getChromeProfiles } from "../utils/chrome";

interface BundleFormProps {
  bundle?: Bundle;
  onSubmit: (bundle: Bundle) => boolean;
}

export function BundleForm({ bundle, onSubmit }: BundleFormProps) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(bundle?.title || "");
  const [titleError, setTitleError] = useState<string | undefined>();
  const [description, setDescription] = useState(bundle?.description || "");
  const [chromeProfile, setChromeProfile] = useState(bundle?.chromeProfile || "Default");
  const [linkInputs, setLinkInputs] = useState<{ url: string; error?: string }[]>(
    bundle?.links.length ? bundle.links.map((url) => ({ url })) : [{ url: "" }],
  );

  const validateTitle = (value: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      setTitleError("Title is required");
      return false;
    }
    setTitleError(undefined);
    return true;
  };

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) return true; // Empty URLs are allowed during input
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateLinks = (links: typeof linkInputs): boolean => {
    const validLinks = links.filter((link) => link.url.trim() !== "");
    if (validLinks.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "At least one URL is required",
      });
      return false;
    }

    const newLinkInputs = [...links];
    let isValid = true;

    validLinks.forEach((link, index) => {
      if (!validateUrl(link.url)) {
        newLinkInputs[index] = {
          ...link,
          error: "Please enter a valid URL",
        };
        isValid = false;
      } else {
        newLinkInputs[index] = {
          ...link,
          error: undefined,
        };
      }
    });

    setLinkInputs(newLinkInputs);
    return isValid;
  };

  const updateLinkInput = (index: number, value: string) => {
    const newLinkInputs = [...linkInputs];
    const isValid = validateUrl(value);

    newLinkInputs[index] = {
      url: value,
      error: value.trim() !== "" && !isValid ? "Please enter a valid URL" : undefined,
    };

    if (index === linkInputs.length - 1 && value.trim() !== "") {
      newLinkInputs.push({ url: "" });
    }

    setLinkInputs(newLinkInputs);
  };

  const handleSubmit = (values: { title: string; description: string }) => {
    const isTitleValid = validateTitle(values.title);
    const areLinksValid = validateLinks(linkInputs);

    if (!isTitleValid || !areLinksValid) {
      return;
    }

    const nonEmptyLinks = linkInputs.filter((link) => link.url.trim() !== "").map((link) => link.url.trim());

    const success = onSubmit({
      title: values.title.trim(),
      description: values.description.trim(),
      links: nonEmptyLinks,
      chromeProfile,
    });

    if (success) {
      pop();
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Bundle" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter bundle title"
        value={title}
        onChange={(value) => {
          setTitle(value);
          validateTitle(value);
        }}
        error={titleError}
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Enter bundle description"
        value={description}
        onChange={setDescription}
      />

      <Form.Dropdown id="chromeProfile" title="Chrome Profile" value={chromeProfile} onChange={setChromeProfile}>
        {getChromeProfiles().map((profile) => (
          <Form.Dropdown.Item key={profile.directory} value={profile.directory} title={profile.name} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      {linkInputs.map((link, index) => (
        <Fragment key={`link-group-${index}`}>
          {index > 0 && <Form.Separator />}
          <Form.TextField
            id={`link-url-${index}`}
            title="URL"
            placeholder="Enter link URL"
            value={link.url}
            onChange={(value) => updateLinkInput(index, value)}
            error={link.error}
          />
        </Fragment>
      ))}
    </Form>
  );
}
