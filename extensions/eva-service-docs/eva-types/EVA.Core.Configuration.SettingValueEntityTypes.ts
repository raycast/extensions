import { z } from 'zod';

/**
 * @enum
 * @property None (0)
 * @property OrganizationUnit (1)
 * @property EndpointConfiguration (2)
 */
export const ConfigurationSettingValueEntityTypes = {
    None: 0,
    OrganizationUnit: 1,
    EndpointConfiguration: 2,
} as const;

export const ConfigurationSettingValueEntityTypesSchema = z.nativeEnum(ConfigurationSettingValueEntityTypes);

