import { z } from "zod";
import ordinal from "ordinal";
import { isURL, reflect } from "./util";
import { isValidRSSLink } from "./request";
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const sourceValidationSchema = z
  .object({
    url: z
      .string({
        required_error: "URL is required",
      })
      .refine((val) => !val || isURL(val), "A valid URL is required"),
    title: z.string({
      required_error: "Title is required",
    }),
    customDays: z
      .array(z.string())
      .optional()
      .refine((val) => {
        return val ? val.every((day) => daysOfWeek.includes(day)) : true;
      }, "Custom days must be valid days of the week"),
    timeSpan: z
      .string()
      .optional()
      .refine((val) => {
        const numVal = parseInt(val ?? "");
        return !val || (!isNaN(numVal) && numVal >= 1 && numVal <= 7);
      }, "TimeSpan should be a number between 1 and 7"),
    schedule: z.enum(["custom", "everyday"]).optional(),
    rssLink: z
      .string()
      .optional()
      .refine(async (url) => {
        if (!url) return true;
        return await isValidRSSLink(url);
      }, "Invalid RSS link"),
    favicon: z.string().optional(),
    tags: z.array(z.string()).optional(),
    id: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.schedule === "custom" && (!data.customDays || data.customDays.length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: "Custom days are required for a 'custom' schedule",
      path: ["customDays"],
    },
  );

export async function validateSources(sources: Record<string, any>[]) {
  let promises: Promise<any>[] = [];
  try {
    promises = sources.map(async (source, index) => await reflect(sourceValidationSchema.parseAsync(source), index));
    await Promise.all(promises);
  } catch (error: any) {
    const { payload, reason } = error as { payload: number; reason: any };
    // const { title } = sources[payload];
    // console.log("issue", reason?.issues?.[0]);
    throw new Error(
      `${ordinal(payload + 1)} Source Error: ${reason?.issues?.[0]?.message || reason?.message || "Invalid Source"}`,
    );
  }
}
