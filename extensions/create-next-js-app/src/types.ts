import { z } from "zod";

export const Prompt = z.object({
  workspace: z
    .string()
    .array()
    .length(1)
    .transform((value) => value[0]),
  project: z.string().min(1),
  typescript: z.boolean(),
  eslint: z.boolean(),
  prettier: z.boolean(),
  tailwind: z.boolean(),
  srcDir: z.boolean(),
  app: z.boolean(),
  importAlias: z.string().min(3).endsWith("/*"),
});
export type Prompt<InputOrOutput extends "input" | "output" = "output"> = InputOrOutput extends "input"
  ? Omit<z.infer<typeof Prompt>, "workspace"> & { workspace: string[] }
  : z.infer<typeof Prompt>;

export const Command = z.object({
  executable: z.string().min(1),
  arguments: z.string().array(),
});
export type Command = z.infer<typeof Command>;

export const UseExecError = z.object({
  message: z.string(),
  shortMessage: z.string(),
  command: z.string(),
  exitCode: z.number().nullable(),
  signal: z.string().nullable(),
  stdout: z.string(),
  stderr: z.string(),
});
export type UseExecError = z.infer<typeof UseExecError>;
