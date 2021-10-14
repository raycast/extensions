import { render } from "@raycast/api";
import { searchResources } from "./common/notionApi";
import { initialize } from "./common/initialize";
import { useStore } from "./common/store";
import { View } from "./common/View";

const MyView = ({ cookie, spaceID }: { cookie: string, spaceID: string }) => {
  const store = useStore(["results"], (_, q) => searchResources(cookie, spaceID, q as string));
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
};

async function main() {
  const { cookie, spaceID } = await initialize();
  render(<MyView cookie={cookie} spaceID={spaceID}/>);
}

main();
