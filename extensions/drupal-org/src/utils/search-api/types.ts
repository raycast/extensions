export interface ApiItem {
  title: string;
  type: string;
  location: string;
  description: string;
  url: string;
}

export interface ApiState {
  records?: ApiItem[];
  error?: Error;
  loading?: boolean;
}

export enum DrupalVersions {
  Drupal11 = "11",
  Drupal10 = "10",
  Drupal9 = "9",
  Drupal8 = "8",
  Drupal7 = "7",
}

export enum DrupalVersionMachineCode {
  Drupal11 = "11.x",
  Drupal10 = "10",
  Drupal9 = "9",
  Drupal8 = "8.9.x",
  Drupal7 = "7.x",
}
