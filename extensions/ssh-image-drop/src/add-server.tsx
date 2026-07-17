import { ServerForm } from "./components/ServerForm";

export default function AddServer() {
  return <ServerForm mode={{ kind: "add" }} />;
}
