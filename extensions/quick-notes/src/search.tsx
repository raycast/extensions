import { LaunchProps } from "@raycast/api";
import NotesList from "./components/notesList";

const SearchCmd = (props: LaunchProps) => {
  const { text, tag } = props.arguments;
  return <NotesList sText={text} sTag={tag} />;
};

export default SearchCmd;
