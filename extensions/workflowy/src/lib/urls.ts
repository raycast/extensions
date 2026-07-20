export function getWorkflowyAppUrl(idOrTarget: string): string {
  return `workflowy://workflowy.com/#/${encodeURIComponent(idOrTarget)}`;
}

export function getWorkflowyWebUrl(idOrTarget: string): string {
  return `https://workflowy.com/#/${encodeURIComponent(idOrTarget)}`;
}
