import { z } from "zod";

const Popicon = z.object({
  category: z.string(),
  icon: z.string(),
  tags: z.array(z.string()),
  svg: z.string(),
});

type Popicon = z.infer<typeof Popicon>;

export { Popicon };
