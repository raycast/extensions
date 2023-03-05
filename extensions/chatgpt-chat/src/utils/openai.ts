import { randomUUID } from "crypto";
import EventEmitter from "events";
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";

export interface Conversation {
  on(event: "message", listener: (message: ChatCompletionRequestMessage) => void): this;
}

export type MessageWithId = ChatCompletionRequestMessage & { id: string };

export class Conversation extends EventEmitter {
  private static instance: Conversation;

  public static getInstance(apiKey: string) {
    if (!Conversation.instance) {
      Conversation.instance = new Conversation(apiKey);
    }
    return Conversation.instance;
  }

  private openai: OpenAIApi;
  private messages: MessageWithId[] = [];

  private constructor(apiKey: string) {
    super();
    const configuration = new Configuration({ apiKey });
    this.openai = new OpenAIApi(configuration);
  }

  private addMessage = (_message: ChatCompletionRequestMessage): void => {
    const id = randomUUID();
    const message = { ..._message, id };
    this.messages.push(message);
    this.emit("message", message);
  };

  getMessages = (): ReadonlyArray<MessageWithId> => {
    return this.messages;
  };

  ask = async (question: string) => {
    if (question === "") return;
    this.addMessage({
      content: question,
      role: "user",
    });

    const completion = await this.openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: this.messages.map(({ id, ...m }) => m),
    });

    const message = completion.data.choices[0].message;
    if (!message) {
      throw new Error("No content returned from OpenAI");
    }

    this.addMessage(message);

    return message.content;
  };
}
