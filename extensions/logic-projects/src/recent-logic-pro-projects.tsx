import {
  Action,
  ActionPanel,
  getApplications,
  getPreferenceValues,
  Icon,
  List,
  open,
  openCommandPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import * as crypto from "node:crypto";
import { showFailureToast } from "@raycast/utils";

export interface LogicProject {
  name: string;
  id: string;
  path: string;
  lastModified: Date;
}

const isLogicInstalled = async () => {
  const apps = await getApplications();
  return apps.some(({ bundleId }) => bundleId === "com.apple.logic10");
};

export default function Command() {
  const [projects, setProjects] = useState<LogicProject[]>([]);
  const [, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error>();
  // default location
  const preferences = getPreferenceValues<Preferences>();

  isLogicInstalled().then((installed) => {
    if (!installed) {
      const options: Toast.Options = {
        style: Toast.Style.Failure,
        title: "Logic Pro is not installed.",
        message: "Install it from: https://www.apple.com/logic-pro/",
        primaryAction: {
          title: "Go to https://www.apple.com/logic-pro/",
          onAction: (toast) => {
            open("https://www.apple.com/logic-pro/");
            toast.hide();
          },
        },
      };
      return showToast(options);
    }
  });

  useEffect(() => {
    const location = preferences["projects-location"];
    const execAsync = promisify(exec);
    setIsLoading(true);
    setError(undefined);

    execAsync(
      // `ls -A1 ${path} | grep .logicx`
      `find ${location} -regex ".*\\.\\(logicx\\)" | head -n 200 | xargs -I{} stat -f "%N,%m" "{}"`,
    )
      .then((result) => {
        if (result.stderr !== null && result.stderr !== "") {
          setError(new Error(result.stderr));
          return [];
        }
        const projects: LogicProject[] = result.stdout
          .trim()
          .split("\n")
          .filter((entry) => entry.includes(","))
          .map((entry) => {
            const [p, lastModified] = entry.split(",");
            const lastModifiedDate = new Date(Number(lastModified) * 1000);
            const lastSlashIndex = p.lastIndexOf("/");
            const afterLastSlash = p.substring(lastSlashIndex + 1);
            return {
              name: afterLastSlash,
              lastModified: isNaN(lastModifiedDate.getTime()) ? new Date(0) : lastModifiedDate, // Handle invalid dates
              id: crypto.createHash("md5").update(entry).digest("hex"),
              path: p,
            };
          })
          .sort((a, b) => {
            if (a.lastModified < b.lastModified) {
              return 1;
            }
            return -1;
          });
        setError(undefined);
        setProjects(projects);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(new Error(err));
        return [];
      });
  }, [setProjects, setIsLoading, setError]);

  useEffect(() => {
    if (error !== undefined) {
      showFailureToast(error, {
        title: "Something went wrong",
      });
    }
  }, [error, setError]);

  return (
    <List
      filtering={true}
      throttle={true}
      searchBarPlaceholder={"Filter projects..."}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openCommandPreferences} icon={Icon.WrenchScrewdriver} />
        </ActionPanel>
      }
    >
      {projects.map((project) => {
        return (
          <List.Item
            key={project.id}
            accessories={[
              {
                date: {
                  value: project.lastModified,
                },
              },
            ]}
            icon={{
              source:
                "https://help.apple.com/assets/654E7F8CD472768668095520/654E7F9560B6B45E960FE823/de_DE/390711ce08c61bf054d3dc4dfb9080ae.png",
            }}
            title={project.name}
            actions={
              <ActionPanel>
                <Action title="Open Project" onAction={() => open(project.path)} icon={Icon.Play} />
                <Action
                  title="Open Extension Preferences"
                  onAction={openCommandPreferences}
                  icon={Icon.WrenchScrewdriver}
                />
              </ActionPanel>
            }
          />
        );
      })}
      {projects.length == 0 && (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                onAction={openCommandPreferences}
                icon={Icon.WrenchScrewdriver}
              />
            </ActionPanel>
          }
          icon={Icon.EmojiSad}
          title={"No Logic projects found."}
          description={`Are you sure you picked the right directory?
${preferences["projects-location"]} is currently selected.
Open the extension preferences (Enter) to change the directory.`}
        ></List.EmptyView>
      )}
    </List>
  );
}
