import { searchResources } from "./common/mldocsApi";
import { useStore } from "./common/store";
import { View } from "./common/View";

export default function NumpyView() {
  const store = useStore(["results"], (_, q) => searchResources(q as string, ["numpy."]));
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
