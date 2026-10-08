import OpenAIProvider from "../openai";
import { ProviderProps } from "../types";

export default class extends OpenAIProvider {
  constructor(props: ProviderProps) {
    super(props);
  }
}
