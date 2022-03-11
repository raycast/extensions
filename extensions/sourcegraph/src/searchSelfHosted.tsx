import SearchCommand from "./components/search";
import SelfHostedCommand from "./components/selfHosted";

export default function SearchInstance() {
  return <SelfHostedCommand command={(src) => SearchCommand(src)} />;
}
