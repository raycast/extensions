import { Rebound, ReboundResponse } from "./rebound";

export type Renderer = (rebound: Rebound, response: ReboundResponse) => string;
