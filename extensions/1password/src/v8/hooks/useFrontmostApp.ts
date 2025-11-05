import { getFrontmostApplication } from "@raycast/api";
import { useEffect, useState } from "react";

type FrontmostAppModel = {
  name?: string;
  icon?: { fileIcon: string };
};

export function useFrontmostApp(isEnabled = false): FrontmostAppModel {
  const [app, setApp] = useState<FrontmostAppModel>({});

  useEffect(() => {
    if (!isEnabled) return;

    const fetchFrontmostApp = async () => {
      try {
        const frontApp = await getFrontmostApplication();

        setApp({
          name: frontApp.name,
          icon: frontApp.path ? { fileIcon: frontApp.path } : undefined,
        });
      } catch {
        setApp({});
      }
    };

    fetchFrontmostApp();
  }, [isEnabled]);

  return app;
}
