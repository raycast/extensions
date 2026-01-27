import { Form, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { ComposeMessage } from "./components";
import { OutgoingMessageForm } from "./types";
import { formatFileSize, getFinderSelection, getSize, maximumFileSize } from "./utils/finder";

export type ShareWithMailProps = {
  draftValues?: OutgoingMessageForm;
};

export default function ShareWithMail(props: ShareWithMailProps) {
  const { draftValues } = props;

  const { data: attachments, isLoading: isLoadingAttachments } = useCachedPromise(getFinderSelection, [], {
    onData: async (selections) => {
      if (selections.length === 0) {
        const options: Toast.Options = {
          title: "No attachments selected in Finder",
          message: "Select attachments",
          style: Toast.Style.Failure,
        };

        await showToast(options);
      } else {
        const selectionsSize = await getSize(selections);
        if (maximumFileSize.value < selectionsSize) {
          const options: Toast.Options = {
            title: `Attachments size exceeds ${maximumFileSize.label}`,
            message: `Total size is ${formatFileSize(selectionsSize)}`,
            style: Toast.Style.Failure,
          };

          await showToast(options);
        }
      }
    },
  });

  return isLoadingAttachments ? (
    <Form isLoading={true} />
  ) : (
    <ComposeMessage draftValues={draftValues} attachments={attachments} />
  );
}
