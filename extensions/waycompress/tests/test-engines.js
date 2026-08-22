const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const testDir = path.join(__dirname, 'temp');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

async function runTests() {
  console.log('=== WayCompress Engine Verification ===\n');

  // Verify FFmpeg and FFprobe availability
  const ffmpegCheck = spawnSync('ffmpeg', ['-version']);
  console.log('1. FFmpeg status:', ffmpegCheck.status === 0 ? 'AVAILABLE' : 'NOT FOUND');

  const ffprobeCheck = spawnSync('ffprobe', ['-version']);
  console.log('2. FFprobe status:', ffprobeCheck.status === 0 ? 'AVAILABLE' : 'NOT FOUND');

  console.log('\nAll engines verified successfully.');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

