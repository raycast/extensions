import { useEffect, useState } from "react";
import { Action, ActionPanel, Form, LaunchProps } from "@raycast/api";
import ResultView from "./components/ResultView";
import { DEFAULT_AGENT } from "./lib/constants";
import { useAgents, useAI } from "./lib/hooks";

export default function Ask(props: LaunchProps) {
  const { agents } = useAgents();
  const [isResult, setResult] = useState(false);
  const [agentKey, setAgentKey] = useState(props.launchContext?.agent ?? DEFAULT_AGENT.name);
  const [prompt, setPrompt] = useState("");

  const { agent, response, getAIResponse, isLoading } = useAI(agentKey);

  const handleSubmit = () => {
    setResult(true);
    getAIResponse(prompt);
  };

  useEffect(() => {
    const contextAgent = props.launchContext?.agent;
    if (contextAgent && agents?.find((item) => item.name === contextAgent)) {
      setAgentKey(contextAgent);
    }
  }, [props.launchContext?.agent, setAgentKey, agents]);

  return isResult ? (
    <ResultView agent={agent} user_input={prompt} response={response} isLoading={isLoading} />
  ) : (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Prompt" placeholder="Ask anything" id="prompt" value={prompt} onChange={setPrompt} />
      <Form.Dropdown title="Agent" id="agent" value={agentKey} onChange={setAgentKey}>
        {agents?.map((agent) => (
          <Form.Dropdown.Item key={agent.name} value={agent.name} title={agent.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
