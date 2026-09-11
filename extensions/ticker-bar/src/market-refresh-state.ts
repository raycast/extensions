export function retainCurrentRecords<Value>(
  records: Record<string, Value>,
  activeIds?: readonly string[],
) {
  if (!activeIds) return { ...records };
  return Object.fromEntries(
    activeIds.flatMap((id) => (records[id] ? [[id, records[id]]] : [])),
  );
}
