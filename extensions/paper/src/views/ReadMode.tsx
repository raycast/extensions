import { Detail } from "@raycast/api";
import { FC, useEffect, useState } from "react";
import { decode } from "../utils/base64";
import { Base64 } from "../types";

type ReadModeProps = {
  content: Base64;
  paperName: string;
};

export const ReadMode: FC<ReadModeProps> = ({ content, paperName }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [markdown, setMarkdown] = useState<string>("");

  useEffect(() => {
    setMarkdown(decode(content));
    setIsLoading(false);
  }, []);

  return <Detail isLoading={isLoading} markdown={markdown} navigationTitle={paperName} />;
};

ReadMode.displayName = "ReadMode";
