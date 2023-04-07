import { URL } from "url";

import { Action, showToast, Toast } from "@raycast/api";

import { executeJxa, safariAppIdentifier } from "../utils";

const addToReadingList = async (url: string) =>
  executeJxa(`
const safari = Application("${safariAppIdentifier}");
safari.addReadingListItem("${url}")
`);

const AddToReadingListAction = () => {
  const handleSubmit = async (values: { url: string }) => {
    if (!values.url) {
      await showToast({ style: Toast.Style.Failure, title: "URL is required" });
      return;
    }

    try {
      const parsedUrl = new URL(values.url);
      await addToReadingList(parsedUrl.href);
      await showToast({ style: Toast.Style.Success, title: "Added to Reading List" });
    } catch (err) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid URL", message: "URL must start with http[s]://" });
    }
  };

  return <Action.SubmitForm title="Add to Reading List" onSubmit={handleSubmit} />;
};

export default AddToReadingListAction;
