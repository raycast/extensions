export default function getNotDeletedIndicies(indicies?: {
  [key: string]: number;
}) {
  const ids = new Array<string>();

  for (const id in indicies ?? {}) {
    if (indicies![id] !== -1) ids.push(id);
  }

  return ids;
}
