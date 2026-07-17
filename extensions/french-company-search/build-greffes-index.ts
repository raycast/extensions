#!/usr/bin/env ts-node

/**
 * Builds greffe index from official Datainfogreffe CSV source
 * Downloads and processes the latest court registry mappings
 * 
 * Usage: npm run build-greffes
 */

import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { compressGreffeData, validateCompression } from './src/lib/greffe-compressor';

// --- Configuration ---
const DATA_DIR = path.resolve(__dirname, 'data');
const ASSETS_DIR = path.resolve(__dirname, 'assets');
const CSV_FILE = path.join(DATA_DIR, 'referentiel.csv');
const OUTPUT_JSON = path.join(ASSETS_DIR, 'greffes-index.json');
const COMPRESSED_OUTPUT = path.join(ASSETS_DIR, 'greffes-index-compressed.json');

// Expected CSV columns (from Datainfogreffe)
const CSV_COLUMNS = {
  CODE_POSTAL: 'Code postal',
  CODE_INSEE: 'Code commune', 
  GREFFE: 'Greffe',
  COMMUNE: 'Commune'
};

interface BuildStats {
  totalRows: number;
  validPostalCodes: number;
  validInseeCodes: number;
  uniqueGreffes: Set<string>;
  errors: string[];
  startTime: number;
}

async function validateCsvFile(): Promise<void> {
  if (!fs.existsSync(CSV_FILE)) {
    throw new Error(
      `❌ CSV source file not found: ${CSV_FILE}\n\n` +
      `To update greffe data:\n` +
      `1. Download from: https://opendata.datainfogreffe.fr/explore/assets/referentiel-communes-greffes/\n` +
      `2. Export as CSV with semicolon separator\n` +
      `3. Save as: ${CSV_FILE}\n`
    );
  }

  const stats = fs.statSync(CSV_FILE);
  const sizeKB = Math.round(stats.size / 1024);
  
  console.log(`📁 Source CSV found: ${sizeKB} KB`);
  console.log(`📅 Last modified: ${stats.mtime.toLocaleDateString()}`);
}

