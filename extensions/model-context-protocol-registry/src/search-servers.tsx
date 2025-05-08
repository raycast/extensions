import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { REGISTRIES } from "./registries";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, setShowingDetail] = useCachedState("isShowingDetail", true);
  const [selectedRegistryId, setSelectedRegistryId] = useCachedState("registry", REGISTRIES[0].id);
  const [pagination, setPagination] = useState<List.Props["pagination"]>(undefined);
  const [isLoading, setIsLoading] = useState<List.Props["isLoading"]>(undefined);

  useEffect(() => {
    setPagination(undefined);
    setIsLoading(undefined);
  }, [selectedRegistryId]);

  const selectedRegistry = useMemo(
    () => REGISTRIES.find((registry) => registry.id === selectedRegistryId) ?? REGISTRIES[0],
    [selectedRegistryId],
  );

  const RegistryComponent = selectedRegistry?.component;

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      isShowingDetail={isShowingDetail}
      searchText={searchText}
      throttle={selectedRegistry?.throttle}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Registry" value={selectedRegistryId} onChange={setSelectedRegistryId}>
          {REGISTRIES.map((registry) => (
            <List.Dropdown.Item key={registry.id} icon={registry.icon} title={registry.title} value={registry.id} />
          ))}
        </List.Dropdown>
      }
    >
      <RegistryComponent
        key={selectedRegistryId}
        searchText={searchText}
        isShowingDetail={isShowingDetail}
        setShowingDetail={setShowingDetail}
        pagination={pagination}
        setPagination={setPagination}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />
    </List>
  );
}

// function Command() {
//   const [isShowingDetail, setShowingDetail] = useCachedState("isShowingDetail", true);
//   const [searchText, setSearchText] = useState("");

//   return (
//     <List isShowingDetail={isShowingDetail} searchText={searchText} onSearchTextChange={setSearchText} throttle>
//       {OFFICIAL_REGISTRY.entries.map((entry) => (
//         <List.Item
//           key={entry.name}
//           icon={entry.icon}
//           title={entry.title}
//           subtitle={isShowingDetail ? undefined : entry.description}
//           accessories={getAccessories(entry)}
//           detail={
//             <List.Item.Detail
//               markdown={`# ${entry.title}\n\n${entry.description ?? ""}`}
//               metadata={
//                 <List.Item.Detail.Metadata>
//                   <List.Item.Detail.Metadata.Label
//                     title="Type"
//                     text={"command" in entry.configuration ? "stdio" : "SSE"}
//                   />
//                   <List.Item.Detail.Metadata.Label title="Command" text={entry.configuration.command} />
//                   {entry.configuration.args && (
//                     <List.Item.Detail.Metadata.TagList title="Arguments">
//                       {entry.configuration.args.map((arg) => (
//                         <List.Item.Detail.Metadata.TagList.Item key={arg} text={arg} />
//                       ))}
//                     </List.Item.Detail.Metadata.TagList>
//                   )}
//                   {entry.homepage && (
//                     <List.Item.Detail.Metadata.Link
//                       title="Homepage"
//                       text={new URL(entry.homepage).hostname}
//                       target={entry.homepage}
//                     />
//                   )}
//                 </List.Item.Detail.Metadata>
//               }
//             />
//           }
//           actions={
//             <ActionPanel>
//               <ActionPanel.Section>
//                 <ActionPanel.Submenu icon={Icon.ArrowDownCircle} title="Install Server">
//                   <Action.InstallMCPServer
//                     icon={{
//                       source: {
//                         light: Icon.RaycastLogoPos,
//                         dark: Icon.RaycastLogoNeg,
//                       },
//                     }}
//                     title="Raycast"
//                     server={{
//                       transport: "stdio",
//                       name: entry.name,
//                       description: entry.description,
//                       command: entry.configuration.command,
//                       args: entry.configuration.args,
//                     }}
//                   />
//                   <ActionPanel.Section>
//                     {SUPPORTED_CLIENTS.map((client) => (
//                       <InstallServerToClientAction key={client.bundleId} server={entry} client={client} />
//                     ))}
//                   </ActionPanel.Section>
//                 </ActionPanel.Submenu>
//               </ActionPanel.Section>
//               <ActionPanel.Submenu icon={Icon.ArrowDownCircle} title="Install Server"></ActionPanel.Submenu>
//               {entry.homepage && <Action.OpenInBrowser url={entry.homepage} />}
//               <Action
//                 icon={Icon.Sidebar}
//                 title={isShowingDetail ? "Hide Details" : "Show Details"}
//                 shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
//                 onAction={() => setShowingDetail(!isShowingDetail)}
//               />
//             </ActionPanel>
//           }
//         />
//       ))}
//     </List>
//   );
// }

