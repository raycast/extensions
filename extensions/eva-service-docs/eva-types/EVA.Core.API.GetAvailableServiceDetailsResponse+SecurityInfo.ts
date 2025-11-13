import { z } from 'zod';
import { APIGetAvailableServiceDetailsResponse_FunctionalityInfoSchema } from './EVA.Core.API.GetAvailableServiceDetailsResponse+FunctionalityInfo';
import { UserTypesSchema } from './EVA.Core.UserTypes';

const __APIGetAvailableServiceDetailsResponse_SecurityInfoSchema = z.object({
  AllowPublic: z.boolean(),
  RequiredFunctionalities: z.array(APIGetAvailableServiceDetailsResponse_FunctionalityInfoSchema).optional(),
  RequiredUserType: UserTypesSchema,
  RequiresAuthentication: z.boolean(),
});
export const APIGetAvailableServiceDetailsResponse_SecurityInfoSchema = __APIGetAvailableServiceDetailsResponse_SecurityInfoSchema;


