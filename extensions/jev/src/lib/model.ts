import { z } from "zod";
import { randomUUID } from "node:crypto";

const label = z.string().trim().min(1).max(200);
const identifier = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{1,200}$/)
  .refine((s) => !["__proto__", "constructor", "prototype", "none"].includes(s), "Reserved identifier");
export const questionSchema = z
  .object({
    id: identifier,
    title: label,
    instructions: z.string().trim().min(1).max(4000),
    type: z.enum(["choice", "noul", "score"]),
    options: z
      .array(z.object({ label, description: z.string().max(2000) }))
      .max(254)
      .default([]),
  })
  .superRefine((q, ctx) => {
    if (q.type !== "noul" && q.options.length < 2)
      ctx.addIssue({ code: "custom", message: "Add at least two options or score levels." });
    if (q.type === "score" && q.options.length > 10)
      ctx.addIssue({ code: "custom", message: "Scores support at most 10 levels." });
    if (new Set(q.options.map((o) => o.label.toLowerCase())).size !== q.options.length)
      ctx.addIssue({ code: "custom", message: "Option labels must be unique." });
  });
export const presetSchema = z
  .object({
    id: identifier,
    name: label,
    description: z.string().max(2000),
    favorite: z.boolean(),
    questions: z.array(questionSchema).min(1).max(20),
  })
  .superRefine((p, ctx) => {
    if (new Set(p.questions.map((q) => q.id)).size !== p.questions.length)
      ctx.addIssue({ code: "custom", message: "Question IDs must be unique." });
  });
export const destinationSchema = z.object({
  id: identifier,
  name: label,
  description: z.string().max(2000),
  kind: z.enum(["folder", "collection"]),
  path: z.string().default(""),
});
export const linkSchema = z.object({
  id: identifier,
  title: label,
  url: z
    .string()
    .url()
    .refine((v) => /^https?:\/\//i.test(v), "Use an HTTP or HTTPS URL.")
    .refine((v) => {
      const u = new URL(v);
      return !u.username && !u.password;
    }, "URLs must not contain credentials."),
  description: z.string().max(4000),
  collectionId: z.string(),
  tags: z.array(label).max(50),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const moveSchema = z.object({
  id: identifier,
  source: z.string(),
  destination: z.string(),
  sha256: z.string(),
  createdAt: z.string(),
  status: z.enum(["pending", "moved", "undone", "failed"]),
  recoveryPath: z.string().optional(),
  error: z.string().optional(),
});
export const dataSchema = z
  .object({
    version: z.literal(1),
    presets: z.array(presetSchema),
    destinations: z.array(destinationSchema),
    links: z.array(linkSchema),
    moves: z.array(moveSchema),
    bookmarkSources: z
      .array(
        z.object({
          browser: z.enum(["chrome", "brave", "edge", "vivaldi", "chromium"]),
          profile: z
            .string()
            .min(1)
            .max(200)
            .refine((s) => s !== "." && s !== ".." && !/[/\\\0]/.test(s), "Invalid profile"),
          folders: z.array(z.string()).default([]),
        }),
      )
      .default([]),
  })
  .superRefine((data, ctx) => {
    for (const key of ["presets", "destinations", "links", "moves"] as const) {
      if (new Set(data[key].map((item) => item.id)).size !== data[key].length)
        ctx.addIssue({ code: "custom", path: [key], message: "Duplicate identifiers are not allowed." });
    }
    const collections = new Set(data.destinations.filter((d) => d.kind === "collection").map((d) => d.id));
    if (data.links.some((l) => l.collectionId && !collections.has(l.collectionId)))
      ctx.addIssue({ code: "custom", path: ["links"], message: "A link refers to a missing collection." });
  });
export type Question = z.infer<typeof questionSchema>;
export type Preset = z.infer<typeof presetSchema>;
export type Destination = z.infer<typeof destinationSchema>;
export type SavedLink = z.infer<typeof linkSchema>;
export type Move = z.infer<typeof moveSchema>;
export type Data = z.infer<typeof dataSchema>;
export const id = () => randomUUID();
const check = (title: string, instructions: string): Question => ({
  id: id(),
  title,
  instructions,
  type: "noul",
  options: [],
});
export function initialData(): Data {
  return {
    version: 1,
    destinations: [],
    bookmarkSources: [],
    links: [],
    moves: [],
    presets: [
      {
        id: "feedback",
        name: "Classify Feedback",
        description: "Identify the main kind of feedback.",
        favorite: true,
        questions: [
          {
            id: "category",
            title: "Category",
            type: "choice",
            instructions: "What is the main purpose of this feedback? Choose Other if none fits.",
            options: [
              { label: "Bug report", description: "Reports a malfunction or incorrect behavior" },
              { label: "Feature request", description: "Requests new functionality" },
              { label: "Question", description: "Asks how something works" },
              { label: "Praise", description: "Expresses satisfaction" },
              { label: "Other", description: "None of the listed categories" },
            ],
          },
        ],
      },
      {
        id: "bug-report",
        name: "Check Bug Report",
        description: "Check whether a report includes the details needed to reproduce it.",
        favorite: true,
        questions: [
          check(
            "Reproduction steps",
            "Does the text explicitly provide steps that someone can follow to reproduce the issue?",
          ),
          check("Expected behavior", "Does the text explicitly describe what should have happened?"),
          check("Actual behavior", "Does the text explicitly describe what happened instead?"),
          check("Environment", "Does the text identify the relevant software version or operating environment?"),
        ],
      },
      {
        id: "requirements",
        name: "Check Requirements",
        description: "Check for a stated outcome, constraints, and acceptance criteria.",
        favorite: true,
        questions: [
          check("Outcome", "Does the text explicitly state the desired outcome?"),
          check("Constraints", "Does the text explicitly state constraints or boundaries?"),
          check(
            "Acceptance criteria",
            "Does the text include criteria that allow someone to test whether the requirement has been met?",
          ),
        ],
      },
      {
        id: "content",
        name: "Categorize Content",
        description: "Choose a topic. Duplicate this preset to use your own categories.",
        favorite: false,
        questions: [
          {
            id: "topic",
            title: "Topic",
            instructions: "What is the primary subject of this content? Choose Other if none fits.",
            type: "choice",
            options: [
              { label: "Technology", description: "Software, hardware, and engineering" },
              { label: "Design", description: "Visual design and user experience" },
              { label: "Research", description: "Research methods and findings" },
              { label: "Other", description: "Another topic or insufficient information" },
            ],
          },
        ],
      },
      {
        id: "clarity",
        name: "Score Clarity",
        description: "Rate how explicitly the text communicates its main point.",
        favorite: false,
        questions: [
          {
            id: "clarity",
            title: "Clarity",
            type: "score",
            instructions: "Rate how clearly this text states its main point using the defined levels.",
            options: [
              { label: "Unclear", description: "The main point cannot be identified" },
              { label: "Partly clear", description: "The point is inferable but ambiguous" },
              { label: "Clear", description: "The point is explicit and understandable" },
              { label: "Precise", description: "The point is explicit, specific, and unambiguous" },
            ],
          },
        ],
      },
    ],
  };
}
