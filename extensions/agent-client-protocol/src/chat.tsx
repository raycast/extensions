/**
 * Chat Command - Main AI agent conversation interface
 *
 * This is the primary command for interacting with AI agents through ACP.
 * Supports real-time conversation with context sharing and file access.
 */

import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { ConfigService } from "@/services/configService";
import { ACPClient } from "@/services/acpClient";
import { StorageService } from "@/services/storageService";
import { ErrorHandler } from "@/utils/errors";
import { createLogger } from "@/utils/logging";
import type { AgentConfig } from "@/types/extension";

const logger = createLogger("ChatCommand");

interface ChatFormValues {
  message: string;
  agentId: string;
}

export default function ChatCommand() {
  const { push } = useNavigation();
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [defaultAgent, setDefaultAgent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const configService = new ConfigService();
  const acpClient = new ACPClient();
  const storageService = new StorageService();

  useEffect(() => {
    async function loadAgents() {
      try {
        await storageService.initialize();
        const [agentConfigs, defaultAgentId] = await Promise.all([
          configService.getAgentConfigs(),
          configService.getDefaultAgent()
        ]);

        setAgents(agentConfigs);
        setDefaultAgent(defaultAgentId || (agentConfigs[0]?.id ?? null));

        logger.info("Agents loaded successfully", {
          count: agentConfigs.length,
          defaultAgent: defaultAgentId
        });
      } catch (error) {
        await ErrorHandler.handleError(error, "Loading agents");
      } finally {
        setIsLoading(false);
      }
    }

    loadAgents();
  }, []);

  async function handleSubmit(values: ChatFormValues) {
    if (!values.message.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter a message"
      });
      return;
    }

    if (!values.agentId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please select an agent"
      });
      return;
    }

    try {
      setIsLoading(true);

      // Find the selected agent configuration
      const agentConfig = agents.find(a => a.id === values.agentId);
      if (!agentConfig) {
        throw new Error(`Agent configuration not found: ${values.agentId}`);
      }

      logger.userAction("Starting chat session", {
        agentId: values.agentId,
        messageLength: values.message.length
      });

      // Connect to agent
      const connection = await acpClient.connect(agentConfig);

      // Create new session
      const session = await acpClient.createSession(connection.id, {
        prompt: values.message
      });

      // Save conversation to storage
      await storageService.saveConversation(session);

      await ErrorHandler.showSuccess("Connected to agent successfully");

      // TODO: Navigate to conversation view
      logger.info("Chat session started successfully", { sessionId: session.sessionId });

    } catch (error) {
      await ErrorHandler.handleError(error, "Starting chat session");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading && agents.length === 0) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Message"
            onSubmit={handleSubmit}
            icon="💬"
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="agentId"
        title="AI Agent"
        placeholder="Select an agent"
        defaultValue={defaultAgent || undefined}
      >
        {agents.map((agent) => (
          <Form.Dropdown.Item
            key={agent.id}
            value={agent.id}
            title={agent.name}
            icon={agent.isBuiltIn ? "🤖" : "⚙️"}
          />
        ))}
      </Form.Dropdown>

      <Form.TextArea
        id="message"
        title="Your Message"
        placeholder="Ask for coding help, code generation, or technical guidance..."
        defaultValue=""
      />

      <Form.Description text="Tip: You can share file context and have multi-turn conversations with the agent." />
    </Form>
  );
}