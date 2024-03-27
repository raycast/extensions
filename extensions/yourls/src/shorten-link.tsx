import { Action, ActionPanel, Form, Clipboard, showHUD, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { isValidUrl } from "./helper";
import { createShortUrl } from "./api";
import { sanitizeUrl } from "@braintree/sanitize-url";

type TValues = {
  url: string;
  title: string;
  keyword: string;
};

export default function ShortLink() {
  const [urlError, setUrlError] = useState("");
  const [keywordError, setKeywordError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [keywordValue, setKeywordValue] = useState("");

  const handleSubmit = async (values: TValues) => {
    const toast = await showToast({
      title: "Creating short URL...",
      style: Toast.Style.Animated,
    });

    try {
      const res = await createShortUrl({
        url: sanitizeUrl(values.url),
        title: values.title,
        keyword: values.keyword,
      });

      const shortUrl = res.shorturl;

      await Clipboard.copy(shortUrl);

      toast.style = Toast.Style.Success;
      toast.title = "Short URL created";

      await showHUD(`Copied to clipboard: ${shortUrl}`);

      popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create short URL";

      if (error instanceof Error) {
        toast.message = error.message;
      }
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Shorten"
            onSubmit={async (values: TValues) => {
              await handleSubmit(values);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com"
        error={urlError}
        onChange={() => {
          if (urlError && urlError.length > 0) {
            setUrlError("");
          }
        }}
        onBlur={(ev) => {
          const value = ev.target.value;

          if (value && value.length > 0) {
            if (!isValidUrl(value)) {
              setUrlError("Invalid URL");
            } else {
              setUrlError("");
            }
          } else {
            setUrlError("URL is required");
          }
        }}
      />
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Example"
        error={titleError}
        onChange={() => {
          if (titleError && titleError.length > 0) {
            setTitleError("");
          }
        }}
        onBlur={(ev) => {
          const value = ev.target.value;

          if (!value) {
            setTitleError("Title is required");
          }
        }}
      />
      <Form.TextField
        id="keyword"
        title="Keyword"
        placeholder="example-keyword"
        error={keywordError}
        value={keywordValue}
        onChange={(val) => {
          if (keywordError && keywordError.length > 0) {
            setKeywordError("");
          }
          setKeywordValue(val.toLowerCase());
        }}
        info="Keyword for custom short URL"
        onBlur={(ev) => {
          const value = ev.target.value;

          if (!value) {
            setKeywordError("Keyword is required");
          }

          const isContainsSpace = value?.includes(" ");

          if (isContainsSpace) {
            setKeywordError("Should not contain space");
          }
        }}
      />
    </Form>
  );
}
