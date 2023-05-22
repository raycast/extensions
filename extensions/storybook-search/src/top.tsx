import { LocalStorage, useNavigation } from "@raycast/api";
import { useEffect } from "react";
import { BASE_URL_STORAGE_KEY } from "./constants";
import Search from "./search";
import { Config } from "./types";
import EditConfig from "./edit-config";

const Top = () => {
  const { push } = useNavigation();

  const init = async () => {
    const baseUrl = await LocalStorage.getItem(BASE_URL_STORAGE_KEY);

    if (!baseUrl) {
      push(<EditConfig />);
      return;
    } else {
      const config: Config = { baseUrl: baseUrl.toString() };
      push(<Search config={config} />);
    }
  };

  useEffect(() => {
    init();
  }, []);

  return null;
};

export default Top;
