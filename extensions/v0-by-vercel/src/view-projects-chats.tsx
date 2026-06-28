import Command from "./view-chats";

export default function ProjectChats(props: { projectId: string }) {
  return <Command projectId={props.projectId} />;
}
