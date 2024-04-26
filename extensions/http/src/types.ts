import { nanoid } from "nanoid";

// Profile

export function NewProfile(): Profile {
  return {
    id: nanoid(),
    name: "",
    fields: {},
  };
}

export type StateProfiles = {
  isLoading: boolean;
  items: Profile[];
};

export type Profile = {
  id: string;
  name: string;
  fields: { [key: string]: string };
};

// Request

export function NewRequest(): Request {
  return {
    ID: nanoid(),
    Name: "",
    Method: "GET",
    URL: "",
    RequestBody: "",
    RequestHeaders: "",
    LastResponse: NewResponse(),
  };
}

export type StateRequests = {
  isLoading: boolean;
  isRequesting: boolean;
  items: Request[];
  ShowDetails: ShowDetails;
};

export enum ShowDetails {
  Full = "Full",
  Short = "Short",
  None = "None",
}

export type Request = {
  ID: string;
  Name: string;
  Method: string;
  URL: string;
  RequestBody: string;
  RequestHeaders: string;
  LastResponse: Response;
};

export function NewResponse(): Response {
  return {
    ExecutionTime: 0,
    Headers: {},
    StatusCode: 0,
    StatusText: "",
    Body: "",
    ImageURL: "",
  };
}

export type Response = {
  ExecutionTime: number;
  Headers: { [key: string]: string };
  StatusCode: number;
  StatusText: string;
  Body: string;
  ImageURL: string;
};
