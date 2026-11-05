import { Action, Icon } from "@raycast/api";
import { DeviceList } from "./components/DeviceList";
import { QuickActions } from "./components/QuickActions";
import { ScreenPreview } from "./components/ScreenPreview";
import { ScreenTextView } from "./components/ScreenTextView";
import { TaskForm } from "./components/TaskForm";

export default function Command() {
  return (
    <DeviceList
      actions={(phone, _, enabled) => (
        <>
          {enabled && (
            <Action.Push
              title="Run Task"
              icon={Icon.Play}
              target={<TaskForm phoneId={phone.id} navigationTitle="Run iPhone Task" />}
            />
          )}
          <Action.Push
            title="View Screen"
            icon={Icon.Mobile}
            target={<ScreenPreview phone={phone} allowControl={enabled} />}
          />
          {enabled && (
            <>
              <Action.Push title="Read Screen Text" icon={Icon.Text} target={<ScreenTextView phone={phone} />} />
              <Action.Push title="Quick Actions" icon={Icon.Bolt} target={<QuickActions phone={phone} />} />
            </>
          )}
        </>
      )}
    />
  );
}
