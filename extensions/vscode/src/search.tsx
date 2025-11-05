import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { exec } from "child_process";
import Workspaces from "./utils/workspaceStorage";

export default function Command() {
  const data = Workspaces();

  function openWorkspace(path: string) {
    exec(`code ${path}`);
  }

  return (
    <List>
      {data?.map((obj, i) => (
        <List.Item
          key={i}
          icon={Icon.Folder}
          title={obj.name}
          subtitle={obj.path}
          actions={
            <ActionPanel>
              <Action title="Open in Code" icon={Icon.Patch} onAction={() => openWorkspace(obj.path)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
  // return isLoading ? (
  //   <Detail isLoading={isLoading} />
  // ) : (
  //   <List>
  //     {data?.map((obj, i) => (
  //       <List.Item
  //         key={i}
  //         icon={Icon.Patch}
  //         title={obj.name}
  //         subtitle={obj.path}
  //         actions={
  //           <ActionPanel>
  //             <Action title="Reload" onAction={() => openWorkspace(obj.path)} />
  //             <Action.Push title="Show Details" target={<Detail markdown={obj.path} />} />
  //           </ActionPanel>
  //         }
  //       />
  //     ))}
  //   </List>
  // );
}

// Handling error
// const [error, setError] = useState<Error>();

// useEffect(() => {
//   setTimeout(() => {
//     setError(new Error("Booom 💥"));
//   }, 1000);
// }, []);

// useEffect(() => {
//   if (error) {
//     showToast({
//       style: Toast.Style.Failure,
//       title: "Something went wrong",
//       message: error.message,
//     });
//   }
// }, [error]);

{
  /* <List>
      <List.Item
        icon={Icon.Bird}
        title="Greeting"
        actions={
          <ActionPanel>
            <Action.Push title="Show Details" target={<Detail markdown="# Hey! 👋" />} />
          </ActionPanel>
        }
      />
    </List> */
}
