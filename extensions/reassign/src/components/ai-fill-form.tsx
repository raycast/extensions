import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useRef, useState } from "react";
import { BlockDraft, blockDraft } from "../lib/ai-draft";
import { previewBlock } from "../lib/api";
import { failToast } from "../lib/feedback";
import { clockHM, todayISO } from "../lib/format";
import type { ActivityType, Area, Calendar } from "../lib/schedule-model";

export function AiFillForm(props: {
  initialText: string;
  areas: Area[];
  activityTypes: ActivityType[];
  // The writable calendars: a suggested home must be one of them.
  calendars: Calendar[];
  onFill: (draft: BlockDraft) => void;
}) {
  const { pop } = useNavigation();
  const [text, setText] = useState(props.initialText);
  const [draft, setDraft] = useState<BlockDraft | null>(null);
  const [notices, setNotices] = useState("");
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const busy = useRef(false);

  async function suggest() {
    if (busy.current) return;
    if (!text.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Describe a block first" });
      return;
    }
    busy.current = true;
    const request = generation.current;
    setLoading(true);
    setDraft(null);
    setNotices("");
    const toast = await showToast({ style: Toast.Style.Animated, title: "Drafting with Reassign AI…" });
    try {
      const result = await previewBlock(text.trim());
      if (generation.current !== request) {
        await toast.hide();
        return;
      }
      if (!result.ok) {
        failToast(toast, result);
        return;
      }
      setNotices(
        [
          ...(result.data.notices ?? []),
          ...(result.data.questions ?? []).map((q) =>
            typeof q === "string"
              ? q
              : typeof q === "object" && q && "question" in q
                ? String(q.question)
                : "Please clarify your description.",
          ),
        ].join("\n"),
      );
      const next = blockDraft(result.data);
      if (next.areaId && !props.areas.some((a) => a.id === next.areaId))
        throw new Error("The suggested area is unavailable. Refresh Add Block and try again.");
      if (next.activityTypeId && !props.activityTypes.some((a) => a.id === next.activityTypeId))
        throw new Error("The suggested activity is unavailable. Refresh Add Block and try again.");
      if (next.calendarId && !props.calendars.some((c) => c.id === next.calendarId))
        throw new Error("The suggested calendar is not one you can publish to. Pick the calendar in the form.");
      setDraft(next);
      toast.style = Toast.Style.Success;
      toast.title = "Suggestion ready — nothing saved";
    } catch (error) {
      if (generation.current === request) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not fill this block";
        toast.message = error instanceof Error ? error.message : "Try again or fill the form manually.";
      }
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  const area = props.areas.find((a) => a.id === draft?.areaId)?.name;
  const activity = props.activityTypes.find((a) => a.id === draft?.activityTypeId)?.name;
  const calendar = props.calendars.find((c) => c.id === draft?.calendarId)?.name;
  return (
    <Form
      navigationTitle="Fill with Reassign AI"
      isLoading={loading}
      actions={
        <ActionPanel>
          {draft && (
            <Action
              title="Use Suggested Block"
              icon={Icon.Check}
              onAction={() => {
                props.onFill(draft);
                pop();
              }}
            />
          )}
          <Action title={draft ? "Try Again" : "Suggest Block"} icon={Icon.Stars} onAction={suggest} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="description"
        title="Describe a block"
        placeholder="An hour of deep work tomorrow morning, before my meetings"
        value={text}
        onChange={(value) => {
          generation.current++;
          setText(value);
          setDraft(null);
          setNotices("");
        }}
      />
      <Form.Description text="Uses your Reassign account's AI and planning context. Suggestions fill the form; you review and save separately." />
      {draft && (
        <>
          <Form.Description title="Name" text={draft.name} />
          <Form.Description
            title="When"
            text={
              draft.start
                ? `${todayISO(draft.start)} at ${clockHM(draft.start)} · ${draft.duration}`
                : `Inbox${draft.duration ? ` · ${draft.duration}` : ""}`
            }
          />
          <Form.Description
            title="Details"
            text={[area, activity, calendar, draft.kind, draft.notes].filter(Boolean).join(" · ")}
          />
        </>
      )}
      {notices && <Form.Description title="From Reassign" text={notices} />}
    </Form>
  );
}
