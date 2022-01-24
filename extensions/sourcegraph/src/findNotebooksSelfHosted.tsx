import FindNotebooksCommand from "./components/findNotebooks";
import SelfHostedCommand from "./components/selfHosted";

export default function SearchInstance() {
  return <SelfHostedCommand command={(src) => FindNotebooksCommand(src)} />;
}
