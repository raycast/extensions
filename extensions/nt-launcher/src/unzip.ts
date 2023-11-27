import fs from 'fs';
import unzipper from 'unzipper';

export async function unzipFile(zipFilePath: string, outputPath: string) {
  return await new Promise<void>((resolve, reject) => {
    fs.createReadStream(zipFilePath)
      .pipe(unzipper.Parse())
      .on('error', reject)
      .on('finish', resolve)
      .on('entry', (entry) => {
        if (entry.type === 'Directory') {
          entry.autodrain();
        } else {
          entry.pipe(fs.createWriteStream(`${outputPath}`));
        }
      });
  });
};