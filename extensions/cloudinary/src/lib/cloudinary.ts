import { getPreferenceValues } from "@raycast/api";
import { v2 as cloudinary } from "cloudinary";

const preferences = getPreferenceValues<Preferences>();

const RESOURCE_INCLUDED_KEYS = ["height", "public_id", "resource_type", "secure_url", "width"];

cloudinary.config({
  cloud_name: preferences.cloudinaryCloudName,
  api_key: preferences.cloudinaryApiKey,
  api_secret: preferences.cloudinaryApiSecret,
  secure: true,
});

/**
 * uploadImage
 */

export async function uploadImage(path: string) {
  const resource = await cloudinary.uploader.upload(path, {
    folder: preferences.cloudinaryUploadFolder,
  });
  return sanitizeResource(resource);
}

/**
 * searchAssets
 */

interface SearchAssets extends Arguments.Search {
  cursor?: string;
}

export async function searchAssets({ query, tag, cursor }: SearchAssets) {
  const expressionSegments = [];

  if (query) {
    expressionSegments.push(query);
  }

  if (tag) {
    expressionSegments.push(`tags:${tag}`);
  }

  const expression = expressionSegments.join(" AND ");

  const { next_cursor, resources } = await cloudinary.search
    .expression(expression)
    .max_results(30)
    .next_cursor(cursor)
    .execute();

  const sanitized = resources.map((resource: object) => sanitizeResource(resource));
  return { resources: sanitized, next_cursor: next_cursor as string | undefined };
}

/**
 * getImageUrl
 */

export function getImageUrl(publicId: string, options?: object) {
  return cloudinary.url(publicId, options);
}

/**
 * sanitizeResource
 */

export function sanitizeResource(resource: object) {
  return Object.fromEntries(Object.entries(resource).filter(([key]) => RESOURCE_INCLUDED_KEYS.includes(key)));
}
