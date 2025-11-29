interface Status {
  code: number;
  message: string;
}

declare const statuses: Record<string, Status>;

export default statuses;
