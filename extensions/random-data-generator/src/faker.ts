import { faker } from '@faker-js/faker';
import cuid from '@bugsnag/cuid';

// Hack since faker-js doesn't support CUIDs or a way to extend its API
(faker.datatype as any).cuid = () => cuid();

export default faker;
