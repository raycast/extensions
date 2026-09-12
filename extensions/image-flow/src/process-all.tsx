import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getWorkflowConfigs } from "./supports/workflow";
import { getFiles } from "./supports/image";
import { Image } from "./types";
import { Process } from "./process";

export default function Index() {
  const { push, pop } = useNavigation();
  const [markdown, setMarkdown] = useState<string>("");
  const [workflowAlias, setWorkflowAlias] = useState<string[]>([]);
  const [inputImage, setInputImage] = useState<Image>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    if (error) {
      setMarkdown(`❌ Error: ${error.message}`);
    }
  }, [error]);

  const imageLoader = async () => {
    if (inputImage) {
      return [inputImage] as Image[];
    }

    return [];
  };

  const { isLoading } = usePromise(async () => {
    try {
      setWorkflowAlias(Object.keys((await getWorkflowConfigs()).workflows));
      const files = await getFiles();
      if (files.length == 0) {
        setError(new Error("No files found"));
        return;
      }

      setMarkdown(`✔︎ Selected file \`${files[0].value}\`\n\nPlease select a workflow to run on the file.`);
      setInputImage(files[0]);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("An error occurred"));
    }
  }, []);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Process with specific workflow"
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Submenu title="Select Workflow">
            <ActionPanel.Section key="workflow" title="Select which workflow to run">
              {workflowAlias.map((alias, index) => (
                <Action
                  key={index}
                  title={alias}
                  onAction={() =>
                    push(
                      <Process
                        workflowName={alias}
                        action={
                          <ActionPanel>
                            <Action title="Pop" onAction={pop} />
                          </ActionPanel>
                        }
                        imageLoader={imageLoader}
                      />,
                    )
                  }
                />
              ))}
            </ActionPanel.Section>
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  );
}