async function buildIndexFromCsv(): Promise<{ postalIndex: Record<string, string>, stats: BuildStats }> {
  const stats: BuildStats = {
    totalRows: 0,
    validPostalCodes: 0,
    validInseeCodes: 0,
    uniqueGreffes: new Set(),
    errors: [],
    startTime: Date.now()
  };

  const indexByCodePostal: Record<string, string> = {};
  const indexByCodeInsee: Record<string, string> = {};

  return new Promise((resolve, reject) => {
    console.log('\n📖 Reading CSV and building indices...');

    fs.createReadStream(CSV_FILE)
      .pipe(csv({ separator: ';' }))
      .on('data', (row: Record<string, string>) => {
        stats.totalRows++;

        const codePostalRaw = row[CSV_COLUMNS.CODE_POSTAL]?.trim();
        const codeInsee = row[CSV_COLUMNS.CODE_INSEE]?.trim();
        const nomGreffe = row[CSV_COLUMNS.GREFFE]?.trim();

        // Validate required fields
        if (!nomGreffe) {
          stats.errors.push(`Row ${stats.totalRows}: Missing greffe name`);
          return;
        }

        // Process postal code
        if (codePostalRaw) {
          // Normalize postal code (pad with leading zeros if needed)
          const codePostal = codePostalRaw.padStart(5, '0');
          
          // Validate postal code format (5 digits)
          if (!/^\d{5}$/.test(codePostal)) {
            stats.errors.push(`Row ${stats.totalRows}: Invalid postal code format: ${codePostalRaw}`);
          } else {
            indexByCodePostal[codePostal] = nomGreffe;
            stats.validPostalCodes++;
            stats.uniqueGreffes.add(nomGreffe);
          }
        }

        // Process INSEE code
        if (codeInsee) {
          indexByCodeInsee[codeInsee] = nomGreffe;
          stats.validInseeCodes++;
        }

        // Progress indicator for large files
        if (stats.totalRows % 1000 === 0) {
          process.stdout.write(`\r   Processing row ${stats.totalRows}...`);
        }
      })
      .on('end', () => {
        process.stdout.write('\r'); // Clear progress line
        console.log(`✅ Processed ${stats.totalRows} rows`);
        console.log(`   Valid postal codes: ${stats.validPostalCodes}`);
        console.log(`   Valid INSEE codes: ${stats.validInseeCodes}`);
        console.log(`   Unique greffes: ${stats.uniqueGreffes.size}`);
        
        if (stats.errors.length > 0) {
          console.log(`⚠️  Warnings: ${stats.errors.length}`);
          stats.errors.slice(0, 5).forEach(error => console.log(`   • ${error}`));
          if (stats.errors.length > 5) {
            console.log(`   • ... and ${stats.errors.length - 5} more`);
          }
        }

        resolve({ 
          postalIndex: indexByCodePostal, 
          stats 
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

async function saveIndexFile(postalIndex: Record<string, string>, stats: BuildStats): Promise<void> {
  // Create assets directory if needed
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
    console.log(`📁 Created assets directory: ${ASSETS_DIR}`);
  }

  // Prepare final index structure
  const finalIndex = {
    byCodePostal: postalIndex,
    metadata: {
      source: 'Datainfogreffe Référentiel Communes-Greffes',
      buildDate: new Date().toISOString(),
      totalEntries: Object.keys(postalIndex).length,
      uniqueGreffes: stats.uniqueGreffes.size,
      dataSource: 'https://opendata.datainfogreffe.fr/explore/assets/referentiel-communes-greffes/'
    }
  };

  // Write full index
  const jsonContent = JSON.stringify(finalIndex, null, 2);
  fs.writeFileSync(OUTPUT_JSON, jsonContent);
  
  const fileSize = Math.round(fs.statSync(OUTPUT_JSON).size / 1024);
  console.log(`\n💾 Greffe index created: ${OUTPUT_JSON} (${fileSize} KB)`);
}

async function compressIndex(postalIndex: Record<string, string>): Promise<void> {
  console.log('\n🗜️  Compressing index for optimal performance...');
  
  const compressed = compressGreffeData(postalIndex);
  
  console.log(`   Compression: ${compressed.metadata.compressionRatio}% data reduction`);
  console.log(`   Ranges: ${compressed.ranges.length}`);
  console.log(`   Singles: ${Object.keys(compressed.singles).length}`);

  // Validate compression
  const validation = validateCompression(postalIndex, compressed);
  if (!validation.valid) {
    console.error('❌ Compression validation failed:');
    validation.errors.forEach(error => console.error(`   • ${error}`));
    throw new Error('Compression produced incorrect results');
  }

  // Save compressed version
  const compressedJson = JSON.stringify(compressed, null, 2);
  fs.writeFileSync(COMPRESSED_OUTPUT, compressedJson);
  
  const originalSize = fs.statSync(OUTPUT_JSON).size;
  const compressedSize = fs.statSync(COMPRESSED_OUTPUT).size;
  const realCompression = ((originalSize - compressedSize) / originalSize * 100);
  
  console.log(`✅ Compressed index: ${COMPRESSED_OUTPUT}`);
  console.log(`   File size reduction: ${realCompression.toFixed(1)}%`);
}

async function main() {
  console.log('🏛️  Building Greffe Index from Official Data\n');
  
  try {
    // 1. Validate source file
    await validateCsvFile();
    
    // 2. Build index from CSV
    const { postalIndex, stats } = await buildIndexFromCsv();
    
    // 3. Save full index
    await saveIndexFile(postalIndex, stats);
    
    // 4. Create compressed version
    await compressIndex(postalIndex);
    
    // 5. Summary
    const buildTime = Date.now() - stats.startTime;
    console.log(`\n🎉 Build completed successfully in ${buildTime}ms`);
    console.log('\n📊 Summary:');
    console.log(`   Source rows: ${stats.totalRows}`);
    console.log(`   Valid entries: ${stats.validPostalCodes}`);
    console.log(`   Unique greffes: ${stats.uniqueGreffes.size}`);
    console.log(`   Output files: 2 (full + compressed)`);
    
    if (stats.errors.length > 0) {
      console.log(`   Warnings: ${stats.errors.length} (data quality issues)`);
    }

  } catch (error) {
    console.error('\n❌ Build failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}