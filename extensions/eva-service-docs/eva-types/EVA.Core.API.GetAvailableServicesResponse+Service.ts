import { z } from 'zod';
import { SecurityFunctionalityScopeSchema } from './EVA.Core.Security.FunctionalityScope';

const __APIGetAvailableServicesResponse_ServiceSchema = z.object({
  AllowPublic: z.boolean(),
  AvailableOffline: z.boolean(),
  Functionality: z.string().optional(),
  Name: z.string().optional(),
  Namespace: z.string().optional(),
  RequiresElevation: z.boolean(),
  RequiresSudoMode: z.boolean(),
  Scope: SecurityFunctionalityScopeSchema.optional(),
  Type: z.string().optional(),
});
export const APIGetAvailableServicesResponse_ServiceSchema = __APIGetAvailableServicesResponse_ServiceSchema;


