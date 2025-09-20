export interface DataStorage {
  save(data: string, date: Date): void;
  dataForDateExists(date: Date): boolean;
  readForDate(date: Date): string;
  deleteAllDataForDate(date: Date): void;
}
