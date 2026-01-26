import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(ProxymanActions.OpenProtobuf, "Opened Protobuf", "Failed to Open Protobuf");
}
