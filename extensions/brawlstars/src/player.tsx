import { Detail } from "@raycast/api";
import PlayerComponent from "./Components/PlayerInfo";

export default function playerGet(props: { arguments: { id: string } }) {
  return <PlayerComponent id={props.arguments.id.replace("#", "")} />;
}
