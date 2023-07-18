import { useEffect, useState } from "react";
import { showToast, Toast, LaunchProps } from "@raycast/api";

import { searchAssets } from "./lib/cloudinary";
import type { Asset } from "./types/asset";

import ViewResources from "./components/ViewResources";

interface Arguments {
  tag?: string;
  query?: string;
}

export default function main(props: LaunchProps<{ arguments: Arguments }>) {
  const [assets, setAssets] = useState<Array<Asset>>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async function run() {
      if (typeof props?.arguments?.tag !== "string" && typeof props?.arguments?.query !== "string") {
        return;
      }

      setLoading(true);

      try {
        const resources = await searchAssets({
          query: props.arguments.query,
          tag: props.arguments.tag,
        });
        setAssets(resources as Array<Asset>);
      } catch (e) {
        displayError("Search Error");
      }

      setLoading(false);
    })();
  }, []);

  /**
   * displayError
   */

  function displayError(message: string) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: message,
    });
  }

  return <ViewResources resources={assets} isLoading={loading} />;
}
