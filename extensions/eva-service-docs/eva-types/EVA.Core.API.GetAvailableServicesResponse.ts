import { z } from 'zod';
import { ServiceErrorSchema } from './EVA.Core.ServiceError';
import { ResponseMessageMetadataSchema } from './EVA.Core.ResponseMessageMetadata';
import { APIGetAvailableServicesResponse_ServiceSchema } from './EVA.Core.API.GetAvailableServicesResponse+Service';

const __GetAvailableServicesResponseSchema = z.object({
  Error: ServiceErrorSchema.optional(),
  Metadata: ResponseMessageMetadataSchema.optional(),
  Services: z.array(APIGetAvailableServicesResponse_ServiceSchema).optional(),
});
export const GetAvailableServicesResponseSchema = __GetAvailableServicesResponseSchema;


