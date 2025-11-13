import { z } from "zod";
import { GetAvailableServicesResponseSchema } from "@eva-types/EVA.Core.API.GetAvailableServicesResponse";
import { GetAvailableServiceDetailsResponseSchema } from "@eva-types/EVA.Core.API.GetAvailableServiceDetailsResponse";
import { GetAvailableSettingsResponseSchema } from "@eva-types/EVA.Core.Management.Configuration.GetAvailableSettingsResponse";
import { GetAppSettingsAutocompleteInfoResponseSchema } from "@eva-types/EVA.Core.Management.Configuration.GetAppSettingsAutocompleteInfoResponse";

/**
 * Service for retrieving a list of available services
 */
export type GetAvailableServicesResponse = z.infer<typeof GetAvailableServicesResponseSchema>;
export type Service = NonNullable<GetAvailableServicesResponse["Services"]>[number];
export type ServiceWithId = Service & { id: string };

export enum FunctionalityScope {
  None = 0,
  Create = 1,
  Edit = 2,
  Delete = 4,
  View = 8,
  Manage = 31,
  Settings = 32,
  Scripting = 64,
  All = 127,
}

export type GetAvailableServiceDetailsResponse = z.infer<typeof GetAvailableServiceDetailsResponseSchema>;

export enum UserTypes {
  None = 0,
  Employee = 1,
  Customer = 2,
  Anonymous = 4,
  Business = 8,
  System = 17,
  Debtor = 64,
  LimitedTrust = 256,
  Tester = 512,
  RemovedByRequest = 1024,
  Api = 2048,
}

/**
 * Get all available typed settings
 */
export type GetAvailableSettingsResponse = z.infer<typeof GetAvailableSettingsResponseSchema>;
export type Setting = NonNullable<GetAvailableSettingsResponse["Settings"]>[number];
export type SettingWithId = Setting & { id: string };

export const enum SettingSensitivityTypes {
  Normal = 0,
  Sensitive = 1,
  Masked = 2,
  Encrypted = 6,
  CloudOnly = 8,
}

/**
 * Get the available info about appsettings
 */
export type GetAppSettingsAutocompleteInfoResponse = z.infer<typeof GetAppSettingsAutocompleteInfoResponseSchema>;
export type AppSettingAutocompleteInfo = NonNullable<GetAppSettingsAutocompleteInfoResponse["Settings"]>[number];
export type AppSettingWithId = AppSettingAutocompleteInfo & { id: string };
