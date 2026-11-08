import { useEffect } from "react";
import { AppBrowser } from "./components/AppBrowser";
import { applicationStore } from "./services/applications";

export default function Command() {
  useEffect(() => {
    void applicationStore.refresh();
  }, []);
  return <AppBrowser />;
}
