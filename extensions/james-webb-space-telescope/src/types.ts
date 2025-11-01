import { fileTypes } from "./config";

export type ProgramShort = {
  program: number;
};

export type FileType = (typeof fileTypes)[number];

export type Observation = {
  id: string;
  observation_id: string;
  program: number;
  details: Details;
  file_type: string;
  thumbnail: string;
  location: string;
};

export type Instrument = {
  instrument: string;
};

export type Details = {
  mission: string;
  instruments: Instrument[];
  suffix: string;
  description: string;
};
