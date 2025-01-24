import { Detail } from "@raycast/api";

export default function ViewNoteForm(props: { noteName: string; text: string }) {
  return <Detail markdown={props.text} navigationTitle={props.noteName} />;
}
