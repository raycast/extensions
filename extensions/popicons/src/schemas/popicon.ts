import { z } from "zod";

const Popicon = z.object({
  category: z.string(),
  name: z.string(),
  tags: z.array(z.string()),
  variantLineSVG: z.string(),
  variantSolidSVG: z.string(),
  variantDuotoneSVG: z.string(),
});

type Popicon = z.infer<typeof Popicon>;

export { Popicon };
