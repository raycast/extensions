// :copyright: Copyright (c) 2023 ftrack

/** Return *value* as string, joined by separator* if array. */
function arrayToString(value: string | string[], separator = ", ") {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return value.join(separator);
}

/** Build ftrack API query expression from options. */
export function buildExpression({
  entityType,
  projection,
  order = "",
  filter = "",
  limit = 0,
  offset = 0,
}: {
  entityType: string;
  projection: string[];
  order?: string;
  filter?: string | string[];
  limit?: number;
  offset?: number;
}) {
  const sortedProjection = [...new Set(projection)].sort();
  const projectionsLabel = sortedProjection.join(", ");
  const expression = `select ${projectionsLabel}
            from ${entityType}
            ${filter && `where ${arrayToString(filter, " and ")}`}
            ${order && `order by ${order}`}
            ${offset > 0 ? `offset ${offset}` : ""}
            ${limit > 0 ? `limit ${limit}` : ""}`;
  return expression;
}
