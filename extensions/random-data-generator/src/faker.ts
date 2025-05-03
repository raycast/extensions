import cuid from "@bugsnag/cuid";
import type { Faker as OriginalFaker } from "@faker-js/faker";
import { faker } from "@faker-js/faker";

// Hack since faker-js doesn't support CUIDs or a way to extend its API
(faker.datatype as unknown as { cuid: () => string }).cuid = () => cuid();

export type Faker = OriginalFaker & {
  datatype: typeof faker.datatype & {
    cuid: () => string;
  };
};

export default faker as Faker;
