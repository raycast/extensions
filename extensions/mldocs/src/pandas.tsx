import { searchResources } from "./common/mldocsApi";
import { useStore } from "./common/store";
import { View } from "./common/View";

export default function PandasView() {
  const store = useStore(["results"], (_, q) => searchResources(q as string, ["pandas."]));
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
