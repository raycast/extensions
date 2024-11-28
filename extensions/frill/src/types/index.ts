import { CreateAnnouncementRequest } from "./announcements";
import { CreateIdeaRequest } from "./ideas";
import { CreateStatusRequest } from "./statuses";

export type BodyRequest = CreateAnnouncementRequest | CreateIdeaRequest | CreateStatusRequest;

export type RequestMethod = "GET" | "POST" | "DELETE";

export type SimpleSuccessResponse = {
  success: true;
  message: string;
};

export type SingleErrorResponse = {
  error: true;
  message: string;
};
export type MultiErrorResponse = {
  message: string;
  errors: {
    [key: string]: string[];
  };
};
export type ErrorResponse = SingleErrorResponse | MultiErrorResponse;
