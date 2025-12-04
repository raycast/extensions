import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  environment,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import { useEffect, useState } from "react";
import { ClientInfo, getClients } from "./getClients";

interface SignUpFormValues {
  serverJSON: string;
}

export function AddServerUI({ setClients }: { setClients: (clients: ClientInfo[]) => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<SignUpFormValues>({
    onSubmit(values) {
      const configPath = `${environment.supportPath}/servers/mcp-config.json`;
      try {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        const newServer = JSON.parse(values.serverJSON);
        config.mcpServers = { ...config.mcpServers, ...newServer };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        setClients(getClients(environment.supportPath));
      } catch (error) {
        console.error("Error updating config file:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Failed to update the config file",
        });
      }
      showToast({
        style: Toast.Style.Success,
        title: "Added",
        message: `Added Server: ${Object.keys(JSON.parse(values.serverJSON))[0]}`,
      });
      pop();
    },
    validation: {
      serverJSON: (value) => {
        if (!value) {
          return "The item is required";
        } else {
          try {
            JSON.parse(value);
          } catch (e) {
            console.log(e);
            return "Invalid JSON format";
          }

          const parsedValue = JSON.parse(value);
          if (Object.keys(parsedValue).length !== 1) {
            return "The JSON object must have one key for your server";
          }
          const server = parsedValue[Object.keys(parsedValue)[0]];
          if (!server.command) {
            return "Your server must have a command field";
          }
          if (!server.args) {
            return "Your server must have a args field";
          }
          if (!Array.isArray(server.args) || !server.args.every((x: unknown) => typeof x === "string")) {
            return "args must be an array of strings";
          }
        }
      },
    },
  });
  return (
    <Form
      searchBarAccessory={
        <Form.LinkAccessory target={"file://" + environment.assetsPath + "/docs.txt"} text="See Docs" />
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Server Config" {...itemProps.serverJSON} />
      <Form.Description
        title=""
        text={
          'Enter a JSON entry to add to the MCP config file. Click "See Docs" at the top for syntax tips and how to make a local server.'
        }
      />
    </Form>
  );
}

export default function Command() {
  function getUserShellPath() {
    const shell = os.userInfo().shell || "/bin/sh";
    const command = `${shell} -l -c 'echo $PATH'`;

    try {
      const path = execSync(command).toString().trim();
      return path;
    } catch (error) {
      console.error("Error retrieving shell PATH:", error);
      return process.env.PATH || "";
    }
  }

  process.env.PATH = getUserShellPath();

  const supportPath = environment.supportPath;

  const [clients, setClients] = useState<ClientInfo[]>([]);

  useEffect(() => {
    const clients = getClients(supportPath);
    setClients(clients);
  }, []);

  const typeMap: { [x: string]: string } = {
    node: "Typescript",
    python: "Python",
  };

  return (
    <List
      actions={
        <ActionPanel title="Manage MCP Servers">
          <Action.Push
            title="Add New Server"
            target={<AddServerUI setClients={setClients} />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            icon={Icon.Plus}
          />
          <Action.ShowInFinder
            path={`${supportPath}/servers/mcp-config.json`}
            title="Show Config File in Finder"
            icon={Icon.Hammer}
          />
          <Action.ShowInFinder path={`${supportPath}/servers`} title="Open Servers Folder" icon={Icon.Folder} />
        </ActionPanel>
      }
    >
      {clients.length === 0 ? (
        <List.EmptyView icon={Icon.Stars} title="Add a Server to Get Started" />
      ) : (
        clients.map(({ type, path, command, name, ready }, index) => {
          if (type == "command") {
            return (
              <List.Item
                key={index}
                subtitle={"Uses " + command!.command}
                title={name}
                accessories={[{ text: "Command", icon: Icon.Code, tooltip: "Loaded from MCP Config file" }]}
                actions={
                  <ActionPanel title={"Manage Server " + name}>
                    <Action.ShowInFinder
                      path={`${supportPath}/servers/mcp-config.json`}
                      title="Show Config File in Finder"
                      icon={Icon.Hammer}
                    />
                    <Action.ShowInFinder
                      path={`${supportPath}/servers`}
                      title="Open Servers Folder"
                      icon={Icon.Folder}
                    />
                    <Action.Push
                      title="Add New Server"
                      target={<AddServerUI setClients={setClients} />}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      icon={Icon.Plus}
                    />
                    <Action
                      icon={Icon.Trash}
                      title="Delete Server"
                      onAction={async () => {
                        await confirmAlert({
                          title: "Are you sure?",
                          message: "You will need to re-add this server to your configuration file.",
                          icon: Icon.Trash,
                          primaryAction: {
                            title: "Delete Server",
                            style: Alert.ActionStyle.Destructive,
                            onAction: () => {
                              const configPath = `${supportPath}/servers/mcp-config.json`;
                              try {
                                const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
                                delete config.mcpServers[name];
                                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                                setClients((prevClients) => prevClients.filter((_, i) => i !== index));
                              } catch (error) {
                                console.error("Error updating config file:", error);
                              }
                            },
                          },
                        });
                      }}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                      style={Action.Style.Destructive}
                    />
                  </ActionPanel>
                }
              />
            );
          } else {
            return (
              <List.Item
                key={index}
                title={name}
                subtitle={typeMap[type]}
                accessories={[
                  { tag: { value: ready ? "Ready" : "Not Ready", color: ready ? Color.Green : Color.Red } },
                  { text: "Local", icon: Icon.Hammer, tooltip: "Loaded from Source Folder" },
                ]}
                actions={
                  <ActionPanel title={"Manage Server " + name}>
                    <Action.ShowInFinder
                      path={`${path!.substring(0, path!.lastIndexOf("/"))}`}
                      title="Show Source Folder in Finder"
                    />
                    <Action.ShowInFinder
                      path={`${supportPath}/servers/mcp-config.json`}
                      title="Show Config File in Finder"
                      icon={Icon.Hammer}
                    />
                    <Action.ShowInFinder
                      icon={Icon.Folder}
                      path={`${supportPath}/servers`}
                      title="Open Servers Folder"
                    />
                    <Action.Push
                      title="Add New Server"
                      target={<AddServerUI setClients={setClients} />}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      icon={Icon.Plus}
                    />
                    <Action
                      icon={Icon.Trash}
                      title="Delete Server"
                      onAction={async () => {
                        await confirmAlert({
                          title: "Are you sure?",
                          message: "The Source Folder will be deleted permanently.",
                          icon: Icon.Trash,
                          primaryAction: {
                            title: "Delete Server",
                            style: Alert.ActionStyle.Destructive,
                            onAction: () => {
                              try {
                                execSync(`rm -rf ${path!.substring(0, path!.lastIndexOf("/")).replaceAll(" ", "\\ ")}`);
                                setClients((prevClients) => prevClients.filter((_, i) => i !== index));
                              } catch (error) {
                                console.error("Error deleting server folder:", error);
                              }
                            },
                          },
                        });
                      }}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                      style={Action.Style.Destructive}
                    />
                  </ActionPanel>
                }
              />
            );
          }
        })
      )}
    </List>
  );
}
