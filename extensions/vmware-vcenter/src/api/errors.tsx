export class ErrorApiGetToken extends Error {
  readonly responseCode: number;
  readonly responseMessage: string;
  readonly tips: string;
  readonly context?: Error;

  constructor(code: number, message: string, tips: string, context?: Error) {
    super(message);
    this.responseCode = code;
    this.responseMessage = message;
    this.tips = tips;
    this.context = context;
  }
}
