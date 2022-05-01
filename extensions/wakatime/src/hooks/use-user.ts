import { useEffect, useState } from "react";

import { getUser } from "../utils";

export function useUser() {
  const [data, setData] = useState<WakaTime.User>();
  useEffect(() => void getUser().then(setData), []);

  return data;
}
