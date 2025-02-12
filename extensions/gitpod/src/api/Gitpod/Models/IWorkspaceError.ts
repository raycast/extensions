export interface IWorkspaceError extends Error {
  code: number;
  message: string;
}

export function NewIWorkspaceErrorObject(jsonObj: any): IWorkspaceError {
  const error: IWorkspaceError = {
    name: "WorkspaceError",
    code: jsonObj.code ?? 0,
    message: jsonObj.message ?? "",
  };
  return error;
}
