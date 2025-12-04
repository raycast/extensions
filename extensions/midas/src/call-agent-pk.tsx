import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  getPreferenceValues,
  Detail,
  LocalStorage,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import fetch from "node-fetch";
import { config } from "./config";

interface Preferences {
  authCode: string;
  privateKey: string;
  lastSelectedChain?: Chain;
}

type Values = {
  command: string;
};

interface AIResponse {
  response: string;
}

type Chain = "mode" | "mantle" | "base";

const AVAILABLE_CHAINS: { value: Chain; title: string }[] = [
  { value: "mode", title: "Mode" },
  { value: "mantle", title: "Mantle" },
  { value: "base", title: "Base" },
];

// At the top of the file, outside the component
let globalChain: Chain = "base";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [command, setCommand] = useState("");
  const [selectedChain, setSelectedChain] = useState<Chain>(globalChain);
  const isInitialMount = useRef(true);

  // Load saved chain on mount
  useEffect(() => {
    let isSubscribed = true;

    LocalStorage.getItem<Chain>("lastSelectedChain").then((savedChain) => {
      if (!isSubscribed) return;

      if (savedChain) {
        globalChain = savedChain;
        setSelectedChain(savedChain);
      }
      isInitialMount.current = false;
    });

    return () => {
      isSubscribed = false;
    };
  }, []);

  // Save chain when it changes, but only after initial mount
  useEffect(() => {
    if (isInitialMount.current) return;

    let isSubscribed = true;

    LocalStorage.setItem("lastSelectedChain", selectedChain)
      .then(() => {
        if (!isSubscribed) return;
        globalChain = selectedChain;
      })
      .catch((error) => {
        if (!isSubscribed) return;
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to save chain preference",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      });

    return () => {
      isSubscribed = false;
    };
  }, [selectedChain]);

  // Loading animation frames
  const loadingFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const [loadingFrame, setLoadingFrame] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingFrame((frame) => (frame + 1) % loadingFrames.length);
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  async function handleSubmit(values: Values) {
    setIsLoading(true);
    const url = `${config.apiUrl}/call/agent/viem`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-API-Key": preferences.authCode,
        },
        body: JSON.stringify({
          prompt: values.command,
          chain: selectedChain,
          privateKey: preferences.privateKey,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Type guard to check if the response matches our interface
      if (typeof data === "object" && data !== null && "response" in data && typeof data.response === "string") {
        setResponse(data as AIResponse);
      } else {
        throw new Error("Invalid response format from server");
      }

      setCommand("");

      showToast({
        title: "Success",
        message: "Command processed",
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to process command",
        style: Toast.Style.Failure,
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (!isLoading && response) {
    const modifiedMarkdown = response.response.replace(
      /\[([^\]]*)\]\((https?:\/\/[^\s)]+\.(png|jpg|jpeg|gif|svg|webp))\)/gi,
      "![]($2)",
    );

    return (
      <Detail
        markdown={modifiedMarkdown}
        actions={
          <ActionPanel>
            <Action.Push title="New Command" icon={Icon.Terminal} target={<Command />} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Send Command" icon={Icon.Terminal} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter your command below (Private Key)" />
      <Form.Dropdown
        id="chain"
        title="Chain"
        value={selectedChain}
        onChange={(value) => setSelectedChain(value as Chain)}
      >
        {AVAILABLE_CHAINS.map((chain) => (
          <Form.Dropdown.Item key={chain.value} value={chain.value} title={chain.title} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="command"
        title="Command"
        placeholder="Enter your command here..."
        enableMarkdown
        autoFocus
        value={command}
        onChange={(value) => setCommand(value)}
      />

      {isLoading && (
        <>
          <Form.Separator />
          <Form.Description text={`${loadingFrames[loadingFrame]} Processing your request...`} />
        </>
      )}
    </Form>
  );
}
