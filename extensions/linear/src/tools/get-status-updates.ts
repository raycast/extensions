import { LinearClient, PaginationOrderBy } from "@linear/sdk";

import { afterDate, client, collect, PageInput, resolveInitiative, resolveProject, resolveUser } from "./linearUtils";
import { mapPage, serializeStatusUpdate } from "./serializers";
import { withLinear } from "./withLinear";

type ProjectUpdateFilter = NonNullable<Parameters<LinearClient["projectUpdates"]>[0]>["filter"];
type InitiativeUpdateFilter = NonNullable<Parameters<LinearClient["initiativeUpdates"]>[0]>["filter"];

interface Input extends PageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Sort: createdAt | updatedAt */ orderBy?: "createdAt" | "updatedAt";
  type: "project" | "initiative";
  id?: string;
  project?: string;
  initiative?: string;
  user?: string;
  createdAt?: string;
  updatedAt?: string;
  includeArchived?: boolean;
}

export default withLinear(async (input: Input) => {
  if (input.id)
    return serializeStatusUpdate(
      input.type === "project" ? await client().projectUpdate(input.id) : await client().initiativeUpdate(input.id),
    );
  const project = input.project ? await resolveProject(input.project) : undefined;
  const initiative = input.initiative ? await resolveInitiative(input.initiative) : undefined;
  const user = input.user ? await resolveUser(input.user) : undefined;
  const createdAfter = afterDate(input.createdAt);
  const updatedAfter = afterDate(input.updatedAt);
  const orderBy = input.orderBy === "createdAt" ? PaginationOrderBy.CreatedAt : PaginationOrderBy.UpdatedAt;
  if (input.type === "project") {
    const filter: ProjectUpdateFilter = {
      project: project ? { id: { eq: project.id } } : undefined,
      user: user ? { id: { eq: user.id } } : undefined,
      createdAt: createdAfter ? { gte: createdAfter } : undefined,
      updatedAt: updatedAfter ? { gte: updatedAfter } : undefined,
    };
    const page = await collect(
      ({ first, after }) =>
        client().projectUpdates({ first, after, filter, includeArchived: input.includeArchived, orderBy }),
      input,
    );
    return mapPage(page, serializeStatusUpdate);
  }
  const filter: InitiativeUpdateFilter = {
    initiative: initiative ? { id: { eq: initiative.id } } : undefined,
    user: user ? { id: { eq: user.id } } : undefined,
    createdAt: createdAfter ? { gte: createdAfter } : undefined,
    updatedAt: updatedAfter ? { gte: updatedAfter } : undefined,
  };
  const page = await collect(
    ({ first, after }) =>
      client().initiativeUpdates({ first, after, filter, includeArchived: input.includeArchived, orderBy }),
    input,
  );
  return mapPage(page, serializeStatusUpdate);
});
