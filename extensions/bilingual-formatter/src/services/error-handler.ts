import { Logger } from "../utils/logger";

export class ErrorHandler {
  static handle(error: Error, context: string): string {
    Logger.error(`ErrorHandler: ${context}`, error);
    return error.message;
  }

  static logInfo(message: string): void {
    Logger.log(message);
  }
}
