import { useState } from "react";
import useDebouncedCallback from "./useDebouncedCallback";

const useRefreshList = () => {
  const [refreshPoint, setRefreshPoint] = useState(new Date().getTime());

  const refresh = useDebouncedCallback(
    () => {
      setRefreshPoint(new Date().getTime());
    },
    200,
    []
  );

  return { refreshPoint, refresh };
};

export default useRefreshList;
