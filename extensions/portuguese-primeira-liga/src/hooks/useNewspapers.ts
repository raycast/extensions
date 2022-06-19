import { useEffect, useState } from "react";
import { getNewspapers } from "../api";
import { Newspaper } from "../types";

const useNewspapers = () => {
  const [newspapers, setNewspapers] = useState<Newspaper[]>();

  useEffect(() => {
    setNewspapers(undefined);

    getNewspapers().then((data) => {
      setNewspapers(data);
    });
  }, []);

  return newspapers;
};

export default useNewspapers;
