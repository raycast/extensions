import { FunctionConfiguration, LambdaClient, ListFunctionsCommand } from "@aws-sdk/client-lambda";
import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown from "./util/aws-profile-dropdown";

export default function Lambda() {
  const { data: functions, error, isLoading, revalidate } = useCachedPromise(fetchFunctions);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter functions by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        functions?.map((func) => <LambdaFunction key={func.FunctionName} func={func} />)
      )}
    </List>
  );
}

function LambdaFunction({ func }: { func: FunctionConfiguration }) {
  return (
    <List.Item
      icon="lambda.png"
      title={func.FunctionName || ""}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={`https://${process.env.AWS_REGION}.console.aws.amazon.com/lambda/home?region=${process.env.AWS_REGION}#/functions/${func.FunctionName}?tab=monitoring`}
          />
          <Action.CopyToClipboard title="Copy ARN" content={func.FunctionArn || ""} />
          <Action.CopyToClipboard title="Copy Name" content={func.FunctionName || ""} />
        </ActionPanel>
      }
      accessories={[
        { date: func.LastModified ? new Date(func.LastModified) : undefined },
        { icon: getRuntimeIcon(func.Runtime), tooltip: func.Runtime || "" },
      ]}
    />
  );
}

async function fetchFunctions(
  nextMarker?: string,
  functions?: FunctionConfiguration[]
): Promise<FunctionConfiguration[]> {
  const { NextMarker, Functions } = await new LambdaClient({}).send(new ListFunctionsCommand({ Marker: nextMarker }));

  const combinedFunctions = [...(functions || []), ...(Functions || [])];

  if (NextMarker) {
    return fetchFunctions(NextMarker, combinedFunctions);
  }

  return combinedFunctions;
}

const getRuntimeIcon = (runtime: FunctionConfiguration["Runtime"]) => {
  if (!runtime) {
    return Icon.QuestionMark;
  }

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
