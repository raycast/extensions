import DotComCommand from "./components/CloudCommand";
import SearchHistoryCommand from "./components/SearchHistoryCommand";

export default function SearchCloud() {
  return <DotComCommand Command={SearchHistoryCommand} />;
}