// function InstallServerToClientAction(props: { server: RegistryEntry; client: MCPClient }) {
//   const { data: applications } = useApplications();

//   const application = useMemo(
//     () => applications?.find((application) => application.bundleId === props.client.bundleId),
//     [applications, props.client.bundleId],
//   );

//   async function handleInstall() {
//     await showToast({ style: Toast.Style.Animated, title: "Installing server" });

//     try {
//       writeMCPConfig(props.client, {
//         mcpServers: {
//           [props.server.name]: props.server.configuration,
//         },
//       });

//       if (application) {
//         await restartApplication(application);
//       }
//     } catch (e) {
//       await showFailureToast(e, { title: "Failed installing server" });
//     }

//     await showToast({
//       style: Toast.Style.Success,
//       title: "Installed server",
//     });
//   }

//   return (
//     <Action
//       icon={application?.path ? { fileIcon: application?.path } : undefined}
//       title={props.client.title}
//       onAction={handleInstall}
//     />
//   );
// }

// // function useClients() {
// //   return usePromise(async () => {
// //     const applications = await withCache(getApplications)();
// //     return applications
// //       .map((app) => {
// //         const client = VALID_CLIENTS.find((client) => app.name === getClientTitle(client));
// //         if (!client) {
// //           return undefined;
// //         }

// //         return {
// //           appTitle: app.localizedName ?? app.name,
// //           appIcon: app.path,
// //           client: client,
// //         };
// //       })
// //       .filter((app) => app !== undefined);
// //   });

// // type GetServersResponse = {
// //   servers: Server[];
// //   pagination: Pagination;
// // };

// // type Pagination = {
// //   currentPage: number;
// //   pageSize: number;
// //   totalPages: number;
// //   totalCount: number;
// // };

// // type Server = {
// //   qualifiedName: string;
// //   displayName: string;
// //   description: string;
// //   useCount: number;
// //   homepage: string;
// //   createdAt: string;
// // };

// // type GetServerResponse = {
// //   qualifiedName: string;
// //   displayName: string;
// //   deploymentUrl: string;
// //   connections: Array<Connection>;
// // };

// // type Connection = StdioConnection | WsConnection;

// // type StdioConnection = {
// //   type: "stdio";
// //   configSchema: JSONSchema7;
// //   exampleConfig: {};
// //   published: boolean;
// //   stdioFunction: string;
// // };

// // type WsConnection = {
// //   type: "ws";
// //   deploymentUrl: string;
// //   configSchema: JSONSchema7;
// // };

// // export default function Command() {
// //   const [isShowingDetail, setShowingDetail] = useCachedState("isShowingDetail", true);
// //   const [searchText, setSearchText] = useState("");
// //   const { data, isLoading, pagination } = useFetch(
// //     (options) =>
// //       "https://registry.smithery.ai/servers?" +
// //       new URLSearchParams({ q: searchText, pageSize: "25", page: String(options.page + 1) }).toString(),
// //     {
// //       headers: {
// //         Authorization: "Bearer 95ea41d7-d579-48af-b508-91370bdc47c2",
// //       },
// //       mapResult(result: GetServersResponse) {
// //         return {
// //           data: result.servers,
// //           hasMore: result.pagination.currentPage < result.pagination.totalPages,
// //         };
// //       },
// //       keepPreviousData: true,
// //       initialData: [],
// //     },
// //   );

