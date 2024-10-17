import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

const useDBLinkHook = () => {
  const [linked, setLinked] = useState<boolean>(true);

  const getLinked = async () => {
    const linked = await LocalStorage.getItem("linked");
    if (linked === false || linked === undefined) {
      setLinked(false);
    } else {
      setLinked(true);
    }
  };

  useEffect(() => {
    getLinked();
  }, []);

  return { linked };
};

export default useDBLinkHook;
