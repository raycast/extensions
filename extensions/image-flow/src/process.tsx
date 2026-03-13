import { Detail } from "@raycast/api";
import { Image, Input, WorkflowAlias, WorkflowConfigs } from "./types";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import { showError } from "./supports/error";
import { usePromise } from "@raycast/utils";
import { getWorkflowConfigs } from "./supports/workflow";
import { createMarkdownLogger, createWorkflow } from "./workflow";

export function Process({
  workflowName,
  imageLoader,
  action,
}: {
  workflowName: WorkflowAlias;
  imageLoader: () => Promise<Image[]>;
  action?: ReactNode;
}) {
  const [markdown, setMarkdown] = useState("");
  const [error, setError] = useState<Error>();
  const hasRun = useRef(false);

  useEffect(() => {
    if (error) {
      showError(error);

      setMarkdown(`❌ Oops ${error.message}`);
    }
  }, [error]);

  usePromise(async () => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;

    try {
      const configs = await getWorkflowConfigs();
      const images = await imageLoader();

      if (images.length === 0) {
        setError(new Error("No images found"));
      } else {
        await processor(images, configs, workflowName, setMarkdown);
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error("An error occurred"));
    }
  }, []);

  return <Detail markdown={markdown} actions={action} />;
}

async function processor(
  images: Image[],
  configs: WorkflowConfigs,
  workflowName: WorkflowAlias,
  setMarkdown: React.Dispatch<React.SetStateAction<string>>,
): Promise<string> {
  const workflowNodes = configs.workflows[workflowName];
  if (!workflowNodes) {
    throw Error(`Workflow [${workflowName}] not found`);
  }

  const logger = createMarkdownLogger(workflowNodes, setMarkdown);
  const workflow = await createWorkflow(configs, workflowNodes, logger);

  for (const image of images) {
    await workflow.run(image as Input);
  }

  return "";
}
