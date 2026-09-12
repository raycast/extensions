import { getFrontmostApplication } from "@raycast/api";
import { useEffect, useState } from "react";

export default function useFrontmostApplicationName() {
  const [currentApplication, setCurrentApplication] = useState<string | undefined>(undefined);

  useEffect(() => {
    void getFrontmostApplication()
      .then((application) => setCurrentApplication(application.name))
      .catch(() => setCurrentApplication(undefined));
  }, []);

  return currentApplication;
}
