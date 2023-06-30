import { useCachedPromise } from "@raycast/utils";
import getTopCreators from "../utils/getTopCreators";
import { Author, Task } from "../types/author.types";

const useTopCreators = () => {
  return useCachedPromise(async () => {
    const data = await getTopCreators();

    if (!data) {
      return null;
    }

    const authors: Author[] = data.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (author: any): Author => ({
        id: author.id,
        username: author.username,
        d7Users: author.d7Users,
        d7Plays: author.d7Plays,
        tasks: author.tasks.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (task: any): Task => ({
            id: task.id,
            name: task.name,
            imageUrl: task.imageUrl,
            description: task.description,
          })
        ),
      })
    );

    return authors;
  }, []);
};

export default useTopCreators;
