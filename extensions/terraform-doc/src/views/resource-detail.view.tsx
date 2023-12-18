import { useEffect } from "react";
import fetch from "node-fetch";
import { Detail, environment } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { parseRawDoc } from "../lib/resource-detail";

export default function ResourceDetailView(props: { url: string }) {
  const [state, setState] = useCachedState<string | undefined>(
    `${props.url}`,
    undefined,
    {
      cacheNamespace: `${environment.extensionName}-resource-details`,
    },
  );
  useEffect(() => {
    async function updateResouceDetails() {
      try {
        if (state === undefined) {
          const markdown = await (await fetch(props.url)).text();
          setState(parseRawDoc(markdown));
        }
      } catch (err) {
        throw new Error(`${err}`);
      }
    }
    updateResouceDetails();
  }, []);
  return <Detail markdown={state ?? ""} />;
}
