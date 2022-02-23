import { URL } from "url";

import { Action, showToast, Toast } from "@raycast/api";

import { executeJxa } from "../utils";

const addToReadingList = async (url: string) =>
  executeJxa(`
const safari = Application("Safari");
safari.addReadingListItem("${url}")
`);

const AddToReadingListAction = () => {
  const handleSubmit = async (values: { url: string }) => {
    if (!values.url) {
      await showToast(Toast.Style.Failure, "URL is required");
      return;
    }

    try {
      const parsedUrl = new URL(values.url);
      await addToReadingList(parsedUrl.href);
      await showToast(Toast.Style.Success, "Added to Reading List");
    } catch (err) {
      await showToast(Toast.Style.Failure, "Invalid URL", "URL must start with http[s]://");
    }
  };

  return <Action.SubmitForm title="Add to Reading List" onSubmit={handleSubmit} />;
};

export default AddToReadingListAction;
