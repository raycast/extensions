import { Action, ActionPanel, Detail, LaunchProps, Toast, showToast } from "@raycast/api";
import { useState, useEffect, Fragment } from "react";
import { query } from "./utils/fastGPT";
import { FastGPTResponse, ReferencesItem } from "./interfaces/fastGPTResponse";

interface AskArguments {
  query: string;
}
const Ask = (props: LaunchProps<{ arguments: AskArguments }>) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [response, setResponse] = useState<string | null>(null);
  const [references, setReferences] = useState<ReferencesItem[] | null>(null);

  useEffect(() => {
    const init = async () => {
      let fastGPTResponse: FastGPTResponse;

      try {
        fastGPTResponse = await query(props.arguments.query, true);
      } catch (err) {
        showToast({
          title: "Error",
          message: (err as Error).message,
          style: Toast.Style.Failure,
        });
        return;
      } finally {
        setLoading(false);
      }
      setResponse(fastGPTResponse.data.output);
      if (fastGPTResponse.data.references) setReferences(fastGPTResponse.data.references);
    };
    init();
  }, []);

  return (
    <>
      <Detail
        isLoading={loading}
        markdown={response}
        actions={
          <ActionPanel title="Actions">
            {response && <Action.CopyToClipboard title="Copy Response" content={response} />}
            {references && (
              <Action.CopyToClipboard
                title="Copy References"
                content={references.map((reference) => reference.url).join(", ")}
              />
            )}
          </ActionPanel>
        }
        metadata={
          <Detail.Metadata>
            {references &&
              references.map((reference, index) => (
                <Fragment key={index}>
                  <Detail.Metadata.Link
                    title={`[${index + 1}] ${reference.title}`}
                    target={reference.url}
                    text={reference.snippet}
                  />
                </Fragment>
              ))}
          </Detail.Metadata>
        }
      />
    </>
  );
};

export default Ask;
