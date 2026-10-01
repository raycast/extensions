import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";

type OnMark = (watchedAt: string) => void;

const OtherDateForm = ({ onMark }: { onMark: OnMark }) => {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Mark as Watched"
            icon={Icon.Checkmark}
            onSubmit={(values: { date: Date | null }) => {
              if (!values.date) {
                showToast({ title: "Pick a date", style: Toast.Style.Failure });
                return;
              }

              pop();
              onMark(values.date.toISOString());
            }}
          />
        </ActionPanel>
      }
    >
      <Form.DatePicker
        id="date"
        title="Watched on"
        type={Form.DatePicker.Type.DateTime}
        defaultValue={new Date()}
        max={new Date()}
      />
    </Form>
  );
};

/**
 * Trakt's "Track…" dates other than "Just now". Trakt only accepts `released` for episodes.
 * `onMark` receives `"released"`, `"unknown"` or a UTC ISO datetime, as `watched_at` takes them.
 */
export const MarkWatchedOnActions = ({
  onMark,
  allowReleaseDate,
  title = "Mark as Watched on…",
}: {
  onMark: OnMark;
  allowReleaseDate: boolean;
  title?: string;
}) => (
  <ActionPanel.Submenu title={title} icon={Icon.Calendar}>
    {allowReleaseDate && <Action title="Release Date" icon={Icon.Calendar} onAction={() => onMark("released")} />}
    <Action title="Unknown Date" icon={Icon.QuestionMark} onAction={() => onMark("unknown")} />
    <Action.Push title="Other Date…" icon={Icon.Calendar} target={<OtherDateForm onMark={onMark} />} />
  </ActionPanel.Submenu>
);
