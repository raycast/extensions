import { AnyObject } from "../common";

export const groupBy = <T extends AnyObject>(array: T[], predicate: (value: T, index: number, array: T[]) => string) =>
  array.reduce((acc, value, index, array) => {
    (acc[predicate(value, index, array)] ||= []).push(value);
    return acc;
  }, {} as { [key: string]: T[] });

export const distinctBy = <T extends AnyObject>(
  array: T[],
  predicate: (value: T, index: number, array: T[]) => string
) => [...new Map(array.map((value, index) => [predicate(value, index, array), value])).values()];
