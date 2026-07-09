import {
  attach,
  createOne,
  detach,
  getOne,
  listAll,
  listPage,
  updateOne,
} from "./client";
import type {
  Activity,
  Patch,
  Comment,
  CommentEntityType,
  Company,
  Credits,
  Deal,
  DealTask,
  Label,
  Person,
  Pipeline,
  PipelineStage,
  Project,
  Space,
  Task,
} from "./types";

/**
 * One function per documented resource + verb. Filters accepted here match the
 * "List filters" column, and write bodies only include documented writable
 * fields (see https://www.trykyo.com/docs/api).
 */

type Query = Record<string, string | number | boolean | undefined | null>;

// ---- Deals ----------------------------------------------------------------
export const Deals = {
  list: (q?: Query) => listAll<Deal>("deals", q),
  page: (q?: Query) => listPage<Deal>("deals", q),
  get: (id: string) => getOne<Deal>("deals", id),
  create: (body: Partial<Deal>) =>
    createOne<Deal>("deals", body as Record<string, unknown>),
  update: (id: string, body: Patch<Deal>) =>
    updateOne<Deal>("deals", id, body as Record<string, unknown>),
};

// ---- People ---------------------------------------------------------------
export const People = {
  list: (q?: Query) => listAll<Person>("people", q),
  page: (q?: Query) => listPage<Person>("people", q),
  get: (id: string) => getOne<Person>("people", id),
  create: (body: Partial<Person>) =>
    createOne<Person>("people", body as Record<string, unknown>),
  update: (id: string, body: Patch<Person>) =>
    updateOne<Person>("people", id, body as Record<string, unknown>),
};

// ---- Companies ------------------------------------------------------------
export const Companies = {
  list: (q?: Query) => listAll<Company>("companies", q),
  page: (q?: Query) => listPage<Company>("companies", q),
  get: (id: string) => getOne<Company>("companies", id),
  create: (body: Partial<Company>) =>
    createOne<Company>("companies", body as Record<string, unknown>),
  update: (id: string, body: Patch<Company>) =>
    updateOne<Company>("companies", id, body as Record<string, unknown>),
};

// ---- Tasks (workspace) ----------------------------------------------------
export const Tasks = {
  list: (q?: Query) => listAll<Task>("tasks", q),
  page: (q?: Query) => listPage<Task>("tasks", q),
  get: (id: string) => getOne<Task>("tasks", id),
  create: (body: Partial<Task>) =>
    createOne<Task>("tasks", body as Record<string, unknown>),
  update: (id: string, body: Patch<Task>) =>
    updateOne<Task>("tasks", id, body as Record<string, unknown>),
};

// ---- Deal tasks -----------------------------------------------------------
export const DealTasks = {
  list: (q?: Query) => listAll<DealTask>("deal_tasks", q),
  get: (id: string) => getOne<DealTask>("deal_tasks", id),
  create: (body: Partial<DealTask>) =>
    createOne<DealTask>("deal_tasks", body as Record<string, unknown>),
  update: (id: string, body: Patch<DealTask>) =>
    updateOne<DealTask>("deal_tasks", id, body as Record<string, unknown>),
};

// ---- Pipelines & stages ---------------------------------------------------
export const Pipelines = {
  list: (q?: Query) => listAll<Pipeline>("pipelines", q),
  get: (id: string) => getOne<Pipeline>("pipelines", id),
  create: (body: Partial<Pipeline>) =>
    createOne<Pipeline>("pipelines", body as Record<string, unknown>),
  update: (id: string, body: Patch<Pipeline>) =>
    updateOne<Pipeline>("pipelines", id, body as Record<string, unknown>),
};

export const PipelineStages = {
  list: (q?: Query) => listAll<PipelineStage>("pipeline_stages", q),
  get: (id: string) => getOne<PipelineStage>("pipeline_stages", id),
  create: (body: Partial<PipelineStage>) =>
    createOne<PipelineStage>(
      "pipeline_stages",
      body as Record<string, unknown>,
    ),
  update: (id: string, body: Patch<PipelineStage>) =>
    updateOne<PipelineStage>(
      "pipeline_stages",
      id,
      body as Record<string, unknown>,
    ),
};

// ---- Labels ---------------------------------------------------------------
export const Labels = {
  list: (q?: Query) => listAll<Label>("labels", q),
  get: (id: string) => getOne<Label>("labels", id),
  create: (body: Partial<Label>) =>
    createOne<Label>("labels", body as Record<string, unknown>),
};

// ---- Comments (deal | task) ----------------------------------------------
export const Comments = {
  list: (entityType: CommentEntityType, entityId: string) =>
    listAll<Comment>("comments", {
      entity_type: entityType,
      entity_id: entityId,
    }),
  create: (entityType: CommentEntityType, entityId: string, content: string) =>
    createOne<Comment>("comments", {
      entity_type: entityType,
      entity_id: entityId,
      content,
    }),
};

// ---- Spaces & projects ----------------------------------------------------
export const Spaces = {
  list: (q?: Query) => listAll<Space>("spaces", q),
  get: (id: string) => getOne<Space>("spaces", id),
  create: (body: Partial<Space>) =>
    createOne<Space>("spaces", body as Record<string, unknown>),
  update: (id: string, body: Patch<Space>) =>
    updateOne<Space>("spaces", id, body as Record<string, unknown>),
};

export const Projects = {
  list: (q?: Query) => listAll<Project>("projects", q),
  get: (id: string) => getOne<Project>("projects", id),
  create: (body: Partial<Project>) =>
    createOne<Project>("projects", body as Record<string, unknown>),
  update: (id: string, body: Patch<Project>) =>
    updateOne<Project>("projects", id, body as Record<string, unknown>),
};

// ---- Deal <-> person / label junctions -----------------------------------
export const DealPeople = {
  list: (dealId: string) => listAll("deal_people", { deal_id: dealId }),
  link: (dealId: string, personId: string, isPrimary?: boolean) =>
    attach("deal_people", {
      deal_id: dealId,
      person_id: personId,
      is_primary: isPrimary,
    }),
  unlink: (dealId: string, personId: string) =>
    detach("deal_people", { deal_id: dealId, person_id: personId }),
};

export const DealLabels = {
  list: (dealId: string) => listAll("deal_labels", { deal_id: dealId }),
  link: (dealId: string, labelId: string) =>
    attach("deal_labels", { deal_id: dealId, label_id: labelId }),
  unlink: (dealId: string, labelId: string) =>
    detach("deal_labels", { deal_id: dealId, label_id: labelId }),
};

// ---- Activity (read-only) & credits (read-only) --------------------------
export const ActivityFeed = {
  list: (q?: Query) => listAll<Activity>("activity", q),
  forEntity: (entityType: string, entityId: string) =>
    listAll<Activity>("activity", {
      entity_type: entityType,
      entity_id: entityId,
    }),
};

export const CreditsApi = {
  get: () => listPage<Credits>("credits"),
};
