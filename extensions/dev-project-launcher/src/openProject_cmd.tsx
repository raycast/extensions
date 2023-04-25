import { LaunchProps, LocalStorage, Toast, showToast } from "@raycast/api";
import { homedir } from "os";
import { useEffect, useState } from "react";
import { Node, retrieveNodes } from "./node";
import Projects from "./project";

const PROJECT_DIR_LS_KEY = "ProjectsRootDir";

export default function Command(props: LaunchProps<{ arguments: { projectsRootDir?: string } }>) {
  const [nodes, setNodes] = useState<Node[]>([]);
  useEffect(() => {
    const calculatePaths = async () => {
      const argDir = props.arguments.projectsRootDir ? `${homedir()}/${props.arguments.projectsRootDir}` : undefined;
      const rootDir =
        argDir || (await LocalStorage.getItem(PROJECT_DIR_LS_KEY).then((dir) => dir?.toString())) || homedir();

      try {
        setNodes(await retrieveNodes(rootDir));
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Path introduced does not exist in HOME",
        });
        setNodes(await retrieveNodes(homedir()));
      }
      await LocalStorage.setItem(PROJECT_DIR_LS_KEY, rootDir);
    };
    calculatePaths();
  }, []);
  return <Projects nodes={nodes} />;
}