// //   return (
// //     <List
// //       isLoading={isLoading}
// //       pagination={pagination}
// //       isShowingDetail={isShowingDetail}
// //       searchText={searchText}
// //       onSearchTextChange={setSearchText}
// //       throttle
// //     >
// //       {data?.map((server) => (
// //         <List.Item
// //           key={server.qualifiedName}
// //           title={server.displayName}
// //           subtitle={isShowingDetail ? undefined : server.qualifiedName}
// //           accessories={[
// //             {
// //               icon: Icon.Bolt,
// //               text: numeral(server.useCount).format("0a"),
// //               tooltip: `Used ${server.useCount.toLocaleString()} times last month`,
// //             },
// //           ]}
// //           detail={<ServerDetail server={server} />}
// //           actions={
// //             <ActionPanel>
// //               <InstallServerAction server={server} />
// //               <Action.OpenInBrowser url={server.homepage} />
// //               <Action
// //                 icon={Icon.Sidebar}
// //                 title={isShowingDetail ? "Hide Details" : "Show Details"}
// //                 shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
// //                 onAction={() => setShowingDetail(!isShowingDetail)}
// //               />
// //             </ActionPanel>
// //           }
// //         />
// //       ))}
// //     </List>
// //   );
// // }

// // function ServerDetail({ server }: { server: Server }) {
// //   const { data, isLoading } = useFetch<GetServerResponse>(
// //     "https://registry.smithery.ai/servers/" + server.qualifiedName,
// //     {
// //       headers: {
// //         Authorization: "Bearer 95ea41d7-d579-48af-b508-91370bdc47c2",
// //       },
// //     },
// //   );

// //   const markdown = `# ${server.displayName}\n\n${server.description}\n\n## Connections\n\n${data?.connections
// //     .map((connection) => {
// //       return `### ${connection.type}\n\n\`\`\`json\n${JSON.stringify(connection, null, 2)}\n\`\`\``;
// //     })
// //     .join("\n")}`;

// //   return (
// //     <List.Item.Detail
// //       isLoading={isLoading}
// //       markdown={markdown}
// //       metadata={
// //         <List.Item.Detail.Metadata>
// //           <List.Item.Detail.Metadata.Label title="Qualified Name" text={server.qualifiedName} />
// //           <List.Item.Detail.Metadata.Label title="Used Last Month" text={server.useCount.toLocaleString()} />
// //           <List.Item.Detail.Metadata.Label title="Created At" text={new Date(server.createdAt).toLocaleDateString()} />
// //         </List.Item.Detail.Metadata>
// //       }
// //     />
// //   );
// // }

// // // function ConnectionDetail({ qualifiedName }: { qualifiedName: String }) {
// // //   const { data, isLoading } = useFetch<GetServerResponse>("https://registry.smithery.ai/servers/" + qualifiedName, {
// // //     headers: {
// // //       Authorization: "Bearer 95ea41d7-d579-48af-b508-91370bdc47c2",
// // //     },
// // //   });

// // //   const firstConnection = data?.connections[0];

// // //   return (
// // //     <Detail
// // //       isLoading={isLoading}
// // //       markdown={`# ${firstConnection?.type}\n\n${JSON.stringify(firstConnection, null, 2)}`}
// // //     />
// // //   );
// // // }

// // function InstallServerAction({ server }: { server: Server }) {
// //   const { data, isLoading } = useClients();

// //   async function install(client: string) {
// //     await showToast({ style: Toast.Style.Animated, title: "Installing server" });
// //     try {
// //       const response = await fetch("https://registry.smithery.ai/servers/" + server.qualifiedName, {
// //         headers: {
// //           Authorization: "Bearer 95ea41d7-d579-48af-b508-91370bdc47c2",
// //         },
// //       });
// //       if (!response.ok) {
// //         await showToast({
// //           title: "Failed fetching server details",
// //           style: Toast.Style.Failure,
// //         });
// //         return;
// //       }

// //       const serverDetails = (await response.json()) as GetServerResponse;
// //       const stdioConnection = serverDetails?.connections.find((connection) => connection.type === "stdio");
// //       if (!stdioConnection) {
// //         await showToast({
// //           title: "Server does not support this client",
// //           style: Toast.Style.Failure,
// //         });
// //         return;
// //       }

// //       await runCommandWithShell(
// //         `npm exec -- @smithery/cli install @smithery-ai/server-sequential-thinking --client ${client}`,
// //       );

