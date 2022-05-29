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
import { SurfApplication } from "./utils";
import { SUGGEST_APP_SUPPORT_TYPE } from "./constants";
import { ItemType } from "./input";

export default function ApplicationsList(props: { setSurfBrowsers: any }) {
  const _setSurfBrowsers = props.setSurfBrowsers;
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [surfBrowsers, setSurfBrowsers] = useState<SurfApplication[]>([]);
  const [allBrowsers, setAllBrowsers] = useState<SurfApplication[]>([]);

  useEffect(() => {
    async function fetchApplications() {
      setAllApplications(await getApplications());
      const localBrowsers = await LocalStorage.getItem<string>("boards");
      let _browsers = [];
      if (typeof localBrowsers == "string") {
        _browsers = JSON.parse(localBrowsers);
      }
      setSurfBrowsers(_browsers);
    }

    fetchApplications().then();
  }, []);

  useEffect(() => {
    async function fetchApplications() {
      const localBrowsers = await LocalStorage.getItem<string>("boards");
      let _browsers = [];
      if (typeof localBrowsers == "string") {
        _browsers = JSON.parse(localBrowsers);
      }
      const _allBrowsers = [];
      for (let i = 0; i < allApplications.length; i++) {
        const include = [...SUGGEST_APP_SUPPORT_TYPE.keys()].includes(allApplications[i].path);
        _allBrowsers[i] = new SurfApplication(
          allApplications[i].name,
          allApplications[i].path,
          _browsers.some((value: SurfApplication) => {
            return value.path == allApplications[i].path;
          }),
          include,
          1,
          1,
          1,
          include ? (SUGGEST_APP_SUPPORT_TYPE.get(allApplications[i].path) as ItemType[]) : [],
          allApplications[i].bundleId
        );
      }
      setAllBrowsers(_allBrowsers);
      _setSurfBrowsers(surfBrowsers);
    }

    fetchApplications().then();
  }, [surfBrowsers]);

  return (
    <List
      isLoading={allBrowsers.length === 0}
      searchBarPlaceholder={"Search browser, email client..."}
      navigationTitle={"More Boards"}
    >
      <List.Section title="SurfBoard">
        {allBrowsers.map((application) => {
          if (application.add) {
            return (
              <ApplicationsListItem
                key={application.bundleId}
                browsers={[...surfBrowsers]}
                application={application}
                setSurfBrowser={setSurfBrowsers}
              />
            );
          }
        })}
      </List.Section>
      <List.Section title="Suggest">
        {allBrowsers.map((application) => {
          if (!application.add && application.suggest) {
            return (
              <ApplicationsListItem
                key={application.bundleId}
                browsers={[...surfBrowsers]}
                application={application}
                setSurfBrowser={setSurfBrowsers}
              />
            );
          }
        })}
      </List.Section>
      <List.Section title="Application">
        {allBrowsers.map((application) => {
          if (!application.add && !application.suggest) {
            return (
              <ApplicationsListItem
                key={application.bundleId}
                browsers={[...surfBrowsers]}
                application={application}
                setSurfBrowser={setSurfBrowsers}
              />
            );
          }
        })}
      </List.Section>
    </List>
  );
}

function ApplicationsListItem(props: {
  browsers: SurfApplication[];
  application: SurfApplication;
  setSurfBrowser: any;
}) {
  const browsers = props.browsers;
  const application = props.application;
  const setSurfBrowser = props.setSurfBrowser;

  return (
    <List.Item
      key={application.bundleId}
      title={application.name}
      icon={{ fileIcon: application.path }}
      subtitle={application.add ? "🌟" : ""}
      accessories={[
        { text: application.support.length > 0 ? application.support.toString().replace(",", " , ") : " " },
      ]}
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
                browsers.map((val, index) => {
                  if (val.name == application.name) {
                    browsers.splice(index, 1);
                  }
                });
                await LocalStorage.setItem("boards", JSON.stringify(browsers));
                setSurfBrowser(browsers);
                await showToast(Toast.Style.Success, `${application.name} Removed!`);
              } else {
                application.add = true;
                browsers.push(application);
                await LocalStorage.setItem("boards", JSON.stringify(browsers));
                setSurfBrowser(browsers);
                await showToast(Toast.Style.Success, `${application.name} Added!`);
              }
            }}
          />
          <Action
            title={"Remove Invalid Boards"}
            icon={Icon.XmarkCircle}
            onAction={async () => {
              const newBrowsers = await removeInvalidBoards();
              await LocalStorage.setItem("boards", JSON.stringify(newBrowsers));
              setSurfBrowser(newBrowsers);
              await showToast(Toast.Style.Success, "Invalid Removed!");
            }}
          />
          <Action
            title={"Remove All Boards"}
            icon={Icon.ExclamationMark}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={async () => {
              await LocalStorage.removeItem("boards");
              setSurfBrowser([]);
              await showToast(Toast.Style.Success, "All Removed!");
            }}
          />
        </ActionPanel>
      }
    />
  );
}
async function removeInvalidBoards(): Promise<SurfApplication[]> {
  const allApplications = await getApplications();
  const localBrowsers = await LocalStorage.getItem<string>("boards");
  let _browsers: SurfApplication[] = [];
  if (typeof localBrowsers == "string") {
    _browsers = JSON.parse(localBrowsers);
  }
  _browsers.map((val: SurfApplication, index: number) => {
    if (
      !allApplications.some((value: Application) => {
        return value.path == val.path;
      })
    ) {
      _browsers.splice(index, 1);
    }
  });
  return _browsers;
}
