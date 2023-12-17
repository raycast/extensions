import { BaseSuccessResponse } from "./common";
import { IdeaTopic } from "./ideas";

export type GetTopicsResponse = BaseSuccessResponse & { data: IdeaTopic[] };