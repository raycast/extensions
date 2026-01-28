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
      (author: Author): Author => ({
        id: author.id,
        username: author.username,
        d7Users: author.d7Users,
        d7Plays: author.d7Plays,
        tasks: author.tasks.map(
          (task: Task): Task => ({
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
