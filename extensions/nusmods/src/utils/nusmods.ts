import * as z from "@zod/mini";

export const CourseSummarySchema = z.object({
  moduleCode: z.string(),
  title: z.string(),
  semesters: z.array(z.number()),
});

export const CourseSummaryListSchema = z.array(CourseSummarySchema);

export const TimetableSchema = z.object({
  classNo: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  venue: z.string(),
  day: z.optional(z.string()),
  lessonType: z.string(),
  size: z.optional(z.number()),
});

export const SemesterDataSchema = z.object({
  semester: z.number(),
  examDate: z.optional(z.iso.datetime({ offset: true, local: true })),
  examDuration: z.optional(z.number()),
  timetable: z.optional(z.array(TimetableSchema)),
});

export const PrereqSchema = z.union([
  z.string(),
  z.interface({
    get and() {
      return z.array(PrereqSchema);
    },
  }),
  z.interface({
    get or() {
      return z.array(PrereqSchema);
    },
  }),
  z.interface({
    get nOf() {
      return z.tuple([z.number(), z.array(PrereqSchema)]);
    },
  }),
]);

export const CourseDetailsSchema = z.object({
  acadYear: z.string(),
  description: z.string(),
  title: z.string(),
  department: z.string(),
  faculty: z.string(),
  moduleCredit: z.string(),
  moduleCode: z.string(),
  semesterData: z.array(SemesterDataSchema),
  additionalInformation: z.optional(z.string()),
  gradingBasisDescription: z.optional(z.string()),
  workload: z.optional(z.array(z.number()).check(z.length(5))),
  preclusion: z.optional(z.string()),
  prerequisite: z.optional(z.string()),
  corequisite: z.optional(z.string()),
  prereqTree: z.optional(PrereqSchema),
  fulfillRequirements: z.optional(z.array(z.string())),
});

export type CourseSummary = z.infer<typeof CourseSummarySchema>;
export type CourseSummaryList = z.infer<typeof CourseSummaryListSchema>;
export type Prereq = z.infer<typeof PrereqSchema>;
export type Timetable = z.infer<typeof TimetableSchema>;
export type SemesterData = z.infer<typeof SemesterDataSchema>;
export type CourseDetails = z.infer<typeof CourseDetailsSchema>;
