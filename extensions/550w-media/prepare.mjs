import fs from 'node:fs';
import {format} from 'prettier';
// Resolve the canonical source independently of the caller's working directory.
const source = new URL('../../shared/native-api/open-api.mjs', import.meta.url);
const generated = new URL('src/generated/api.mjs', import.meta.url);
fs.mkdirSync(new URL('src/generated/', import.meta.url), { recursive: true });
if (fs.existsSync(source)) fs.writeFileSync(generated, await format(fs.readFileSync(source, 'utf8'), {parser:'babel'}));
else if (!fs.existsSync(generated)) throw new Error('Missing bundled Open API source');
// Keep the reviewed local icon; do not overwrite it from a compatibility path.
