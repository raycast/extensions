import { ActionPanel, List, Action, Icon, Color, showToast, Toast, getPreferenceValues, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import axios from "axios";

interface Preferences {
  accessToken: string;
  workspace: string;
  repositorySlug: string;
  testStepNumber: number;
}

interface Pipeline {
  description: string;
  uuid: string;
  target: {
    ref_name: string;
    commit: {
      hash: string;
    };
  };
  creator: {
    display_name: string;
  };
  state: {
    name: string;
    result: {
      name: string;
    };
  };
  build_number: number;
}

interface TestCase {
  uuid: string;
  fully_qualified_name: string;
  status: string;
}

interface TestCaseReason {
  stack_trace: string;
}

interface Error {
  message: string;
}

const api = axios.create({
  baseURL: "https://api.bitbucket.org/2.0/repositories",
});

const fetchPipelines = async (workspace: string, repositorySlug: string, accessToken: string) => {
  const response = await api.get(`/${workspace}/${repositorySlug}/pipelines/?page=1&pagelen=5&sort=-created_on`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data.values;
};

const fetchCommitMessage = async (
  workspace: string,
  repositorySlug: string,
  commitHash: string,
  accessToken: string,
) => {
  const response = await api.get(`/${workspace}/${repositorySlug}/commit/${commitHash}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data.message;
};

const fetchPipelineSteps = async (
  workspace: string,
  repositorySlug: string,
  pipelineUuid: string,
  accessToken: string,
) => {
  const response = await api.get(`/${workspace}/${repositorySlug}/pipelines/${pipelineUuid}/steps`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data.values;
};

const fetchTestCases = async (
  workspace: string,
  repositorySlug: string,
  pipelineUuid: string,
  stepUuid: string,
  accessToken: string,
) => {
  const response = await api.get(
    `/${workspace}/${repositorySlug}/pipelines/${pipelineUuid}/steps/${stepUuid}/test_reports/test_cases`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  return response.data.values;
};

const fetchTestCaseReason = async (
  workspace: string,
  repositorySlug: string,
  pipelineUuid: string,
  stepUuid: string,
  testCaseUuid: string,
  accessToken: string,
) => {
  const response = await api.get(
    `/${workspace}/${repositorySlug}/pipelines/${pipelineUuid}/steps/${stepUuid}/test_reports/test_cases/${testCaseUuid}/test_case_reasons`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  return response.data;
};

const getStatusIcon = (pipeline: Pipeline) => {
  switch (pipeline.state.name) {
    case "COMPLETED":
      switch (pipeline.state.result.name) {
        case "SUCCESSFUL":
          return { source: Icon.Checkmark, tintColor: Color.Green };
        case "FAILED":
          return { source: Icon.Xmark, tintColor: Color.Red };
        default:
          return { source: Icon.CircleProgress, tintColor: Color.Yellow };
      }
    case "IN_PROGRESS":
      return { source: Icon.CircleProgress, tintColor: Color.Blue };
    default:
      return { source: Icon.CircleProgress };
  }
};

const usePipelines = (workspace: string, repositorySlug: string, accessToken: string) => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getPipelines = async () => {
      setLoading(true);
      try {
        const pipelines = await fetchPipelines(workspace, repositorySlug, accessToken);
        const pipelinesWithDescriptions = await Promise.all(
          pipelines.map(async (pipeline: Pipeline) => {
            try {
              const description = await fetchCommitMessage(
                workspace,
                repositorySlug,
                pipeline.target.commit.hash,
                accessToken,
              );
              return { ...pipeline, description };
            } catch {
              return { ...pipeline, description: "Error fetching commit details" };
            }
          }),
        );
        setPipelines(pipelinesWithDescriptions);
      } catch (error) {
        setError(error.message);
        showToast(Toast.Style.Failure, "Error fetching pipelines", error.message);
      } finally {
        setLoading(false);
      }
    };

    getPipelines();
  }, [workspace, repositorySlug, accessToken]);

  return { pipelines, loading, error };
};

const useTestCases = (
  workspace: string,
  repositorySlug: string,
  pipelineUuid: string,
  accessToken: string,
  testStepNumber: number,
) => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepUuid, setStepUuid] = useState<string | null>(null);

  useEffect(() => {
    const getTestCases = async () => {
      setLoading(true);
      try {
        const steps = await fetchPipelineSteps(workspace, repositorySlug, pipelineUuid, accessToken);
        const step = steps[testStepNumber - 1];
        setStepUuid(step.uuid);
        const testCases = await fetchTestCases(workspace, repositorySlug, pipelineUuid, step.uuid, accessToken);
        setTestCases(Object.values(testCases));
      } catch (error) {
        setError(error.message);
        showToast(Toast.Style.Failure, "Error fetching test results", error.message);
      } finally {
        setLoading(false);
      }
    };

    getTestCases();
  }, [workspace, repositorySlug, pipelineUuid, accessToken, testStepNumber]);

  return { testCases, loading, error, stepUuid };
};

const useTestCaseReason = (
  workspace: string,
  repositorySlug: string,
  pipelineUuid: string,
  stepUuid: string,
  testCaseUuid: string,
  accessToken: string,
) => {
  const [reason, setReason] = useState<TestCaseReason | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getTestCaseReason = async () => {
      setLoading(true);
      try {
        const reason = await fetchTestCaseReason(
          workspace,
          repositorySlug,
          pipelineUuid,
          stepUuid,
          testCaseUuid,
          accessToken,
        );
        setReason(reason);
      } catch (error) {
        setError(error.message);
        showToast(Toast.Style.Failure, "Error fetching test case reason", error.message);
      } finally {
        setLoading(false);
      }
    };

    getTestCaseReason();
  }, [workspace, repositorySlug, pipelineUuid, stepUuid, testCaseUuid, accessToken]);

  return { reason, loading, error };
};

const TestCaseReason = ({
  pipelineUuid,
  stepUuid,
  testCaseUuid,
}: {
  pipelineUuid: string;
  stepUuid: string;
  testCaseUuid: string;
}) => {
  const preferences = getPreferenceValues<Preferences>();
  const { reason, loading, error } = useTestCaseReason(
    preferences.workspace,
    preferences.repositorySlug,
    pipelineUuid,
    stepUuid,
    testCaseUuid,
    preferences.accessToken,
  );

  if (loading) {
    return (
      <List>
        <List.Item title="Loading..." icon={Icon.Clock} />
      </List>
    );
  }

  if (error) {
    showToast(Toast.Style.Failure, "Error", error);
    return null;
  }

  if (!reason && !loading) {
    showToast(Toast.Style.Success, "No Test Failure Reasons.");
    return null;
  }

  return (
    <Detail
      // replace \n in string with actual new lines
      markdown={reason?.stack_trace.replace(/\\n/g, "\n")}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Stack Trace" content={reason?.stack_trace ?? ''} />
        </ActionPanel>
      }
    />
  );
};

const TestCases = ({ pipelineUuid }: { pipelineUuid: string }) => {
  const preferences = getPreferenceValues<Preferences>();
  const { testCases, loading, error, stepUuid } = useTestCases(
    preferences.workspace,
    preferences.repositorySlug,
    pipelineUuid,
    preferences.accessToken,
    preferences.testStepNumber,
  );

  if (loading) {
    return (
      <List>
        <List.Item title="Loading..." icon={Icon.Clock} />
      </List>
    );
  }

  if (error) {
    showToast(Toast.Style.Failure, "Error", error);
    return null;
  }

  if (testCases.length === 0 && !loading) {
    showToast(Toast.Style.Success, "No Test Failures.");
    return null;
  }

  return (
    <List>
      {testCases.map((testCase) => (
        <List.Item
          key={testCase.uuid}
          title={testCase.fully_qualified_name}
          subtitle={testCase.status}
          icon={{ source: Icon.Xmark, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action.Push
                title="Test Case Reason"
                icon={Icon.Info}
                target={<TestCaseReason pipelineUuid={pipelineUuid} stepUuid={stepUuid ?? ''} testCaseUuid={testCase.uuid} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { pipelines, loading, error } = usePipelines(
    preferences.workspace,
    preferences.repositorySlug,
    preferences.accessToken,
  );

  if (loading) {
    return (
      <List>
        <List.Item title="Loading..." subtitle="Fetching pipelines" icon={Icon.Clock} />
      </List>
    );
  }

  if (error) {
    showToast(Toast.Style.Failure, "Error", error);
    return null;
  }

  if (pipelines.length === 0 && !loading) {
    return (
      <List>
        <List.Item
          title="No Pipelines Found"
          subtitle="No pipelines found for the provided details."
          icon={Icon.Xmark}
        />
      </List>
    );
  }

  return (
    <List>
      {pipelines.map((pipeline) => (
        <List.Item
          key={pipeline.uuid}
          icon={getStatusIcon(pipeline)}
          title={`${pipeline.description}`}
          subtitle={`${pipeline.target.ref_name}`}
          accessories={[{ text: `${pipeline.creator.display_name}` }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Pipeline"
                url={`https://bitbucket.org/siberventures/sku.io/pipelines/results/${pipeline.build_number}`}
              />
              {pipeline.state.name === "IN_PROGRESS" && (
                <Action
                  title="Stop Pipeline"
                  icon={Icon.Stop}
                  style={Action.Style.Destructive}
                  onAction={() => showToast(Toast.Style.Failure, "Not implemented yet")}
                />
              )}
              {pipeline.state.name === "COMPLETED" && (
                <Action.Push
                  title="Test Results"
                  icon={Icon.Document}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                  target={<TestCases pipelineUuid={pipeline.uuid} />}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
