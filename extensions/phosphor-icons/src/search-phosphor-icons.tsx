import { getPreferenceValues } from "@raycast/api";
import IconGrid from "./components/IconGrid";
import IconList from "./components/IconList";
import { useEffect, useState } from "react";
import { setup } from "./setup";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const preferences = getPreferenceValues();

  useEffect(() => {
    Promise.resolve(setup()).then(() => setIsLoading(false));
  }, []);

  if (preferences["view"] === "list") {
    return <IconList isLoading={isLoading} />;
  }

  return <IconGrid columns={parseInt(preferences["grid-columns"])} isLoading={isLoading} />;
}
