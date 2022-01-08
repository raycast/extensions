import { useEffect, useState } from "react";
import { getSearchByKeyword } from "../service/osScript";
import { Task } from "../service/task";

type Props = {
  searchQuery: string;
  isInitCompleted: boolean;
};

const useSearchTasks = (props: Props) => {
  const { searchQuery, isInitCompleted } = props;

  const [searchTasks, setSearchTasks] = useState<Task[] | null>(null);

  useEffect(() => {
    const getSearchTasks = async () => {
      const search = await getSearchByKeyword(searchQuery);
      setSearchTasks(search);
    };

    if (!searchQuery) {
      setSearchTasks(null);
    } else {
      if (isInitCompleted) {
        getSearchTasks();
      }
    }
  }, [isInitCompleted, searchQuery]);

  return { searchTasks };
};

export default useSearchTasks;
