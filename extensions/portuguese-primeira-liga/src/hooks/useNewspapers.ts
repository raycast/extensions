import { useEffect, useState } from "react";
import { getNewspapers } from "../api";
import { Newspaper } from "../types";
import { Cache } from "@raycast/api";

const cache = new Cache();

const useNewspapers = () => {
  const [newspapers, setNewspapers] = useState<Newspaper[]>();

  useEffect(() => {
    const currentDate = new Date();
    const dayMonth = `${currentDate.getDate()}-${currentDate.getMonth()}`;

    const cachedData = cache.get(`newspapers-${dayMonth}`);
    if (cachedData) {
      const cachedNewspapers = JSON.parse(cachedData);
      setNewspapers(cachedNewspapers);
    } else {
      getNewspapers().then((data) => {
        setNewspapers(data);
        cache.set(`newspapers-${dayMonth}`, JSON.stringify(data));
      });
    }
  }, []);

  return newspapers;
};

export default useNewspapers;
