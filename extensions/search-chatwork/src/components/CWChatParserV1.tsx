import { ICWChatParser } from "./ICWChatParser";

/**
 * this class is to parse raw test provided by CW.
 *
 * it is supposed for this class to be used in DI way.
 */
export class CWChatParserV1 implements ICWChatParser {
  parseText(params: string): string {
    return params;
  }
}
