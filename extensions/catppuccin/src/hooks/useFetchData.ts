import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { fetchData } from "../utils/data.util";
import { PortsYaml, UserStylesYaml } from "../types";

function isPortsYaml(data: unknown): data is PortsYaml {
  return data && typeof data === "object" && "ports" in data;
}

function isUserStylesYaml(data: unknown): data is UserStylesYaml {
  return data && typeof data === "object" && "userstyles" in data;
}

export function useFetchData<T>(dataKey: "ports" | "styles") {
  const [data, setData] = useState<Record<string, T>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const dataJSON = await fetchData(dataKey);
        if (dataKey === "ports" && isPortsYaml(dataJSON)) {
          setData(dataJSON.ports as Record<string, T>);
        } else if (dataKey === "styles" && isUserStylesYaml(dataJSON)) {
          setData(dataJSON.userstyles as Record<string, T>);
        } else {
          throw new Error("Invalid data format");
        }
      } catch (error) {
        await showToast(Toast.Style.Failure, "Failed to fetch data", (error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [dataKey]);

  return { data, isLoading, setData };
}
