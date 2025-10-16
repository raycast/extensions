import { RollType } from "enums";

export type RollForm = {
  dice: string;
};

export type Roll = [number, number[]];

export interface RollOptions {
  times?: number;
  die: number;
  type?: RollType;
}
