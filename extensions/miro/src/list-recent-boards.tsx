import * as miro from "./oauth/miro";
import { useCachedPromise } from "@raycast/utils";
import ListBoards from "./components/list-boards";

export default function ListRecentBoards() {
  const { isLoading, data, mutate } = useCachedPromise(
    async () => {
      await miro.authorize();
      return await miro.fetchRecentItems();
    },
    [],
    {
      initialData: [],
    }
  );

  return <ListBoards isLoading={isLoading} data={data} mutate={mutate} />;
}
