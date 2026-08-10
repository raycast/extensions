import { searchResources } from "./common/notionApi";
import { useStore } from "./common/store";
import { View } from "./common/View";

export default function MyView() {
  const store = useStore(["results"], (_, q) => searchResources(q as string));
  const sectionNames = ["Search Results"];
  return (
    <View
      sectionNames={sectionNames}
      queryResults={store.queryResults}
      isLoading={store.queryIsLoading}
      onSearchTextChange={(text) => {
        if (text) {
          store.runQuery(text);
        } else {
          store.clearResults();
        }
      }}
      throttle
    />
  );
}
