import { Processor } from '../createOrderedProcessor';
import { regex as r } from '../regex';
import { regexSourceRanges as rsr } from '../regexSource';

// ex: 123%增长 => 123% 增长
// note: it could add space before end of sentence, e.g. `123% .`
export const add_space_after_units: Processor = (input) =>
  input.replace(r.of(rsr.units).wrap().after('[0-9]').before(`\\S`).$(), '$1 ');
