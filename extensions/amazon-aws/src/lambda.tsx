import { ActionPanel, List, Detail, Action, Icon } from "@raycast/api";
import * as AWS from "aws-sdk";
import setupAws from "./util/setupAws";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown from "./util/aws-profile-dropdown";

const preferences = setupAws();

export default function Lambda() {
  const { data: functions, error, isLoading, revalidate } = useCachedPromise(fetchFunctions);

  if (error) {
    return <Detail markdown="Something went wrong. Try again!" />;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter functions by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {functions?.map((func) => (
        <LambdaFunction key={func.FunctionName} func={func} />
      ))}
    </List>
  );
}

function LambdaFunction({ func }: { func: AWS.Lambda.FunctionConfiguration }) {
  return (
    <List.Item
      icon="lambda.png"
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
    return "lambda-runtime-icons/nodejs.png";
  } else if (runtime.includes("python")) {
    return "lambda-runtime-icons/python.png";
  } else if (runtime.includes("java")) {
    return "lambda-runtime-icons/java.png";
  } else if (runtime.includes("dotnet")) {
    return "lambda-runtime-icons/dotnet.png";
  } else if (runtime.includes("go")) {
    return "lambda-runtime-icons/go.png";
  } else if (runtime.includes("ruby")) {
    return "lambda-runtime-icons/ruby.png";
  } else {
    return Icon.ComputerChip;
  }
};
