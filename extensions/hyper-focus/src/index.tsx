import fetch from "node-fetch";
import { homedir } from "os";
import { join } from "path";
import assert from "node:assert";
import { ActionPanel, List, Action, popToRoot, showHUD, Icon, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

export interface FocusStatus {
  pause: FocusScheduleStatus;
  override: FocusScheduleStatus;
  schedule: FocusScheduleStatus;
}

export interface FocusScheduleStatus {
  name?: string;
  until?: number;
}

export interface Schedule {
  start?: number;
  end?: number;
  name: string;
  schedule_only?: boolean;
  block_hosts: string[];
  block_urls: string[];
  block_apps: string[];
  start_script?: string;
  description?: string;
}

const SERVER_PORT = 9029;

function baseURL() {
  return `http://localhost:${SERVER_PORT}`;
}

function configPath() {
  return join(homedir(), ".config/focus/");
}

function timestampToHoursMinutes(timestamp: number): string {
  const until = new Date(timestamp * 1000);
  return until.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function minutesFromNowToTimestamp(minutes: number): number {
  return Math.round(new Date().getTime() / 1000) + minutes * 60;
}

function formatMinutes(minutes: number) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    if (hours == 1) {
      return "1 hour";
    } else {
      return `${hours} hours`;
    }
  } else {
    if (minutes == 1) {
      return "1 minute";
    } else {
      return minutes + " minutes";
    }
  }
}

function SetOverride(props: { [name: string]: string }) {
  async function submitOverride(overrideName: string, minutes: number) {
    const result = await fetch(`${baseURL()}/override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: overrideName,
        until: minutesFromNowToTimestamp(minutes),
      }),
    });

    const jsonResult = await result.json();

    showHUD(`Using schedule '${overrideName}' for ${minutes} minutes`);
    popToRoot({ clearSearchBar: true });
  }

  const overrideOptions = [15, 30, 45, 60, 120, 180].map((minutes) => {
    return (
      <List.Item
        key={minutes}
        title={formatMinutes(minutes)}
        actions={
          <ActionPanel>
            <Action onAction={() => submitOverride(props.name, minutes)} title="Override" />
          </ActionPanel>
        }
      />
    );
  });

  return <List>{overrideOptions}</List>;
}

function ChooseOverride() {
  const { data, isLoading } = useFetch<Schedule[]>(`${baseURL()}/schedules`);

  const configurationItems = (schedules: Schedule[] | undefined) => {
    assert(schedules !== undefined);

    return schedules
      .filter((schedule) => schedule.schedule_only !== true)
      .map((schedule) => {
        return (
          <List.Item
            key={schedule.name}
            title={schedule.name}
            subtitle={schedule.description}
            actions={
              <ActionPanel>
                <Action.Push title="Set Override" target={<SetOverride name={schedule.name} />} />
              </ActionPanel>
            }
          />
        );
      });
  };

  return <List isLoading={isLoading}>{!isLoading && configurationItems(data)}</List>;
}

function Pause() {
  async function submitPause(minutes: number) {
    const result = await fetch(`${baseURL()}/pause`, {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        until: minutesFromNowToTimestamp(minutes),
      }),
      method: "POST",
    });

    const parsedJson = await result.json();

    if (parsedJson.status == "error") {
      console.error("Error pausing Focus: ", parsedJson.message);
    }

    showHUD("Focus schedule paused for " + minutes + " minutes");
    popToRoot({ clearSearchBar: true });
  }

  // intentionally limit available pause amounts
  const pauseOptions = [1, 5, 10, 15].map((minutes) => {
    return (
      <List.Item
        key={minutes}
        title={formatMinutes(minutes)}
        actions={
          <ActionPanel>
            <Action onAction={() => submitPause(minutes)} title="Pause" />
          </ActionPanel>
        }
      />
    );
  });

  return <List>{pauseOptions}</List>;
}

export default function Command() {
  const { data, isLoading, error } = useFetch<FocusStatus>(baseURL() + "/status");

  async function reloadConfiguration() {
    const result = await fetch(`${baseURL()}/reload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const jsonResult = await result.json();

    showHUD("Reloaded configuration");
    popToRoot({ clearSearchBar: true });
  }

  const renderActions = () => {
    const hasScheduledFocus = data?.schedule?.until !== null;
    const hasOverrideEnabled = data?.override?.until !== null;
    const isPaused = data?.pause?.until !== null;

    let summaryItem: React.ReactNode;

    // TODO unclear to me if List.Item is the best way to display general application status. Would be nice if there was
    //      a specific UI component for this. It makes the UX a bit strange.
    if (isPaused) {
      assert(data?.pause?.until !== undefined);

      summaryItem = (
        <List.Item
          icon={Icon.PauseFilled}
          title="Focus is paused"
          subtitle={`paused until ${timestampToHoursMinutes(data.pause.until)}`}
        />
      );
    } else if (hasOverrideEnabled) {
      assert(data?.override?.until !== undefined);

      summaryItem = (
        <List.Item
          icon={Icon.Wand}
          title={`Focusing using '${data?.override?.name}'`}
          subtitle={`overriding until ${timestampToHoursMinutes(data.override.until)}`}
        />
      );
    } else if (hasScheduledFocus) {
      assert(data?.schedule?.until !== undefined);

      summaryItem = (
        <List.Item
          icon={Icon.Calendar}
          title={`Planned focus using '${data?.schedule?.name}'`}
          subtitle={`scheduled until ${timestampToHoursMinutes(data.schedule.until)}`}
        />
      );
    } else {
      summaryItem = <List.Item icon={Icon.Info} title="No focus schedule is active" />;
    }

    const isAbleToPause = hasScheduledFocus || hasOverrideEnabled;

    return (
      <>
        {summaryItem}
        {isAbleToPause && (
          <List.Item
            icon={Icon.Pause}
            title="Pause"
            subtitle="pause focus session"
            actions={
              <ActionPanel>
                <Action.Push title="Show Options" target={<Pause />} />
              </ActionPanel>
            }
          />
        )}
      </>
    );
  };

  if (!isLoading && error) {
    showToast(Toast.Style.Failure, "Error", "Unable to connect to Hyper Focus");
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && error && (
        <List.EmptyView
          icon="no-view.png"
          title="Error"
          description="Unable to connect to Hyper Focus
Press ↵ to open the Hyper Focus website"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Hyper Focus Website" url="https://github.com/iloveitaly/hyper-focus" />
            </ActionPanel>
          }
        />
      )}
      {!isLoading && !error && (
        <>
          {renderActions()}
          {/* TODO override should really go above pause */}
          <List.Item
            icon={Icon.Pencil}
            title="Override"
            subtitle="schedule a temporary override"
            actions={
              <ActionPanel>
                <Action.Push title="Schedule Override" target={<ChooseOverride />} />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.SaveDocument}
            title="Configure"
            subtitle="configure focus schedules"
            actions={
              <ActionPanel>
                <Action.ShowInFinder title="Open Configuration" path={configPath()} />
                <Action title="Reload configuration" onAction={reloadConfiguration} />
              </ActionPanel>
            }
          />
        </>
      )}
    </List>
  );
}
