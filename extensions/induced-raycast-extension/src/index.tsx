import got from "got";
import { useEffect, useState } from "react";
import { useCachedState } from "@raycast/utils";
import { Detail, LocalStorage, Clipboard, Form, ActionPanel, Action } from "@raycast/api";

interface ApiKeySubmission {
  apikey: string;
}

interface PromptSubmission {
  prompt: string;
}

interface Step {
  thought: string;
  screenshot?: string;
}

export default function Command() {
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const [prompt, setPrompt] = useCachedState("prompt", "");
  const [sessionId, setSessionId] = useCachedState("sessionId", "");
  const [showSession, setShowSession] = useCachedState("showSession", false);
  const [steps, setSteps] = useCachedState<Step[]>("steps", []);
  const [status, setStatus] = useCachedState("status", "Running");

  useEffect(() => {
    LocalStorage.getItem("key").then((value) => {
      if (value) {
        console.log(value);
        setValue(value as string);
      }
    });
  }, []);

  useEffect(() => {
    const intervalId = setInterval(async () => {
      if (!sessionId || !showSession || status === "COMPLETED") return;

      const apiKey = await LocalStorage.getItem("key");
      console.log("fetching session", sessionId, showSession, apiKey);

      got
        .get(`https://api.induced.ai/api/v1/autonomous/${sessionId}`, {
          headers: { "x-api-key": apiKey as string },
        })
        .then((response) => {
          setSteps(JSON.parse(response.body).data.run.steps);
          setStatus(JSON.parse(response.body).data.run.status);
        })
        .catch((error) => {
          console.log(error);
        });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [sessionId, showSession]);

  function handlePromptSubmission(payload: PromptSubmission) {
    setIsLoading(true);
    setSteps([]);
    setStatus("INITIALISING");
    setShowSession(false);
    setSessionId("");
    got
      .post("https://api.induced.ai/api/v1/autonomous", {
        headers: { "x-api-key": value, "Content-Type": "application/json" },
        body: JSON.stringify({ task: payload.prompt }),
      })
      .then((response) => {
        setSessionId(JSON.parse(response.body).data.id);
        setPrompt(payload.prompt);
        setShowSession(true);
        setIsLoading(false);

        Clipboard.copy(`https://watch.induced.ai/watch/${JSON.parse(response.body).data.id}`);
      })
      .catch((error) => {
        setError(error.message);
        setIsLoading(false);
      });
  }

  function removeKey() {
    LocalStorage.removeItem("key");
    setValue("");
  }

  function handleApiKeySubmission(payload: ApiKeySubmission) {
    LocalStorage.setItem("key", payload.apikey);
    setValue(payload.apikey);
  }

  function toggleShowSession() {
    setShowSession(!showSession);
  }

  return (
    <>
      {showSession ? (
        <Detail
          isLoading={status !== "COMPLETED"}
          markdown={`
# ${prompt}

### Session ID:

${sessionId}

### Status:

${status}


## Thought Stream:

---

${steps.map((step: Step) => `${step.screenshot ? `![Screenshot](${step.screenshot})` : ""}${step.thought || ""}`).join(`\n\n---\n\n`)}
`}
          actions={
            <ActionPanel>
              <Action title="New Session" onAction={toggleShowSession} />
              <Action.OpenInBrowser title="Open In Browser" url={`https://watch.induced.ai/watch/${sessionId}`} />
              <Action.CopyToClipboard
                title="Copy Session URL"
                content={`https://watch.induced.ai/watch/${sessionId}`}
              />
              <Action.CopyToClipboard title="Copy Session ID" content={sessionId} />
            </ActionPanel>
          }
        />
      ) : value ? (
        <Form
          isLoading={isLoading}
          navigationTitle="Create Session"
          actions={
            <ActionPanel>
              <Action.SubmitForm title="Run Session" onSubmit={handlePromptSubmission} />
              <Action.OpenInBrowser
                url={sessionId ? `https://watch.induced.ai/watch/${sessionId}` : "https://browse.new"}
                title="Open Last Session"
              />
              <Action.OpenInBrowser url="https://browse.new" title="browse.new" />
              <Action.CreateQuicklink
                title="Install Quicklink"
                quicklink={{ link: `https://watch.induced.ai/watch/{SessionID}`, name: "Open Induced Stream" }}
              />
              <Action title="Clear API Key" onAction={removeKey} icon="" />
            </ActionPanel>
          }
          enableDrafts={true}
        >
          <Form.TextArea
            id="prompt"
            title="Your Prompt"
            info={"Enter the prompt you want to run."}
            error={error}
            onChange={() => setError(undefined)}
            autoFocus={true}
            defaultValue="Go google and search for Elon Musk's net worth."
          />
        </Form>
      ) : (
        <Form
          navigationTitle="Enter API Key to get started!"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://browse.new" title="Get API Key" />
              <Action.SubmitForm title="Save API Key" onSubmit={handleApiKeySubmission} />
            </ActionPanel>
          }
          enableDrafts={true}
        >
          <Form.PasswordField
            id="apikey"
            title="API Key"
            info="You can get this by opening browse.new in your favorite browser and logging in!"
          />
        </Form>
      )}
    </>
  );
}
