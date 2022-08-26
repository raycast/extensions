import { Form, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { ComposeMessage } from "./components/compose";
import { maximumFileSize, getSize } from "./utils/finder";
import { getFinderSelection } from "./utils/finder";

export default function ShareWithMail() {
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getSelectedAttachments = async () => {
    let totalSize = 0;
    const validSelections: string[] = [];
    const invalidSelections: string[] = [];
    const selections = await getFinderSelection();
    for (const selection of selections) {
      const size = await getSize([selection]);
      if (size < maximumFileSize.value && (totalSize += size) < maximumFileSize.value) {
        validSelections.push(selection);
      } else {
        invalidSelections.push(selection);
      }
    }
    setAttachments(selections);
    setIsLoading(false);
    if (invalidSelections.length > 0) {
      const options: Toast.Options = {
        title: `Attachments Size Exceeds ${maximumFileSize.label}`,
        message:
          invalidSelections.length > 3
            ? `${invalidSelections.length} attachments are too large.`
            : invalidSelections.length == 1
            ? `${invalidSelections[0]} is too large.`
            : `The selections ${invalidSelections.join(", ")} are too large.`,
        style: Toast.Style.Failure,
      };
      await showToast(options);
    } else if (validSelections.length === 0) {
      const options: Toast.Options = {
        title: "No Attachments Selected in Finder",
        style: Toast.Style.Failure,
      };
      await showToast(options);
    }
  };

  useEffect(() => {
    getSelectedAttachments();
  }, []);

  return isLoading ? <Form isLoading={isLoading}></Form> : <ComposeMessage attachments={attachments} />;
}
