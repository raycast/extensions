import { ActionPanel, Action, Form, useNavigation, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { Highlight, updateHighlight } from "./utils/storage";

interface EditHighlightProps {
  highlight: Highlight;
  onEdit: () => void;
}

export default function EditHighlight({ highlight, onEdit }: EditHighlightProps) {
  const { pop } = useNavigation();
  const [text, setText] = useState(highlight.text || "");
  const [startTime, setStartTime] = useState(highlight.startTime.toString());
  const [endTime, setEndTime] = useState(highlight.endTime.toString());

  const handleSubmit = async () => {
    const start = parseFloat(startTime);
    const end = parseFloat(endTime);

    if (isNaN(start) || isNaN(end)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Time",
        message: "Start and End time must be numbers",
      });
      return;
    }

    if (start < 0 || end < start) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Range",
        message: "End time must be greater than start time",
      });
      return;
    }

    try {
      await updateHighlight(highlight.id, {
        text,
        startTime: start,
        endTime: end,
      });

      await showToast({ style: Toast.Style.Success, title: "Highlight Updated" });
      onEdit();
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Update Failed", message: String(error) });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Editing Highlight for: ${highlight.videoTitle}`} />
      <Form.TextArea id="text" title="Note" placeholder="Add a note..." value={text} onChange={setText} />
      <Form.TextField id="startTime" title="Start Time (s)" value={startTime} onChange={setStartTime} />
      <Form.TextField id="endTime" title="End Time (s)" value={endTime} onChange={setEndTime} />
    </Form>
  );
}
