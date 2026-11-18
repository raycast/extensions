/**
 * User-related schemas.
 */

import { z } from "zod";
import { PointerSchema, AddressSchema, AvatarSchema } from "./base";

// ============== User Schemas ==============

export const UserPersonSchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    public_uuid: z.string().optional(),
    first_name: z.string().nullish(),
    middle_name: z.string().nullish(),
    last_name: z.string().nullish(),
    legal_name: z.string().nullish(),
    display_name: z.string().nullish(),
    public_nick_name: z.string().nullish(),
    alias: z.array(PointerSchema).optional(),
    address_main: AddressSchema.nullish(),
    address_postal: AddressSchema.nullish(),
    avatar: AvatarSchema.optional(),
    date_of_birth: z.string().nullish(),
    place_of_birth: z.string().nullish(),
    country_of_birth: z.string().nullish(),
    nationality: z.string().nullish(),
    language: z.string().nullish(),
    region: z.string().nullish(),
    gender: z.string().nullish(),
    status: z.string().optional(),
    sub_status: z.string().optional(),
    session_timeout: z.number().optional(),
    notification_filters: z.array(z.unknown()).optional(),
    version_terms_of_service: z.string().nullish(),
  })
  .passthrough();

export const UserCompanySchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    public_uuid: z.string().optional(),
    name: z.string().optional(),
    display_name: z.string().optional(),
    public_nick_name: z.string().optional(),
    alias: z.array(PointerSchema).optional(),
    address_main: AddressSchema.optional(),
    address_postal: AddressSchema.optional(),
    avatar: AvatarSchema.optional(),
    chamber_of_commerce_number: z.string().optional(),
    status: z.string().optional(),
    sub_status: z.string().optional(),
    session_timeout: z.number().optional(),
  })
  .passthrough();

// ============== Type Exports ==============

export type UserPerson = z.infer<typeof UserPersonSchema>;
export type UserCompany = z.infer<typeof UserCompanySchema>;
