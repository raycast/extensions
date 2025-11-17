import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { FormData } from "formdata-node";
import { fileFromPath } from "formdata-node/file-from-path";
import { PostDocument } from "../models/docPost.model";

const { paperlessURL }: Preferences = getPreferenceValues();
const { apiToken }: Preferences = getPreferenceValues();

export const postDocument = async (value: PostDocument, filePath: string): Promise<void> => {
  const formData = new FormData();

  if (value.correspondent && value.correspondent !== "-1") {
    // Don't set Automatic correspondent
    formData.append("correspondent", value.correspondent);
  }
  if (value.type && value.type !== "-1") {
    // Don't set Automatic type
    formData.append("document_type", value.type);
  }
  if (value.title) {
    // Allow empty title
    formData.append("title", value.title);
  }
  if (value.created) {
    // Allow empty creation date
    formData.append("created", value.created);
  }

  // Foreach needed, Paperless-ngx doc says "Specify this multiple times to have multiple tags added to the document"
  value.tags.forEach((tag) => {
    // Allow empty tags
    formData.append("tags", tag);
  });

  formData.append("document", await fileFromPath(filePath));

  await fetch(`${paperlessURL}/api/documents/post_document/`, {
    method: "POST",
    body: formData, // as any is hack for TS type checking
    headers: {
      Authorization: `Token ${apiToken}`,
    },
  })
    .then()
    .catch((err) => showToast(Toast.Style.Failure, `Could not fetch correspondents ${err}`));
};
