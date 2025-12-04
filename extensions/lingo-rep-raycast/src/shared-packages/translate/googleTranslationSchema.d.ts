import { z } from "zod";
export declare const googleTranslationSchema: z.ZodObject<
  {
    sentences: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            trans: z.ZodString;
            orig: z.ZodString;
            backend: z.ZodNumber;
          },
          "strip",
          z.ZodTypeAny,
          {
            trans: string;
            orig: string;
            backend: number;
          },
          {
            trans: string;
            orig: string;
            backend: number;
          }
        >,
        "many"
      >
    >;
    dict: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            pos: z.ZodString;
            terms: z.ZodArray<z.ZodString, "many">;
            entry: z.ZodArray<
              z.ZodObject<
                {
                  word: z.ZodString;
                  reverse_translation: z.ZodArray<z.ZodString, "many">;
                  score: z.ZodOptional<z.ZodNumber>;
                },
                "strip",
                z.ZodTypeAny,
                {
                  word: string;
                  reverse_translation: string[];
                  score?: number | undefined;
                },
                {
                  word: string;
                  reverse_translation: string[];
                  score?: number | undefined;
                }
              >,
              "many"
            >;
            base_form: z.ZodString;
            pos_enum: z.ZodNumber;
          },
          "strip",
          z.ZodTypeAny,
          {
            pos: string;
            terms: string[];
            entry: {
              word: string;
              reverse_translation: string[];
              score?: number | undefined;
            }[];
            base_form: string;
            pos_enum: number;
          },
          {
            pos: string;
            terms: string[];
            entry: {
              word: string;
              reverse_translation: string[];
              score?: number | undefined;
            }[];
            base_form: string;
            pos_enum: number;
          }
        >,
        "many"
      >
    >;
    src: z.ZodOptional<z.ZodString>;
    ld_result: z.ZodOptional<
      z.ZodObject<
        {
          srclangs: z.ZodArray<z.ZodString, "many">;
          srclangs_confidences: z.ZodArray<z.ZodNumber, "many">;
          extended_srclangs: z.ZodArray<z.ZodString, "many">;
        },
        "strip",
        z.ZodTypeAny,
        {
          srclangs: string[];
          srclangs_confidences: number[];
          extended_srclangs: string[];
        },
        {
          srclangs: string[];
          srclangs_confidences: number[];
          extended_srclangs: string[];
        }
      >
    >;
    spell: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    confidence: z.ZodOptional<z.ZodNumber>;
  },
  "strip",
  z.ZodTypeAny,
  {
    spell: Record<string, unknown>;
    sentences?:
      | {
          trans: string;
          orig: string;
          backend: number;
        }[]
      | undefined;
    dict?:
      | {
          pos: string;
          terms: string[];
          entry: {
            word: string;
            reverse_translation: string[];
            score?: number | undefined;
          }[];
          base_form: string;
          pos_enum: number;
        }[]
      | undefined;
    src?: string | undefined;
    ld_result?:
      | {
          srclangs: string[];
          srclangs_confidences: number[];
          extended_srclangs: string[];
        }
      | undefined;
    confidence?: number | undefined;
  },
  {
    spell: Record<string, unknown>;
    sentences?:
      | {
          trans: string;
          orig: string;
          backend: number;
        }[]
      | undefined;
    dict?:
      | {
          pos: string;
          terms: string[];
          entry: {
            word: string;
            reverse_translation: string[];
            score?: number | undefined;
          }[];
          base_form: string;
          pos_enum: number;
        }[]
      | undefined;
    src?: string | undefined;
    ld_result?:
      | {
          srclangs: string[];
          srclangs_confidences: number[];
          extended_srclangs: string[];
        }
      | undefined;
    confidence?: number | undefined;
  }
>;
export type GoogleTranslation = z.infer<typeof googleTranslationSchema>;
