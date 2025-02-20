import { Request } from "./request";
import { Response } from "./response";

export type Renderer = (request: Request, response: Response) => string;
