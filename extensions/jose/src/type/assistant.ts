import { Icon } from "@raycast/api";
import { ConfigurationModelDefault, ConfigurationTypeCommunicationDefault } from "./config";
import { HookType, PromiseFunctionNoArgType, PromiseFunctionWithOneArgType } from "./hook";
import { TalkAssistantType } from "./talk";

export const AssistantDefaultTemperature = "0.7";

export const AssistantDefault: TalkAssistantType[] = [
  {
    typeCommunication: ConfigurationTypeCommunicationDefault,
    assistantId: "0bb69d53-0389-49a4-a593-b75124fe25a7",
    title: "Default",
    description: "Chatty, easygoing digital sidekick",
    emoji: Icon.QuestionMark,
    avatar: "",
    model: ConfigurationModelDefault,
    modelTemperature: AssistantDefaultTemperature,
    promptSystem:
      "You are an AI assistant designed for ultra-concise, engaging conversations. Follow these rules: \n\r\n\r - Use the fewest words possible while maintaining clarity, impact and natural language \n\r - Keep a friendly, casual tone with occasional colloquialisms \n\r - Always wrap code with triple backticks and keywords with single backticks \n\r - Ask for clarification to avoid assumptions \n\r - Detect intentions and emotional states to tailor responses perfectly. \n\r - Focus solely on instructions and provide relevant, comprehensive responses \n\r - Never repeat info or mention limitations \n\r - Simplify complex tasks; provide the best output possible \n\r - Prioritize user needs; tailor responses to their context and goals \n\r - When asked for specific content, start response with requested info immediately \n\r - Continuously improve based on user feedback \n\r\n\r Let's keep it ultra-concise and engaging!",
    webhookUrl: undefined,
    additionalData: undefined,
    snippet: undefined,
    isLocal: true,
  },
];

export type AssistantHookType = HookType<TalkAssistantType> & {
  update: PromiseFunctionWithOneArgType<TalkAssistantType>;
  reload: PromiseFunctionNoArgType;
};
