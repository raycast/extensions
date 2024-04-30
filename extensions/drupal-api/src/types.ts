export interface RecordItem {
  title: string;
  type: string;
  location: string;
  description: string;
  url: string;
}

export interface SearchState {
  records?: RecordItem[];
  error?: Error;
  loading?: boolean;
}

export enum DrupalVersions {
  Drupal10 = "10",
  Drupal9 = "9.5",
  Drupal8 = "8.9",
  Drupal7 = "7",
  Drupal6 = "6",
  Drupal5 = "5",
  Drupal4_7 = "4.7",
  Drupal4_6 = "4.6",
}

export enum DrupalVersionMachineCode {
  Drupal10 = "10",
  Drupal9 = "9",
  Drupal8 = "8.9.x",
  Drupal7 = "7.x",
  Drupal6 = "6.x",
  Drupal5 = "5.x",
  Drupal4_7 = "4.7.x",
  Drupal4_6 = "4.6.x",
}
