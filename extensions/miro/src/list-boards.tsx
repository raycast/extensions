import * as miro from "./oauth/miro";
import { useCachedPromise } from "@raycast/utils";
import ListBoards from "./components/list-boards";

export default function ListMyBoards() {
  const { isLoading, data, mutate } = useCachedPromise(
    async (fetch) => {
      await miro.authorize();
      return await fetch();
    },
    [miro.fetchMyItems],
    {
      initialData: [],
    }
  );

  return <ListBoards isLoading={isLoading} data={data} mutate={mutate} />;
}
