import { initContract } from "@ts-rest/core";
import { any, z } from "zod";
import { getRouteResponses } from "../helpers/get-route-response";
import { ErrorDetailSchema, ErrorMessageSchema } from "../types/error";
import { MembershipSchema } from "../types/membership";
import { OrganizationSchema } from "../types/organization";
import { PaginateSchema } from "../types/paginate";
import { TransactionSchema } from "../types/transaction";

const c = initContract();

export const contract = c.router({
  getOrganization: {
    summary: "Get organization",
    method: "GET",
    path: "/organization",
    responses: {
      200: z.object({
        organization: OrganizationSchema,
      }),
      401: ErrorDetailSchema,
    },
  },
  getTransactions: {
    summary: "Get transactions",
    method: "GET",
    path: `/transactions`,
    query: z.object({
      iban: z.string(),
      side: TransactionSchema.pick({ side: true }).optional(),
      current_page: z.number().optional(),
    }),
    responses: {
      200: z.object({
        transactions: z.array(TransactionSchema),
        meta: PaginateSchema,
      }),
      400: ErrorMessageSchema,
      401: ErrorDetailSchema,
      404: any, // doc is ambiguous
      422: ErrorDetailSchema,
    },
  },
  getMemberships: {
    summary: "Get memberships",
    method: "GET",
    path: `/memberships`,
    responses: {
      200: z.object({
        memberships: z.array(MembershipSchema),
        meta: PaginateSchema,
      }),
      400: ErrorMessageSchema,
    },
  },
});

export const contractResponses = getRouteResponses(contract);
export type ContractResponses = typeof contractResponses;
