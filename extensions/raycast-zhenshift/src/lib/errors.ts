export class PreferenceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreferenceValidationError";
  }
}

export class OpenAIHttpError extends Error {
  constructor(public readonly status: number, message?: string) {
    super(message ? message : `OpenAI 请求失败，状态码 ${status}`);
    this.name = "OpenAIHttpError";
  }
}

export class OpenAIResponseError extends Error {
  constructor(message?: string) {
    super(message ?? "OpenAI 响应格式不符合预期");
    this.name = "OpenAIResponseError";
  }
}
