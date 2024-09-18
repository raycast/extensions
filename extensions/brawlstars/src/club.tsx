import { Detail, List } from "@raycast/api";
import ClubComponent from "./Components/clubInfo";

export default function clubGet(props: { arguments: { id: string } }) {
  return <ClubComponent id={props.arguments.id.replace("#", "")} />;
}
