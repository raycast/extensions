import type { GoveeNameMapping } from "@/types";

import useLocalStorage from "@/hooks/useLocalStorage";

const useNameMapping = () => {
  const { data, setData } = useLocalStorage<GoveeNameMapping>("nameMapping", {});

  const getName = (deviceId: string) => (data ? data[deviceId] : null);
  const setName = (deviceId: string, name: string | null) => {
    if (!name) {
      setData((data) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [deviceId]: _, ...rest } = data;
        return rest;
      });
      return;
    }
    setData((data) => ({ ...data, [deviceId]: name }));
  };

  return {
    getName,
    setName,
  };
};

export default useNameMapping;
