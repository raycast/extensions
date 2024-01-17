import { z } from 'zod';

const maxByteSize = 5 * 1024 * 1024; // 10MB in bytes

export const createNoteSchema = z.object({
  content: z.array(z.record(z.any())),
  description: z.string()
    .min(2, {
      message: "Description must be at least 2 characters.",
    })
    .max(300, {
      message: "Description must be less than 300 characters.",
    }),
}).refine((data) => {
  const byteSize = new TextEncoder().encode(JSON.stringify(data.content)).byteLength;
  return byteSize < maxByteSize;
}, {
  message: `Note content must be less than ${maxByteSize / 1024 / 1024}MB.`,
})
