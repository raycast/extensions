import { List, LocalStorage, ActionPanel, Action, Icon, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import SequenceForm from "./components/SequenceForm";
import { Application, Sequence } from "./types";
import { runShortcutSequence } from "./utils";

export default function Command() {
  const sequenceName = "";
  const [sequences, setSequences] = useState<Sequence[]>();
  const [apps, setApps] = useState<Application[]>();
  const [currApp, setCurrApp] = useState<Application>();

  const updateCurrApp = (value: string) => {
    if (apps) {
      const application = apps.find((el) => el.name === value);
      if (application) {
        setCurrApp(application);
        setSequences(application.sequences);
      }
    }
  };

  const setState = (apps: Application[], app?: Application) => {
    setApps(apps);
    if (app) {
      setCurrApp(app);
      setSequences(app.sequences);
    }
  };

  useEffect(() => {
    const init = async () => {
      const existingApps = await LocalStorage.allItems();
      if (existingApps) {
        const applications: Application[] = [];
        for (const key in existingApps) {
          applications.push(JSON.parse(existingApps[key]));
        }

        setApps(applications);
      } else {
        setApps([]);
      }
    };

    init();
  }, []);

  if (sequenceName.length != 0) {
    let didRunSequence: Sequence | undefined = undefined;
    if (sequences) {
      for (let index = 0; index < sequences.length; index++) {
        const sequence = sequences[index];
        if (sequence.name == sequenceName) {
          Promise.resolve(runShortcutSequence(sequence));
          didRunSequence = sequence;
          break;
        }
      }
    }

    if (didRunSequence) {
      return null;
    }
  }

  const listItems = sequences?.map((sequence) => (
    <List.Item
      key={sequence.name}
      title={sequence.name}
      icon={sequence.icon}
      subtitle={sequence.description}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="General">
            <Action
              title="Run Shortcut Sequence"
              icon={Icon.ArrowRightCircle}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => {
                Promise.resolve(runShortcutSequence(sequence));
              }}
            />
            <Action.CopyToClipboard
              title="Copy JSON Representation"
              content={JSON.stringify(sequence)}
              shortcut={{ modifiers: ["cmd"], key: "j" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Sequence Controls">
            <Action.CreateQuicklink
              quicklink={{
                name: sequence.name,
                link: `raycast://extensions/HelloImSteven/keyboard-shortcut-sequences/run-shortcut-sequence?arguments=%7B%22sequenceName%22%3A%22${encodeURI(
                  sequence.name
                ).replaceAll("&", "%26")}%22%7D`,
              }}
            />
            <Action.Push
              title="Edit Sequence"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={<SequenceForm sequence={sequence} setState={setState} />}
            />
            <Action
              title="Delete Sequence"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={async () => {
                if (
                  await confirmAlert({
                    title: "Delete Sequence",
                    message: "Are you sure?",
                    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                  })
                ) {
                  const newSequences = sequences.filter((seq) => seq.name != sequence.name);
                  setSequences(newSequences);
                  await LocalStorage.removeItem(sequence.name);
                }
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Application Controls">
            <Action
              title="Delete Application"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
              onAction={async () => {
                if (
                  await confirmAlert({
                    title: "Delete Application",
                    message: "Are you sure?",
                    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                  })
                ) {
                  const newApps = apps?.filter((el) => el.name !== currApp?.name);
                  setApps(newApps);
                  if (currApp) {
                    await LocalStorage.removeItem(currApp.name);
                  }

                  if (apps?.length === 0) {
                    setSequences([]);
                  }
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  ));

  const appList = apps?.map((app: Application) => {
    return <List.Dropdown.Item title={app.name} value={app.name} key={app.name} />;
  });

  return (
    <List
      searchBarPlaceholder="Search shortcut sequences..."
      searchText={sequenceName ? sequenceName : undefined}
      searchBarAccessory={
        <List.Dropdown tooltip="Applications" value={currApp ? currApp.name : undefined} onChange={updateCurrApp}>
          {appList}
        </List.Dropdown>
      }
      isLoading={apps === undefined}
    >
      <List.EmptyView title="No Shortcut Sequences" icon={{ source: "no-list.png" }} />
      {listItems}
    </List>
  );
}
