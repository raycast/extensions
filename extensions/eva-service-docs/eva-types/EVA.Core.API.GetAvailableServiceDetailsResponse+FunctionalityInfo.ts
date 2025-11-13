import { z } from 'zod';
import { SecurityFunctionalityScopeSchema } from './EVA.Core.Security.FunctionalityScope';

const __APIGetAvailableServiceDetailsResponse_FunctionalityInfoSchema = z.object({
  Functionality: z.string().optional(),
  Scope: SecurityFunctionalityScopeSchema,
});
export const APIGetAvailableServiceDetailsResponse_FunctionalityInfoSchema = __APIGetAvailableServiceDetailsResponse_FunctionalityInfoSchema;


