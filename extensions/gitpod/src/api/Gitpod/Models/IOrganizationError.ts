export interface IOrganizationError extends Error {
  code: number;
  message: string;
}

export function NewIOrganizationErrorObject(jsonObj: any): IOrganizationError {
  const error: IOrganizationError = {
    name: "OrganizationError",
    code: jsonObj.code ?? 0,
    message: jsonObj.message ?? "",
  };
  return error;
}
