// transform/build-greffes-index.ts
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

// --- Configuration ---
const csvFilePath = path.resolve(__dirname, '..', 'data', 'referentiel.csv');
const outputJsonPath = path.resolve(__dirname, '..', 'assets', 'greffes-index.json');
// -------------------

const indexByCodePostal: { [code: string]: string } = {};
const indexByCodeInsee: { [code: string]: string } = {};

console.log('Lecture du fichier CSV et construction des index...');

fs.createReadStream(csvFilePath)
  .pipe(csv({ separator: ';' }))
  .on('data', (row: { [key: string]: string }) => {
    const codePostalRaw = row['Code postal'];
    const codeInsee = row['Code commune'];
    const nomGreffe = row['Greffe'];

    if (codePostalRaw && nomGreffe) {
      // **CORRECTION : Normalisation du code postal**
      // Assure que le code postal a bien 5 chiffres en ajoutant un '0' si nécessaire.
      const codePostalPadded = codePostalRaw.padStart(5, '0');
      indexByCodePostal[codePostalPadded] = nomGreffe;
    }
    if (codeInsee && nomGreffe) {
      indexByCodeInsee[codeInsee] = nomGreffe;
    }
  })
  .on('end', () => {
    const finalIndex = {
      byCodePostal: indexByCodePostal,
      byCodeInsee: indexByCodeInsee,
    };

    const assetsDir = path.dirname(outputJsonPath);
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }

    fs.writeFileSync(outputJsonPath, JSON.stringify(finalIndex, null, 2));
    console.log(`Index des greffes créé avec succès : ${outputJsonPath}`);
  })
  .on('error', (error: Error) => {
    console.error('Erreur lors de la lecture du CSV:', error);
  });