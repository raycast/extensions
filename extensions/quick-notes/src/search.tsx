import { LaunchProps } from "@raycast/api";
import NotesList from "./components/notesList";

export default function SearchCmd(props: LaunchProps) {
  const { text, tag } = props.arguments;
  return <NotesList sText={text} sTag={tag} />;
}
