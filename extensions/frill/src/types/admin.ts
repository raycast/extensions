import { Author, BaseSuccessResponse } from "./common";

export type GetAdminsResponse = BaseSuccessResponse & { data: Author[] };
