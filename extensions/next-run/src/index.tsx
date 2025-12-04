import { useEffect, useState } from "react";
import {
  ActionPanel,
  Form,
  List,
  Action,
  Icon,
  LocalStorage,
  open,
  popToRoot,
  getPreferenceValues,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { runAppleScript } from "run-applescript";
import { homedir } from "os";

interface ExampleSource {
  name: string;
  path: string;
  sha?: string;
  size?: number;
  url?: string;
  html_url?: string;
  git_url?: string;
  download_url?: string | null;
  type?: string;
  _links?: {
    self: string;
    git: string;
    html: string;
  };
}

export default function Command() {
  const preferences = getPreferenceValues();
  const { isLoading, data } = useFetch("https://api.github.com/repos/vercel/next.js/contents/examples", {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${preferences.githubToken}`,
    },
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Examples">
      {Array.isArray(data) && data?.length
        ? data?.map((item: ExampleSource) => (
            <List.Item
              key={item.name}
              icon={Icon.Folder}
              title={item.name}
              actions={
                <ActionPanel>
                  <Action.Push title="Project Setup" icon={Icon.Hammer} target={<ProjectForm item={item} />} />
                </ActionPanel>
              }
            />
          ))
        : []}
    </List>
  );
}

function ProjectForm({ item }: { item: ExampleSource }) {
  const [template] = useState(item.name);
  const [name, setName] = useState(item.name);
  const [location, setLocation] = useState("local");
  const [preferredFolder, setPreferredFolder] = useState(homedir());
  const [preferredPackageManager, setPreferredPackageManager] = useState("npm");
  const [error, setError] = useState<string | undefined>();

  const vercelUrl = `https://vercel.com/new/clone?repository-url=https://github.com/vercel/next.js/tree/canary/examples/${template}&project-name=${name}&repository-name=${name
    .toLowerCase()
    .replace(/ /g, "-")}`;

  const savePreferences = async () => {
    await Promise.all([
      LocalStorage.setItem("preferred-folder", preferredFolder),
      LocalStorage.setItem("preferred-package-manager", preferredPackageManager),
    ]);
  };

  const cloneLocally = async () => {
    if (name === "") {
      setError("Project name is required");
      return;
    }
    const generateCommand = preferredPackageManager === "npm" ? "npx" : preferredPackageManager;
    const slugifiedName = name.toLowerCase().replace(/ /g, "-");
    const appleScript = `
      set commandToRun to "${generateCommand} create-next-app --example ${template} ${preferredFolder}/${slugifiedName} && cd ${preferredFolder}/${slugifiedName} && code . "

      tell application "Terminal"
        activate 
        do script commandToRun
      end tell
    `;

    runAppleScript(appleScript).then(() => {
      open("raycast://confetti");
    });
  };

  const cloneOnVercel = async () => {
    if (name === "") {
      setError("Project name is required");
      return;
    }
    await savePreferences();
    open(vercelUrl);
    popToRoot({ clearSearchBar: true });
  };

  useEffect(() => {
    const getSavedPreferences = async () => {
      const [folderValue, packageManagerValue] = await Promise.all([
        LocalStorage.getItem("preferred-folder"),
        LocalStorage.getItem("preferred-package-manager"),
      ]);

      if (folderValue) setPreferredFolder(folderValue as string);
      else await LocalStorage.setItem("preferred-folder", preferredFolder);

      if (packageManagerValue) setPreferredPackageManager(packageManagerValue as string);
      else await LocalStorage.setItem("preferred-package-manager", preferredPackageManager);
    };

    getSavedPreferences();
  }, []);

  return (
    <Form
      navigationTitle={`Clone from "${item.name}"`}
      actions={
        <ActionPanel>
          {location === "local" ? (
            <Action.SubmitForm icon={Icon.Code} title="Clone Locally" onSubmit={async () => await cloneLocally()} />
          ) : (
            <Action.SubmitForm icon={Icon.Globe} title="Open on Vercel" onSubmit={async () => cloneOnVercel()} />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="projectName"
        title="Project Name"
        autoFocus
        placeholder="Enter project name"
        value={name}
        onChange={setName}
        error={error}
        onBlur={(e) => {
          if (e.target.value?.length === 0) {
            setError("Project name is required");
          } else {
            setError(undefined);
          }
        }}
      />
      <Form.Dropdown
        id="location"
        title="Location"
        value={location}
        onChange={setLocation}
        info="Clone the project locally or deploy it directly to Vercel."
      >
        <Form.Dropdown.Item value="local" title="Local" icon={Icon.Terminal} />
        <Form.Dropdown.Item value="remote" title="Vercel" icon={Icon.Globe} />
      </Form.Dropdown>
      {location === "local" ? (
        <>
          <Form.FilePicker
            id="folder"
            title="Preferred Folder"
            value={[preferredFolder]}
            onChange={(value) => setPreferredFolder(value[0])}
            allowMultipleSelection={false}
            canChooseDirectories
            canChooseFiles={false}
          />
          <Form.Dropdown
            id="packageManager"
            title="Package Manager"
            value={preferredPackageManager}
            onChange={setPreferredPackageManager}
          >
            <Form.Dropdown.Item icon={Icon.Box} value="npm" title="npm" />
            <Form.Dropdown.Item icon={Icon.Box} value="yarn" title="yarn" />
            <Form.Dropdown.Item icon={Icon.Box} value="pnpm" title="pnpm" />
          </Form.Dropdown>
        </>
      ) : null}
    </Form>
  );
}
