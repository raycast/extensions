import { useEffect } from "react"
import { LocalStorage } from "@raycast/api";
import { Library } from "../types";
import { useCachedState } from "@raycast/utils";

const useLibConfig = () => {
  const [lib, setLib] = useCachedState<string | undefined>('lib');
  // useEffect(() => {
  //   LocalStorage.getItem<Library>('lib').then(lib => {
  //     if (!lib) return;
  //     setTimeout(() => {
  //       setLib(lib);
  //     });
  //   })
  // }, []);
  return [lib, setLib];
}

export default useLibConfig;
