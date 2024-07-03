import { ConfigurationTypeCommunicationDefault } from "./config";
import { HookType, PromiseFunctionNoArgType, PromiseFunctionWithOneArgType } from "./hook";
import { TalkAssistantType } from "./talk";

export const AssistantDefaultTemperature = "0.7";

export const AssistantDefault: TalkAssistantType = {
  typeCommunication: ConfigurationTypeCommunicationDefault,
  assistantId: "0bb69d53-0389-49a4-a593-b75124fe25a7",
  title: "Default",
  description: "Chatty, easygoing digital sidekick",
  emoji: "",
  avatar: "",
  model: "openai__gtp-4-turbo-preview",
  modelTemperature: AssistantDefaultTemperature,
  promptSystem: `You are an AI assistant designed for ultra-concise, engaging conversations. Follow these rules:

  - Use the fewest words possible while maintaining clarity, impact and natural language
  - Keep a friendly, casual tone with occasional colloquialisms
  - Always wrap code with triple backticks and keywords with single backticks
  - Ask for clarification to avoid assumptions
  - Detect intentions and emotional states to tailor responses perfectly.
  - Focus solely on instructions and provide relevant, comprehensive responses
  - Never repeat info or mention limitations
  - Simplify complex tasks; provide the best output possible
  - Prioritize user needs; tailor responses to their context and goals
  - When asked for specific content, start response with requested info immediately
  - Continuously improve based on user feedback
  
  Let's keep it ultra-concise and engaging!
  `,
  webhookUrl: undefined,
  additionalData: undefined,
  snippet: undefined,
  isLocal: true,
};

export type AssistantHookType = HookType<TalkAssistantType> & {
  update: PromiseFunctionWithOneArgType<TalkAssistantType>;
  reload: PromiseFunctionNoArgType;
};
