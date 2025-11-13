import { z } from 'zod';
import { ServiceErrorSchema } from './EVA.Core.ServiceError';
import { ResponseMessageMetadataSchema } from './EVA.Core.ResponseMessageMetadata';
import { APIGetAvailableServiceDetailsResponse_TypeDefinitionSchema } from './EVA.Core.API.GetAvailableServiceDetailsResponse+TypeDefinition';
import { APIGetAvailableServiceDetailsResponse_RouteSchema } from './EVA.Core.API.GetAvailableServiceDetailsResponse+Route';
import { APIGetAvailableServiceDetailsResponse_SecurityInfoSchema } from './EVA.Core.API.GetAvailableServiceDetailsResponse+SecurityInfo';

const __GetAvailableServiceDetailsResponseSchema = z.object({
  AvailableOffline: z.boolean(),
  Deprecation: z.string().optional(),
  Description: z.string().optional(),
  Error: ServiceErrorSchema.optional(),
  Metadata: ResponseMessageMetadataSchema.optional(),
  Request: APIGetAvailableServiceDetailsResponse_TypeDefinitionSchema.optional(),
  Response: APIGetAvailableServiceDetailsResponse_TypeDefinitionSchema.optional(),
  Routes: z.array(APIGetAvailableServiceDetailsResponse_RouteSchema).optional(),
  Security: APIGetAvailableServiceDetailsResponse_SecurityInfoSchema.optional(),
});
export const GetAvailableServiceDetailsResponseSchema = __GetAvailableServiceDetailsResponseSchema;


