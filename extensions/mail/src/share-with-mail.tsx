import { Form, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { ComposeMessage } from "./components/compose";
import { maximumFileSize, getSize, formatFileSize } from "./utils/finder";
import { getFinderSelection } from "./utils/finder";

export default function ShareWithMail() {
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const selections = await getFinderSelection();
      if (selections.length === 0) {
        const options: Toast.Options = {
          title: "No Attachments Selected in Finder",
          message: "Select Attachments Here",
          style: Toast.Style.Failure,
        };
        await showToast(options);
      } else {
        setAttachments(selections);
        const size = await getSize(selections);
        const options: Toast.Options = {
          title: `Attachments Size Exceeds ${maximumFileSize.label}`,
          message: `Total Size is ${formatFileSize(size)}`,
          style: Toast.Style.Failure,
        };
        await showToast(options);
      }
      setIsLoading(false);
    })();
  }, []);

  return isLoading ? <Form isLoading={true} /> : <ComposeMessage attachments={attachments} />;
}
