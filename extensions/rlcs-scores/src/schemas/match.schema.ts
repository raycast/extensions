import { z } from "zod";

const teamStatsSchema = z.object({
  core: z.object({
    shots: z.number(),
    goals: z.number(),
    saves: z.number(),
    assists: z.number(),
    score: z.number(),
    shootingPercentage: z.number(),
  }),
});

const teamSchema = z.object({
  team: z.object({
    slug: z.string(),
    name: z.string(),
    region: z.string(),
    image: z.string(),
  }),
  stats: teamStatsSchema,
});

const gameSchema = z.object({
  _id: z.string(),
  blue: z.number(),
  orange: z.number(),
  duration: z.number(),
  overtime: z.boolean(),
  ballchasing: z.string(),
});

export const matchSchema = z.object({
  _id: z.string(),
  date: z.string(),
  stage: z.object({
    name: z.string(),
  }),
  blue: z.object({
    winner: z.boolean().optional(),
    team: teamSchema,
    score: z.number(),
  }),
  orange: z.object({
    winner: z.boolean().optional(),
    team: teamSchema,
    score: z.number(),
  }),
  games: z.array(gameSchema).optional(),
});
