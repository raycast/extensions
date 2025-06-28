import { LaunchProps } from "@raycast/api";
import CreateTag from "./components/createTag";

const NewTagCmd = (props: LaunchProps) => {
  const { tag } = props.arguments;
  return <CreateTag tag={tag} />;
};

export default NewTagCmd;
