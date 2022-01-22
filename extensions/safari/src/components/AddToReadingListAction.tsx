import { URL } from "url";

import { showToast, SubmitFormAction, ToastStyle } from "@raycast/api";

import { executeJxa } from "../utils";

const addToReadingList = async (url: string) =>
  executeJxa(`
const safari = Application("Safari");
safari.addReadingListItem("${url}")
`);

const AddToReadingListAction = () => {
  const handleSubmit = async (values: { url: string }) => {
    if (!values.url) {
      await showToast(ToastStyle.Failure, "URL is required");
      return;
    }

    try {
      const parsedUrl = new URL(values.url);
      await addToReadingList(parsedUrl.href);
      await showToast(ToastStyle.Success, "Added to Reading List");
    } catch (err) {
      await showToast(ToastStyle.Failure, "Invalid URL", "URL must start with http[s]://");
    }
  };

  return <SubmitFormAction title="Add to Reading List" onSubmit={handleSubmit} />;
};

export default AddToReadingListAction;
