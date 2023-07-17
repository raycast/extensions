import { Detail } from "@raycast/api";
import { useMemo } from "react";
import { Meme } from "../types";

export default function MemePreview({ title, url }: Meme) {
  const markdown = useMemo(() => `![${title} preview](${url})`, [url]);

  return <Detail markdown={markdown} />;
}
