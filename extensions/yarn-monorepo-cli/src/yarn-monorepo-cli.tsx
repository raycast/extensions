import { ActionPanel, List, Action, Form, LocalStorage, showToast, Toast, Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import fs from "fs";
import path from "path";
import * as glob from "glob";

interface PackageInfo {
  name: string;
  scripts: Record<string, string>;
  path: string;
}

export default function Command() {
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storedPath = await LocalStorage.getItem("monorepo-root");
      if (storedPath) setRootPath(storedPath as string);
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!rootPath) return;

    (async () => {
      try {
        const rootPackageJson = JSON.parse(fs.readFileSync(path.join(rootPath, "package.json"), "utf-8"));

        const packagePaths = glob.sync(
          rootPackageJson.workspaces.map((pattern: string) => path.join(rootPath, pattern, "package.json")),
        );

        const packages = packagePaths.map((pkgPath: string) => {
          const content = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
          return {
            name: content.name,
            scripts: content.scripts || {},
            path: path.dirname(pkgPath),
          };
        });
        setPackages(packages);
      } catch (error) {
        showFailureToast(error, { title: "Error reading monorepo structure" });
      }
    })();
  }, [rootPath]);

  if (!rootPath && !isLoading) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Set Root Path"
              onSubmit={async (values) => {
                try {
                  const packageJsonPath = path.join(values.rootPath, "package.json");
                  if (!fs.existsSync(packageJsonPath)) {
                    throw new Error("No package.json found at specified path");
                  }
                  await LocalStorage.setItem("monorepo-root", values.rootPath);
                  setRootPath(values.rootPath);
                } catch (error) {
                  showFailureToast(error, { title: "Invalid monorepo path" });
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField id="rootPath" title="Monorepo Root Path" placeholder="/full/path/to/the/monorepo/root" />
      </Form>
    );
  }

  return (
    <List isLoading={isLoading}>
      {packages.map((pkg) => (
        <List.Item
          key={pkg.name}
          icon="📦"
          title={pkg.name}
          actions={
            <ActionPanel>
              <Action.Push title="Select Package" target={<ScriptList package={pkg} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ScriptList({ package: pkg }: { package: PackageInfo }) {
  return (
    <List>
      {Object.entries(pkg.scripts).map(([name, script]) => (
        <List.Item
          key={name}
          title={name}
          icon="📜"
          subtitle={script}
          actions={
            <ActionPanel>
              <Action
                title="Paste Command"
                onAction={async () => {
                  try {
                    const command = `yarn workspace "${pkg.name}" "${name}"`;
                    await Clipboard.paste(command);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Command pasted",
                      message: `"${command}" has been pasted into the active window`,
                    });
                  } catch (error) {
                    showFailureToast(error, { title: "Command paste failed" });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
