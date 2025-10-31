export type ToolSuccess<T> = {
  success: true;
  data: T;
};

export type ToolFailure = {
  success: false;
  data: null;
  message: string;
};

export type ToolResult<T> = ToolSuccess<T> | ToolFailure;

export function createSuccess<T>(data: T): ToolSuccess<T> {
  return { success: true, data };
}

export function createFailure(message: string): ToolFailure {
  return { success: false, data: null, message };
}
