import sharp from 'sharp';
import path from 'path';

async function convertAoLogo() {
    const inputPath = path.join(process.cwd(), 'assets', 'ao.svg');
    const outputPath = path.join(process.cwd(), 'assets', 'ao.png');

    try {
        await sharp(inputPath)
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .flatten({ background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .png()
            .toFile(outputPath);

        console.log('Successfully converted ao.svg to ao.png');
    } catch (error) {
        console.error('Error converting ao.svg to PNG:', error);
        process.exit(1);
    }
}

convertAoLogo(); 