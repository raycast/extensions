import {
  List,
  ActionPanel,
  Application,
  getApplications,
  Action,
  LocalStorage,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";

class MyApplication implements Application {
  name = "";
  path = "";
  add?: boolean = false;
  suggest?: boolean = false;

  bundleId?: string;
  constructor(name: string, path: string, bundleId?: string, add?: boolean, suggest?: boolean) {
    this.bundleId = bundleId;
    this.name = name;
    this.path = path;
    this.add = add;
    this.suggest = suggest;
  }
}

export default function ApplicationsList(props: { setToSurfBrowser: any }) {
  const setToSurfBrowser = props.setToSurfBrowser;
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [actionNums, setActionNums] = useState<number>(1);
  const [addApp, setAddApp] = useState<boolean>(false);

  const suggestApp = [
    "/Applications/Firefox.app",
    "/Applications/Google Chrome.app",
    "/Applications/Microsoft Edge.app",
    "/Applications/Safari.app",
  ];

  useEffect(() => {
    async function fetchApplications() {
      setAllApplications(await getApplications());
    }

    fetchApplications();
  }, []);

  useEffect(() => {
    async function fetchApplications() {
      const localStorage = await LocalStorage.allItems();
      const localApp = Object.values(localStorage);
      const myApps = [];
      for (let i = 0; i < allApplications.length; i++) {
        myApps[i] = new MyApplication(
          allApplications[i].name,
          allApplications[i].path,
          allApplications[i].bundleId,
          localApp.includes(allApplications[i].path),
          suggestApp.includes(allApplications[i].path)
        );
      }
      setActionNums(actionNums + 1);
      setApplications(myApps);
      setToSurfBrowser(actionNums);
    }

    fetchApplications();
  }, [allApplications, addApp]);

  return (
    <List isLoading={applications.length === 0} searchBarPlaceholder={"Search and Add"}>
      <List.Section title="Surf Browser">
        {applications.map((application) => {
          if (application.add) {
            return (
              <ApplicationsListItem
                key={application.bundleId}
                application={application}
                addApp={addApp}
                setAddApp={setAddApp}
              />
            );
          }
        })}
      </List.Section>
      <List.Section title="Suggest">
        {applications.map((application) => {
          if (!application.add && application.suggest) {
            return (
              <ApplicationsListItem
                key={application.bundleId}
                application={application}
                addApp={addApp}
                setAddApp={setAddApp}
              />
            );
          }
        })}
      </List.Section>
      <List.Section title="Application">
        {applications.map((application) => {
          if (!application.add && !application.suggest) {
            return (
              <ApplicationsListItem
                key={application.bundleId}
                application={application}
                addApp={addApp}
                setAddApp={setAddApp}
              />
            );
          }
        })}
      </List.Section>
    </List>
  );
}

function ApplicationsListItem(props: { application: MyApplication; addApp: boolean; setAddApp: any }) {
  const application = props.application;
  const addApp = props.addApp;
  const setAddApp = props.setAddApp;

  return (
    <List.Item
      key={application.bundleId}
      title={application.name}
      icon={{ fileIcon: application.path }}
      accessoryIcon={(function () {
        if (application.add) {
          return Icon.Star;
        } else {
          return "";
        }
      })()}
      actions={
        <ActionPanel>
          <Action
            title={(function () {
              if (application.add) {
                return "Remove " + application.name;
              } else {
                return "Add " + application.name;
              }
            })()}
            icon={(function () {
              if (application.add) {
                return Icon.Trash;
              } else {
                return Icon.Star;
              }
            })()}
            onAction={async () => {
              if (application.add) {
                await LocalStorage.removeItem(application.name);
                setAddApp(!addApp);
                await showToast(Toast.Style.Success, "Remove Success!");
              } else {
                await LocalStorage.setItem(application.name, application.path);
                setAddApp(!addApp);
                await showToast(Toast.Style.Success, "Add Success!");
              }
            }}
          />
          <Action
            title={"Remove All Browsers"}
            icon={Icon.Trash}
            onAction={async () => {
              await LocalStorage.clear();
              setAddApp(!addApp);
              await showToast(Toast.Style.Success, "Remove Success!");
            }}
          />
        </ActionPanel>
      }
    />
  );
}
