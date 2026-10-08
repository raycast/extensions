/**
 * Base schemas for common bunq API types.
 *
 * These schemas define fundamental types used across multiple domains
 * like Amount, Pointer, Address, and Avatar.
 */

import { z } from "zod";

// ============== Amount & Currency ==============

export const AmountSchema = z
  .object({
    value: z.string(),
    currency: z.string(),
  })
  .passthrough();

// ============== Pointer Schemas ==============

export const PointerSchema = z
  .object({
    type: z.string(),
    value: z.string(),
    name: z.string().optional(),
  })
  .passthrough();

/**
 * Permissive pointer schema for contexts where type/value can be undefined.
 * Used for counterparty_alias in request inquiries/responses where
 * the API sometimes returns objects with undefined type/value.
 */
export const PermissivePointerSchema = z
  .object({
    type: z.string().nullish(),
    value: z.string().nullish(),
    name: z.string().nullish(),
    display_name: z.string().nullish(),
    iban: z.string().nullish(),
    is_light: z.boolean().nullish(),
    avatar: z.unknown().optional(),
    label_user: z.unknown().optional(),
    country: z.string().nullish(),
  })
  .passthrough();

/**
 * Alias structure returned in payment responses.
 * Different from PointerSchema which is used for payment requests.
 * Fields can be null for certain payment types (e.g., MASTERCARD merchant transactions).
 */
export const PaymentAliasSchema = z
  .object({
    iban: z.string().nullish(),
    display_name: z.string().nullish(),
    is_light: z.boolean().nullish(),
    name: z.string().nullish(),
    value: z.string().nullish(),
    type: z.string().nullish(),
    avatar: z.unknown().optional(),
    label_user: z.unknown().optional(),
    country: z.string().nullish(),
  })
  .passthrough();

export const LabelMonetaryAccountSchema = z
  .object({
    iban: z.string().optional(),
    display_name: z.string().optional(),
    merchant_category_code: z.string().optional(),
    avatar: z
      .object({
        uuid: z.string().optional(),
        anchor_uuid: z.string().optional(),
        image: z.array(z.object({ attachment_public_uuid: z.string() }).passthrough()).optional(),
      })
      .passthrough()
      .optional(),
    country: z.string().optional(),
  })
  .passthrough();

// ============== Location Schemas ==============

export const GeolocationSchema = z
  .object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    altitude: z.number().optional(),
    radius: z.number().optional(),
  })
  .passthrough();

export const AddressSchema = z
  .object({
    street: z.string().nullish(),
    house_number: z.string().nullish(),
    po_box: z.string().nullish(),
    postal_code: z.string().nullish(),
    city: z.string().nullish(),
    country: z.string().nullish(),
    province: z.string().nullish(),
  })
  .passthrough();

// ============== Avatar & Image Schemas ==============

export const AvatarSchema = z
  .object({
    uuid: z.string(),
    anchor_uuid: z.string().optional(),
    image: z
      .array(
        z
          .object({
            attachment_public_uuid: z.string(),
            content_type: z.string().optional(),
            height: z.number().optional(),
            width: z.number().optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

// ============== Attachment Schemas ==============

export const AttachmentSchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    attachment: z
      .object({
        description: z.string().optional(),
        content_type: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const AttachmentPublicSchema = z
  .object({
    uuid: z.string(),
    description: z.string().optional(),
    content_type: z.string().optional(),
  })
  .passthrough();

export const NoteAttachmentSchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    label_user_creator: z.unknown().optional(),
    description: z.string().optional(),
    attachment: AttachmentSchema.optional(),
  })
  .passthrough();

export const NoteTextSchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    label_user_creator: z.unknown().optional(),
    content: z.string().optional(),
  })
  .passthrough();

// ============== Pagination Schema ==============

export const PaginationSchema = z
  .object({
    future_url: z.string().nullable().optional(),
    newer_url: z.string().nullable().optional(),
    older_url: z.string().nullable().optional(),
  })
  .passthrough();

// ============== Common Response Schemas ==============

export const IdResponseSchema = z
  .object({
    Id: z.object({ id: z.number() }).passthrough(),
  })
  .passthrough();

export const UuidResponseSchema = z
  .object({
    Uuid: z.object({ uuid: z.string() }).passthrough(),
  })
  .passthrough();

// ============== Type Exports ==============

export type Amount = z.infer<typeof AmountSchema>;
export type Pointer = z.infer<typeof PointerSchema>;
export type PaymentAlias = z.infer<typeof PaymentAliasSchema>;
export type Geolocation = z.infer<typeof GeolocationSchema>;
export type Address = z.infer<typeof AddressSchema>;
export type Avatar = z.infer<typeof AvatarSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type NoteAttachment = z.infer<typeof NoteAttachmentSchema>;
export type NoteText = z.infer<typeof NoteTextSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
