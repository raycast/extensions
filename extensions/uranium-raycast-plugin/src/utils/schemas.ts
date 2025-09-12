import { z } from "zod";
import { smartContractNameRegex, smartContractSymbolRegex } from "./constants";

export const createSmartContractSchema = z.object({
  name: z
    .string()
    .regex(
      smartContractNameRegex,
      "Name must be between 3 and 30 characters long and can contain only letters, numbers and [_.-] symbols",
    ),
  symbol: z
    .string()
    .regex(
      smartContractSymbolRegex,
      "Identifier must be between 3 and 30 characters long and can contain only letters, numbers and underscores",
    ),
  type: z.enum(["ERC721", "ERC1155"]),
});

export const createAssetSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters long")
    .max(120, "Title must be no more than 120 characters long"),
  description: z.string().max(255, "Description must be no more than 255 characters long").optional(),
  location: z.string().max(100, "Location must be no more than 100 characters long").optional(),
  contractId: z.string().min(1, "Please select a collection"),
  editions: z.number().min(1, "Editions must be at least 1").max(1000, "Editions must be no more than 1000").optional(),
  shareWithCommunity: z.boolean(),
  mediaFile: z.string().array().min(1, "Please select a media file"),
});
