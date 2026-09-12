import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import fallbackBoilerplate from "./fallback-boilerplates";
import { Boilerplate } from "./types";

export function useBoilerplates() {
  const { isLoading, data, error } = useFetch<Boilerplate[]>("https://wpbones.com/api/boilerplates");

  const [boilerplates, setBoilerplates] = useState<Boilerplate[]>();

  useEffect(() => {
    if (data) {
      setBoilerplates(data);
    }

    if (error) {
      setBoilerplates(fallbackBoilerplate);
    }
  }, [data, error]);

  return { isLoading, boilerplates, error };
}
