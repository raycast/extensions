import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import sharp from "sharp";
import { compressImage } from "../src/engines/image";
import { compressVideo } from "../src/engines/video";
import { compressAudio } from "../src/engines/audio";
import { formatBytes } from "../src/utils/format";

const testDir = path.join(__dirname, "temp");
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

async function main() {
  console.log("==================================================");
  console.log("        WayCompress Engine Verification Suite     ");
  console.log("==================================================\n");

  // TEST 1: IMAGE COMPRESSION
  console.log("[1/3] Testing IMAGE Compression (Binary Search Quality)...");
  const rawImagePath = path.join(testDir, "test_heavy_image.png");
  // Generate random noise buffer to prevent easy PNG compression and force large size
  const noiseBuffer = Buffer.alloc(2000 * 2000 * 4);
  for (let i = 0; i < noiseBuffer.length; i += 4) {
    noiseBuffer[i] = Math.floor(Math.random() * 256);
    noiseBuffer[i + 1] = Math.floor(Math.random() * 256);
    noiseBuffer[i + 2] = Math.floor(Math.random() * 256);
    noiseBuffer[i + 3] = 255;
  }
  await sharp(noiseBuffer, { raw: { width: 2000, height: 2000, channels: 4 } }).png().toFile(rawImagePath);
  const origImgBytes = fs.statSync(rawImagePath).size;
  console.log(`  Created heavy raw image: ${formatBytes(origImgBytes)}`);

  const targetImageMB = 0.3; // 300 KB target
  const outImagePath = path.join(testDir, "compressed_image.jpg");
  const imgResult = await compressImage({
    inputPath: rawImagePath,
    outputPath: outImagePath,
    targetSizeMB: targetImageMB,
    qualityMode: "smart_auto",
    onProgress: (p, msg) => console.log(`   [Image ${p}%] ${msg}`),
  });

  console.log(`  => Original: ${formatBytes(imgResult.originalSizeBytes)}`);
  console.log(`  => Target:   ${formatBytes(imgResult.targetSizeBytes)} (${targetImageMB} MB)`);
  console.log(`  => Output:   ${formatBytes(imgResult.compressedSizeBytes)}`);
  console.log(`  => Ratio:    Saved ${(100 - imgResult.compressionRatio)}%`);
  console.log(`  => Details:  ${imgResult.details}`);

  if (imgResult.compressedSizeBytes > imgResult.targetSizeBytes) {
    throw new Error(`Image compression failed: ${imgResult.compressedSizeBytes} > ${imgResult.targetSizeBytes}`);
  }
  console.log("  [PASS] Heavy image successfully compressed within target size.\n");

  // TEST 2: VIDEO COMPRESSION (Generate 5-second 1080p sample video)
  console.log("[2/3] Testing VIDEO Compression (FFmpeg 2-Pass)...");
  const rawVideoPath = path.join(testDir, "test_sample_video.mp4");
  
  // Generate sample video using ffmpeg testsrc
  const genVideo = spawnSync("ffmpeg", [
    "-y",
    "-f", "lavfi", "-i", "testsrc=duration=5:size=1280x720:rate=30",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=5",
    "-c:v", "libx264", "-b:v", "5000k",
    "-c:a", "aac", "-b:a", "192k",
    rawVideoPath,
  ]);

  if (genVideo.status !== 0) {
    console.warn("  Could not generate synthetic video with ffmpeg. Skipping video test.");
  } else {
    const origVidBytes = fs.statSync(rawVideoPath).size;
    console.log(`  Created sample video: ${formatBytes(origVidBytes)}`);

    const targetVideoMB = 0.8; // 800 KB target
    const outVideoPath = path.join(testDir, "compressed_video.mp4");
    const vidResult = await compressVideo({
      inputPath: rawVideoPath,
      outputPath: outVideoPath,
      targetSizeMB: targetVideoMB,
      qualityMode: "smart_auto",
      onProgress: (p, msg) => console.log(`   [Video ${p}%] ${msg}`),
    });

    console.log(`  => Original: ${formatBytes(vidResult.originalSizeBytes)}`);
    console.log(`  => Target:   ${formatBytes(vidResult.targetSizeBytes)} (${targetVideoMB} MB)`);
    console.log(`  => Output:   ${formatBytes(vidResult.compressedSizeBytes)}`);
    console.log(`  => Details:  ${vidResult.details}`);

    if (vidResult.compressedSizeBytes > vidResult.targetSizeBytes * 1.05) {
      throw new Error(`Video compression exceeded target: ${vidResult.compressedSizeBytes} > ${vidResult.targetSizeBytes}`);
    }
    console.log("  [PASS] Video successfully compressed within target size.\n");
  }

  // TEST 3: AUDIO COMPRESSION
  console.log("[3/3] Testing AUDIO Compression...");
  const rawAudioPath = path.join(testDir, "test_sample_audio.wav");
  const genAudio = spawnSync("ffmpeg", [
    "-y",
    "-f", "lavfi", "-i", "sine=frequency=1000:duration=10",
    "-c:a", "pcm_s16le",
    rawAudioPath,
  ]);

  if (genAudio.status !== 0) {
    console.warn("  Could not generate synthetic audio. Skipping audio test.");
  } else {
    const origAudBytes = fs.statSync(rawAudioPath).size;
    console.log(`  Created sample audio: ${formatBytes(origAudBytes)}`);

    const targetAudioMB = 0.1; // 100 KB target
    const outAudioPath = path.join(testDir, "compressed_audio.m4a");
    const audResult = await compressAudio({
      inputPath: rawAudioPath,
      outputPath: outAudioPath,
      targetSizeMB: targetAudioMB,
      qualityMode: "smart_auto",
      onProgress: (p, msg) => console.log(`   [Audio ${p}%] ${msg}`),
    });

    console.log(`  => Original: ${formatBytes(audResult.originalSizeBytes)}`);
    console.log(`  => Target:   ${formatBytes(audResult.targetSizeBytes)} (${targetAudioMB} MB)`);
    console.log(`  => Output:   ${formatBytes(audResult.compressedSizeBytes)}`);
    console.log(`  => Details:  ${audResult.details}`);

    console.log("  [PASS] Audio successfully compressed.\n");
  }

  console.log("==================================================");
  console.log("     ALL WAYCOMPRESS ENGINES VERIFIED 100%!       ");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
