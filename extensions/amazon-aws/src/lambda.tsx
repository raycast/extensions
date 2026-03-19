import { FunctionConfiguration, ListFunctionsCommand } from "@aws-sdk/client-lambda";
import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { runAppleScript, useCachedPromise } from "@raycast/utils";
import CloudwatchLogStreams from "./components/cloudwatch/CloudwatchLogStreams";
import { AwsAction } from "./components/common/action";
import InvokeLambdaFunction from "./components/lambda/InvokeLambdaFunction";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { getAWSErrorMessage } from "./errors";
import { getLambdaClient } from "./services/clients/lambda";
import { isReadyToFetch, resourceToConsoleLink } from "./util";

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
  const AWS_REGION = process.env.AWS_REGION;
  const logGroupName = func.LoggingConfig?.LogGroup ?? `/aws/lambda/${func.FunctionName}`;

  // CloudWatch Logs Live Tail URL (opens console with live tailing)
  const liveTailUrl = `https://${AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#logsV2:live-tail$3FlogGroupArns$3D${encodeURIComponent(`arn:aws:logs:${AWS_REGION}:*:log-group:${logGroupName}`)}`;

  // AWS CLI command to tail logs in terminal
  const tailCommand = `aws logs tail "${logGroupName}" --follow`;

  return (
    <List.Item
      key={func.FunctionArn}
      icon={"aws-icons/lam.png"}
      title={func.FunctionName || ""}
      actions={
        <ActionPanel>
          <AwsAction.Console url={resourceToConsoleLink(func.FunctionName, "AWS::Lambda::Function")} />
          <Action.OpenInBrowser
            icon={Icon.Document}
            title="Open CloudWatch Log Group"
            url={resourceToConsoleLink(logGroupName, "AWS::Logs::LogGroup")}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
          <Action.OpenInBrowser
            icon={Icon.Livestream}
            title="Tail Logs in Console"
            url={liveTailUrl}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          />
          <Action.Push
            title={"View Log Streams"}
            icon={Icon.Eye}
            shortcut={{ modifiers: ["opt"], key: "l" }}
            target={<CloudwatchLogStreams logGroupName={logGroupName}></CloudwatchLogStreams>}
          />
          <Action.Push
            title="Invoke Function"
            icon={Icon.Bolt}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            target={<InvokeLambdaFunction functionName={func.FunctionName || ""} />}
          />
          <Action
            title="Run Tail Command in Terminal"
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            onAction={async () => {
              const escapedCommand = tailCommand.replace(/"/g, '\\"');
              const appleScript = `
                tell application "Terminal"
                  do script "${escapedCommand}"
                  activate
                end tell
              `;
              try {
                await runAppleScript(appleScript);
                await showToast({ style: Toast.Style.Success, title: "Opened in Terminal" });
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to open Terminal",
                  message: getAWSErrorMessage(error),
                });
              }
            }}
          />
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy Function ARN" content={func.FunctionArn || ""} />
            <Action.CopyToClipboard title="Copy Function Name" content={func.FunctionName || ""} />
            <Action.CopyToClipboard
              title="Copy Tail Command"
              content={tailCommand}
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <AwsAction.ExportResponse response={func} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[{ text: func.Runtime || "" }, { icon: getRuntimeIcon(func.Runtime) }]}
    />
  );
}

async function fetchFunctions(
  nextMarker?: string,
  functions?: FunctionConfiguration[],
): Promise<FunctionConfiguration[]> {
  if (!isReadyToFetch()) return [];
  const { NextMarker, Functions } = await getLambdaClient().send(new ListFunctionsCommand({ Marker: nextMarker }));

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
