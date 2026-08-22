const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const src1 = path.join(root, 'waycompressrevamped.png');
const src2 = path.join(root, 'waycompress.png');
const out1 = path.join(root, 'metadata', 'waycompress-1.png');
const out2 = path.join(root, 'metadata', 'waycompress-2.png');

function resizeImage(input, output) {
  const padFilter = 'scale=2000:1250:force_original_aspect_ratio=decrease,pad=2000:1250:(ow-iw)/2:(oh-ih)/2:color=0x18181b';
  const res = spawnSync('ffmpeg', ['-y', '-i', input, '-vf', padFilter, output]);
  if (res.status !== 0) {
    console.error('Failed to resize', input, res.stderr.toString());
  } else {
    console.log('Successfully resized to 2000x1250 ->', output);
  }
}

resizeImage(src1, out1);
resizeImage(src2, out2);
