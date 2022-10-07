import { mkdirSync } from 'fs';
import svgToPng from 'svg-to-png';
import { folders, repoPath } from './consts.mjs';

async function main() {
  for (const folder of folders) {
    const pngsPath = `${repoPath}/assets/pngs/${folder}`;
    mkdirSync(pngsPath, { recursive: true });
    console.log(`Converting ${folder}...`);
    await svgToPng.convert(`${repoPath}/assets/svgs/${folder}`, pngsPath, { color: 'white' });
  }
}

main();
