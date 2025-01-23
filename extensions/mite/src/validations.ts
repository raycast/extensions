import * as v from "valibot";

export const projects_schema = v.array(
  v.object({
    project: v.object({
      id: v.number(),
      name: v.string(),
    }),
  }),
);

export const services_schema = v.array(
  v.object({
    service: v.object({
      id: v.number(),
      name: v.string(),
    }),
  }),
);

export const time_entry_post_schema = v.object({
  time_entry: v.object({
    minutes: v.transform(v.string(), (value) => {
      return parseInt(value);
    }),
    project_id: v.transform(v.string(), (value) => {
      if (value === "") {
        return undefined;
      }
      return value;
    }),
    service_id: v.transform(v.string(), (value) => {
      if (value === "") {
        return undefined;
      }
      return value;
    }),
    subtitle: v.optional(v.string()),
    note: v.optional(v.string()),
  }),
});

export const time_entry_schema = v.object({
  time_entry: v.object({
    minutes: v.number(),
    project_id: v.nullable(v.string()),
    service_id: v.nullable(v.string()),
    subtitle: v.optional(v.string()),
    note: v.optional(v.string()),
  }),
});

export type TimeEntryPost = v.Output<typeof time_entry_post_schema>;
