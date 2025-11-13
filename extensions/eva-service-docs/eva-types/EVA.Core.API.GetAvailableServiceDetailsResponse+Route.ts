import { z } from 'zod';

const __APIGetAvailableServiceDetailsResponse_RouteSchema = z.object({
  Method: z.string().optional(),
  Path: z.string().optional(),
});
export const APIGetAvailableServiceDetailsResponse_RouteSchema = __APIGetAvailableServiceDetailsResponse_RouteSchema;


