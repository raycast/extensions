import { ActionPanel, List, Detail, Action, Icon } from "@raycast/api";
import * as AWS from "aws-sdk";
import setupAws from "./util/setupAws";
import { useCachedPromise } from "@raycast/utils";

const preferences = setupAws();

export default function ListLambdaFunctions() {
  const { data: functions, error, isLoading } = useCachedPromise(fetchFunctions);

  if (error) {
    return <Detail markdown="Something went wrong. Try again!" />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter functions by name...">
      {functions?.map((func) => (
        <LambdaFunction key={func.FunctionName} func={func} />
      ))}
    </List>
  );
}

function LambdaFunction({ func }: { func: AWS.Lambda.FunctionConfiguration }) {
  return (
    <List.Item
      icon="lambda-icon.png"
      title={func.FunctionName || ""}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={`https://${preferences.region}.console.aws.amazon.com/lambda/home?region=${preferences.region}#/functions/${func.FunctionName}?tab=monitoring`}
          />
          <Action.CopyToClipboard title="Copy ARN" content={func.FunctionArn || ""} />
          <Action.CopyToClipboard title="Copy Name" content={func.FunctionName || ""} />
        </ActionPanel>
      }
      accessories={[
        { date: func.LastModified ? new Date(func.LastModified) : undefined },
        { icon: getRuntimeIcon(func.Runtime || ""), tooltip: func.Runtime || "" },
      ]}
    />
  );
}

async function fetchFunctions(
  nextMarker?: string,
  functions?: AWS.Lambda.FunctionList
): Promise<AWS.Lambda.FunctionList> {
  const { NextMarker, Functions } = await new AWS.Lambda().listFunctions({ Marker: nextMarker }).promise();

  const combinedFunctions = [...(functions || []), ...(Functions || [])];

  if (NextMarker) {
    return fetchFunctions(NextMarker, combinedFunctions);
  }

  return combinedFunctions;
}

const getRuntimeIcon = (runtime: AWS.Lambda.Runtime) => {
  if (runtime.includes("node")) {
    return "runtimes/nodejs.png";
  } else if (runtime.includes("python")) {
    return "runtimes/python.png";
  } else if (runtime.includes("java")) {
    return "runtimes/java.png";
  } else if (runtime.includes("dotnet")) {
    return "runtimes/dotnet.png";
  } else if (runtime.includes("go")) {
    return "runtimes/go.png";
  } else if (runtime.includes("ruby")) {
    return "runtimes/ruby.png";
  } else {
    return Icon.ComputerChip;
  }
};