// //       await showToast({
// //         style: Toast.Style.Success,
// //         title: "Server installed",
// //         message: "Ensure you trust the server author, especially when sharing sensitive data.",
// //       });
// //     } catch (err) {
// //       await showFailureToast(err, { title: "Failed installing server" });
// //     }
// //   }

// //   return (
// //     <ActionPanel.Submenu
// //       icon={Icon.AddPerson}
// //       title="Install Server"
// //       shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
// //       isLoading={isLoading}
// //     >
// //       {data?.map((app) => (
// //         <Action
// //           key={app?.appIcon}
// //           icon={{ fileIcon: app?.appIcon }}
// //           title={app.appTitle}
// //           onAction={() => install(app.client)}
// //         />
// //       ))}
// //     </ActionPanel.Submenu>
// //   );
// // }

// // // function InstallServerAction({ server }: { server: Server }) {
// // //   const { data, isLoading } = useFetch<GetServerResponse>(
// // //     "https://registry.smithery.ai/servers/" + server.qualifiedName,
// // //     {
// // //       headers: {
// // //         Authorization: "Bearer 95ea41d7-d579-48af-b508-91370bdc47c2",
// // //       },
// // //     },
// // //   );

// // //   async function installConnection(connection: Connection) {
// // //     console.log(connection);
// // //   }

// // //   return (
// // //     <ActionPanel.Submenu
// // //       icon={Icon.AddPerson}
// // //       title="Install Server"
// // //       shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
// // //       isLoading={isLoading}
// // //     >
// // //       {data?.connections.map((connection) => (
// // //         <Action key={getKey(connection)} title={connection.type} onAction={() => installConnection(connection)} />
// // //       ))}
// // //     </ActionPanel.Submenu>
// // //   );
// // // }

// // // function getKey(connection: Connection) {
// // //   switch (connection.type) {
// // //     case "stdio":
// // //       return connection.stdioFunction;
// // //     case "ws":
// // //       return connection.deploymentUrl;
// // //   }
// // // }

// // export const VALID_CLIENTS = [
// //   "claude",
// //   "cline",
// //   "windsurf",
// //   "roo-cline",
// //   "witsy",
// //   "enconvo",
// //   "cursor",
// //   "vscode",
// //   "vscode-insiders",
// // ] as const;

// // function getClientTitle(client: string) {
// //   switch (client) {
// //     case "claude":
// //       return "Claude";
// //     case "cline":
// //       return "Cline";
// //     case "windsurf":
// //       return "Windsurf";
// //     case "roo-cline":
// //       return "Cline";
// //     case "witsy":
// //       return "Witsy";
// //     case "enconvo":
// //       return "Enconvo";
// //     case "cursor":
// //       return "Cursor";
// //     case "vscode":
// //       return "VSCode";
// //     case "vscode-insiders":
// //       return "VSCode Insiders";
// //     default:
// //       return client;
// //   }
// // }

// // function useClients() {
// //   return usePromise(async () => {
// //     const applications = await withCache(getApplications)();
// //     return applications
// //       .map((app) => {
// //         const client = VALID_CLIENTS.find((client) => app.name === getClientTitle(client));
// //         if (!client) {
// //           return undefined;
// //         }

// //         return {
// //           appTitle: app.localizedName ?? app.name,
// //           appIcon: app.path,
// //           client: client,
// //         };
// //       })
// //       .filter((app) => app !== undefined);
// //   });
// // }

// // export function runCommandWithShell(command: string): Promise<string> {
// //   return new Promise((resolve, reject) => {
// //     // Use the user's shell to execute commands
// //     const fullCommand = `
// //       # Source profile to get environment
// //       source ~/.zshrc || source ~/.bash_profile || source ~/.profile;
// //       # Print diagnostic info
// //       echo "Shell: $SHELL";
// //       echo "PATH: $PATH";
// //       # Run the actual command
// //       ${command}
// //     `;

// //     console.log("Running command with shell:", command);

// //     exec(fullCommand, { shell: "/bin/zsh" }, (error, stdout, stderr) => {
// //       if (stderr) console.error("Command stderr:", stderr);
// //       console.log("Command stdout:", stdout);

// //       if (error) {
// //         reject(error);
// //         return;
// //       }

// //       resolve(stdout);
// //     });
// //   });
// // }
