import SearchCommand from "./components/SearchCommand";
import InstanceCommand from "./components/InstanceCommand";

export default function SearchSelfHosted() {
  return <InstanceCommand Command={SearchCommand} />;
}
