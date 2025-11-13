import { z } from 'zod';

const __APIGetAvailableServiceDetailsResponse_TypeDefinitionSchema = z.object({
  Deprecation: z.string().optional(),
  Description: z.string().optional(),
  Name: z.string().optional(),
  Namespace: z.string().optional(),
  Optional: z.boolean(),
  Type: z.string().optional(),
});
type _APIGetAvailableServiceDetailsResponse_TypeDefinitionSchema = z.infer<typeof __APIGetAvailableServiceDetailsResponse_TypeDefinitionSchema> & {
  Fields?: _APIGetAvailableServiceDetailsResponse_TypeDefinitionSchema[],
};
export const APIGetAvailableServiceDetailsResponse_TypeDefinitionSchema: z.ZodType<_APIGetAvailableServiceDetailsResponse_TypeDefinitionSchema> = __APIGetAvailableServiceDetailsResponse_TypeDefinitionSchema.extend({
  Fields: z.lazy(() => z.array(APIGetAvailableServiceDetailsResponse_TypeDefinitionSchema).optional()),
});


