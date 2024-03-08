import { Detail } from "@raycast/api";
import { FC, useEffect, useState } from "react";
import { decode } from "../utils/base64";
import { Paper } from "../types";
import { Actions } from "../components/Actions";

type ReadModeProps = {
  paper: Paper;
  category: string;
  index: number;
};

export const ReadMode: FC<ReadModeProps> = ({ paper, category, index }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [markdown, setMarkdown] = useState<string>("");

  useEffect(() => {
    setMarkdown(decode(paper.content));
    setIsLoading(false);
  }, []);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={paper.name}
      actions={<Actions mode="read" paper={paper} category={category} index={index} />}
    />
  );
};

ReadMode.displayName = "ReadMode";
