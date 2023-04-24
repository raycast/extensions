import { useEffect, useState } from "react";
import { getUserLeagues } from "../api";

interface UserLeagues {
  id: number;
  name: string;
  entry_rank: number;
}

const useUserLeagues = (id: string) => {
  const [userLeagues, setUserLeagues] = useState<UserLeagues[] | null>(null);

  useEffect(() => {
    if (id) {
      getUserLeagues(id).then((data) => setUserLeagues(data));
    }
  }, [id]);

  return userLeagues;
};

export default useUserLeagues;
