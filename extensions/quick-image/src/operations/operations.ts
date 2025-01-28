import * as convertOperation from "./convertOperation";
import * as collageOperation from "./collageOperation";
import * as pdfOperation from "./pdfOperation";
import invariant from "tiny-invariant";
import type { Image } from "#/types";

const operationNames = ["webp", "jpg", "png", "hor", "ver", "pdf"] as const;

export const operations: Record<Name, Operation> = {
  webp: convertOperation,
  jpg: convertOperation,
  png: convertOperation,
  hor: collageOperation,
  ver: collageOperation,
  pdf: pdfOperation,
};

export function getOperation(name: string) {
  const operation = operations[name as Name];
  invariant(operation, `Operation '${name}' not found`);
  return operation;
}

export type Name = (typeof operationNames)[number];

export type Operation = {
  format?: string;
  run: Run;
};

export type Run = (arg: { name: string; options: Options; images: Image[] }) => Promise<Image[]>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Options = Record<string | number, any>;

export type GetOperation = typeof getOperation;
