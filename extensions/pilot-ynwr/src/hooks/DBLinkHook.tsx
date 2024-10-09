import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

const useDBLinkHook = () => {
  const [linked, setLinked] = useState<boolean | null>(null);

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
