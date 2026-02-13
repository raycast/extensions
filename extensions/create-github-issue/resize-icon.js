const { Jimp } = require("jimp");
const path = require("path");

const iconPath = path.resolve(__dirname, "assets/icon.png");

async function resizeIcon() {
    try {
        const image = await Jimp.read(iconPath);
        // Resize to contain within 512x512, preserving aspect ratio
        // If not square, padding will be needed? Raycast says "Wrong image size: 734 x 632 pixels. Required size is 512 x 512 pixels"
        // So distinct dimensions.
        // If I just resize to cover 512x512, I might crop.
        // If I resize to contain, I need to add padding (transparent).
        // Let's use `contain` which adds padding (default black? or transparent?)
        // Jimp's contain alignment.

        // Actually, jimp's `contain` method:
        // image.contain( w, h, [alignBits || mode, [mode]], [cb] )
        // alignBits is tricky.

        // Let's manually do it:
        // 1. Resize image so largest dimension is 512
        // 2. Create new 512x512 transparent image
        // 3. Composite resized image onto center

        const maxDim = 512;
        let w = image.bitmap.width;
        let h = image.bitmap.height;

        if (w > h) {
            h = Math.round(h * (maxDim / w));
            w = maxDim;
        } else {
            w = Math.round(w * (maxDim / h));
            h = maxDim;
        }

        image.resize({ w, h }); // use options object? In v1: resize({ w, h }) or resize(w, h)
        // In v0 it was resize(w, h). In v1 let's assume resize(w, h) works or check docs.
        // Actually, let's stick to standard resize(w, h).

        const canvas = new Jimp({ width: 512, height: 512, color: 0x00000000 }); // Transparent
        // Composite
        const x = Math.floor((512 - w) / 2);
        const y = Math.floor((512 - h) / 2);

        canvas.composite(image, x, y);

        await canvas.write(iconPath);
        console.log("Resized icon to 512x512 successfully.");

    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

resizeIcon();
