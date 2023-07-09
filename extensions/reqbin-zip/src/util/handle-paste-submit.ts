import fetch from "node-fetch";

import { Toast, showToast, Clipboard, open } from "@raycast/api";
import { url } from "../constants/url";

type Values = {
  pasteContents: string;
  isEditable: boolean;
  timeoutDate: Date;
};

type Response = Partial<{
  pasteObjectId: string;
}>;

function createBody(values: Values) {
  if (!values.timeoutDate) {
    return {
      pasteContents: values.pasteContents,
      isEditable: values.isEditable,
    };
  }
  return values;
}

export async function handlePasteSubmit(values: Values) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Creating Paste Bin...",
  });

  const cleanedValues = createBody(values);

  const response = await fetch(`${url}/api/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cleanedValues),
  });

  if (!response.ok) {
    toast.style = Toast.Style.Failure;
    toast.message = "Failed to create reqbin";
    return;
  }

  const body = (await response.json()) as Response;

  if (!body.pasteObjectId) {
    toast.style = Toast.Style.Failure;
    toast.message = "Failed to create reqbin";
    return;
  }

  const pasteBinUrl = `${url}/${body.pasteObjectId}`;
  Clipboard.copy(pasteBinUrl);
  open(pasteBinUrl);

  showToast({ title: "Successfully created reqbin", message: "The link is attached to your clipboard" });
}
