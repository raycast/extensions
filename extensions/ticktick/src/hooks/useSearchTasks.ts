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
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const getSearchTasks = async () => {
      setIsSearching(true);
      const search = await getSearchByKeyword(searchQuery);
      setSearchTasks(search);
      setIsSearching(false);
    };

    if (!searchQuery) {
      setSearchTasks(null);
    } else {
      if (isInitCompleted) {
        getSearchTasks();
      }
    }
  }, [isInitCompleted, searchQuery]);

  return { searchTasks, isSearching };
};

export default useSearchTasks;
