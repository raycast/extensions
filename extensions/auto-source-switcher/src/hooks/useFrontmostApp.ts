import { Application, getFrontmostApplication } from "@raycast/api";
import { useEffect, useState } from "react";

export const useFrontmostApp = () => {
  const [frontmostApp, setFrontmostApp] = useState<Application | null>(null);

  useEffect(() => {
    async function getFrontmostApp() {
      const app = await getFrontmostApplication();
      setFrontmostApp(app);
    }

    getFrontmostApp();
  }, []);

  return frontmostApp;
};
