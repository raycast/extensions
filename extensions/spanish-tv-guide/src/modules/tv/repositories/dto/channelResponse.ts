import { ProgramResponse } from "./programResponse";

export type ChannelResponse = {
  DATOS_CADENA: { NOMBRE: string; CODIGO: string };
  PROGRAMAS: ProgramResponse[];
};
