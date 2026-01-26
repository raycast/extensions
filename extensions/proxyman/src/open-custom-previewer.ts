import { performAction, ProxymanActions } from "./utils/actions";

export default async function Main() {
  await performAction(
    ProxymanActions.OpenCustomPreviewer,
    "Opened Custom Previewer",
    "Failed to Open Custom Previewer",
  );
}
