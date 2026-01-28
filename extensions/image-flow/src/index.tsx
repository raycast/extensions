import { Detail } from "@raycast/api";
import React, { useEffect, useRef, useState } from "react";
import { Input, WorkflowAlias } from "./types";
import { getImages } from "./supports/image";
import { getWorkflowConfigs } from "./supports/workflow";
import { createMarkdownLogger, createWorkflow } from "./workflow";
import { showError } from "./supports/error";
import { usePromise } from "@raycast/utils";

type Props = {
  arguments: {
    workflow?: WorkflowAlias;
  };
};

export default function Index(props: Props) {
  const [markdown, setMarkdown] = useState("");
  const hasRun = useRef(false);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    if (error) {
      showError(error);
    }
  }, [error]);

  usePromise(async () => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;
    await run(setMarkdown, setError, props.arguments.workflow);
  }, []);

  return <Detail markdown={markdown} />;
}

async function run(
  setMarkdown: React.Dispatch<React.SetStateAction<string>>,
  setError: React.Dispatch<React.SetStateAction<Error | undefined>>,
  workflowAlias?: WorkflowAlias,
): Promise<string> {
  try {
    const images = await getImages();
    const configs = await getWorkflowConfigs();
    const workflowName = workflowAlias || ("default" as WorkflowAlias);
    const workflowNodes = configs.workflows[workflowName];
    const logger = createMarkdownLogger(workflowNodes, setMarkdown);
    const workflow = await createWorkflow(configs, workflowNodes, logger);

    for (const image of images) {
      await workflow.run(image as Input);
    }
  } catch (e) {
    setError(e instanceof Error ? e : new Error("An error occurred"));
  }

  return "";
}
