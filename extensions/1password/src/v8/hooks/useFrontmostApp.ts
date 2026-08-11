import { getFrontmostApplication } from "@raycast/api";
import { useEffect, useState } from "react";

type FrontmostAppModel = {
  icon?: { fileIcon: string };
  name?: string;
};

export function useFrontmostApp(isEnabled = false): FrontmostAppModel {
  const [app, setApp] = useState<FrontmostAppModel>({});

  useEffect(() => {
    if (!isEnabled) return;

    const fetchFrontmostApp = async () => {
      try {
        const frontApp = await getFrontmostApplication();

        setApp({
          icon: frontApp.path ? { fileIcon: frontApp.path } : undefined,
          name: frontApp.name,
        });
      } catch {
        setApp({});
      }
    };

    fetchFrontmostApp();
  }, [isEnabled]);

  return app;
}
