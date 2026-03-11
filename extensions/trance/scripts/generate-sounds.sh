#!/bin/bash
set -e

OUTDIR="/Users/chandler/Repos/trance/assets/sounds"
DUR=45

mkdir -p "$OUTDIR"

echo "Generating 22 ambient sound files..."

# Nature sounds
echo "[1/22] Rain..."
ffmpeg -y -f lavfi -i 'anoisesrc=d=45:c=pink:a=0.8' \
  -af 'highpass=f=200,lowpass=f=4000,tremolo=f=0.5:d=0.4' \
  -ar 48000 -ac 1 -b:a 64k "$OUTDIR/rain.mp3" 2>/dev/null

echo "[2/22] Thunderstorm..."
ffmpeg -y -f lavfi -i 'anoisesrc=d=45:c=brown:a=0.9' \
  -af 'highpass=f=40,lowpass=f=3000,tremolo=f=0.15:d=0.7' \
  -ar 48000 -ac 1 -b:a 64k "$OUTDIR/thunderstorm.mp3" 2>/dev/null

echo "[3/22] Ocean Waves..."
ffmpeg -y -f lavfi -i 'anoisesrc=d=45:c=brown:a=0.85' \
  -af 'highpass=f=80,lowpass=f=2500,tremolo=f=0.1:d=0.8' \
  -ar 48000 -ac 1 -b:a 64k "$OUTDIR/ocean-waves.mp3" 2>/dev/null

echo "[4/22] River Stream..."
ffmpeg -y -f lavfi -i 'anoisesrc=d=45:c=pink:a=0.7' \
  -af 'highpass=f=400,lowpass=f=6000,tremolo=f=2.0:d=0.3' \
  -ar 48000 -ac 1 -b:a 64k "$OUTDIR/river-stream.mp3" 2>/dev/null

echo "[5/22] Wind..."
ffmpeg -y -f lavfi -i 'anoisesrc=d=45:c=brown:a=0.75' \
  -af 'highpass=f=100,lowpass=f=1500,tremolo=f=0.2:d=0.6' \
  -ar 48000 -ac 1 -b:a 64k "$OUTDIR/wind.mp3" 2>/dev/null

echo "[6/22] Birds..."
ffmpeg -y -f lavfi -i 'anoisesrc=d=45:c=white:a=0.5' \
  -af 'highpass=f=2000,lowpass=f=8000,tremolo=f=6.0:d=0.5' \
  -ar 48000 -ac 1 -b:a 64k "$OUTDIR/birds.mp3" 2>/dev/null

echo "[7/22] Summer Night..."
ffmpeg -y -f lavfi -i 'anoisesrc=d=45:c=pink:a=0.6' \
  -af 'highpass=f=1500,lowpass=f=7000,tremolo=f=8.0:d=0.4' \
  -ar 48000 -ac 1 -b:a 64k "$OUTDIR/summer-night.mp3" 2>/dev/null

echo "[8/22] Campfire..."
ffmpeg -y -f lavfi -i 'anoisesrc=d=45:c=brown:a=0.8' \
  -af 'highpass=f=300,lowpass=f=5000,tremolo=f=12.0:d=0.6' \
  -ar 48000 -ac 1 -b:a 64k "$OUTDIR/campfire.mp3" 2>/dev/null

echo "[9/22] Forest..."
ffmpeg -y -f lavfi -i 'anoisesrc=d=45:c=pink:a=0.65' \
  -af 'highpass=f=150,lowpass=f=5000,tremolo=f=0.3:d=0.5' \
  -ar 48000 -ac 1 -b:a 64k "$OUTDIR/forest.mp3" 2>/dev/null

# Urban sounds
echo "[10/22] Coffee Shop..."
ffmpeg -y -f lavfi -i 'anoisesrc=d=45:c=pink:a=0.6' \
  -af 'highpass=f=200,lowpass=f=6000,tremolo=f=3.0:d=0.3' \
  -ar 48000 -ac 1 -b:a 64k "$OUTDIR/coffee-shop.mp3" 2>/dev/null

echo "[11/22] City Street..."
ffmpeg -y -f lavfi -i 'anoisesrc=d=45:c=pink:a=0.7' \
  -af 'highpass=f=80,lowpass=f=4000,tremolo=f=0.5:d=0.4' \
  -ar 48000 -ac 1 -b:a 64k "$OUTDIR/city-street.mp3" 2>/dev/null

echo "[12/22] Train..."
ffmpeg -y -f lavfi -i 'anoisesrc=d=45:c=brown:a=0.8' \
  -af 'highpass=f=60,lowpass=f=2000,tremolo=f=4.0:d=0.5' \
  -ar 48000 -ac 1 -b:a 64k "$OUTDIR/train.mp3" 2>/dev/null

echo "[13/22] Keyboard Typing..."
ffmpeg -y -f lavfi -i 'anoisesrc=d=45:c=white:a=0.5' \
  -af 'highpass=f=1000,lowpass=f=8000,tremolo=f=10.0:d=0.7' \
  -ar 48000 -ac 1 -b:a 64k "$OUTDIR/keyboard-typing.mp3" 2>/dev/null

echo "[14/22] Clock Ticking..."
ffmpeg -y -f lavfi -i 'anoisesrc=d=45:c=white:a=0.4' \
  -af 'highpass=f=800,lowpass=f=5000,tremolo=f=2.0:d=0.9' \
  -ar 48000 -ac 1 -b:a 64k "$OUTDIR/clock-ticking.mp3" 2>/dev/null

# Electronic sounds
echo "[15/22] White Noise..."
ffmpeg -y -f lavfi -i 'anoisesrc=d=45:c=white:a=0.7' \
  -af 'highpass=f=100,lowpass=f=12000' \
  -ar 48000 -ac 1 -b:a 64k "$OUTDIR/white-noise.mp3" 2>/dev/null

echo "[16/22] Pink Noise..."
ffmpeg -y -f lavfi -i 'anoisesrc=d=45:c=pink:a=0.8' \
  -af 'highpass=f=50,lowpass=f=10000' \
  -ar 48000 -ac 1 -b:a 64k "$OUTDIR/pink-noise.mp3" 2>/dev/null

echo "[17/22] Brown Noise..."
ffmpeg -y -f lavfi -i 'anoisesrc=d=45:c=brown:a=0.9' \
  -af 'highpass=f=30,lowpass=f=5000' \
  -ar 48000 -ac 1 -b:a 64k "$OUTDIR/brown-noise.mp3" 2>/dev/null

echo "[18/22] Deep Space..."
ffmpeg -y -f lavfi -i 'anoisesrc=d=45:c=brown:a=0.7' \
  -af 'highpass=f=20,lowpass=f=800,tremolo=f=0.1:d=0.7' \
  -ar 48000 -ac 1 -b:a 64k "$OUTDIR/deep-space.mp3" 2>/dev/null

# Binaural beats (stereo: slightly different frequencies in each ear)
echo "[19/22] Alpha Waves (10Hz)..."
ffmpeg -y -f lavfi -i 'sine=f=200:d=45' -f lavfi -i 'sine=f=210:d=45' \
  -filter_complex '[0][1]amerge=inputs=2,volume=0.5' \
  -ar 48000 -ac 2 -b:a 64k "$OUTDIR/alpha-waves.mp3" 2>/dev/null

echo "[20/22] Beta Waves (20Hz)..."
ffmpeg -y -f lavfi -i 'sine=f=200:d=45' -f lavfi -i 'sine=f=220:d=45' \
  -filter_complex '[0][1]amerge=inputs=2,volume=0.5' \
  -ar 48000 -ac 2 -b:a 64k "$OUTDIR/beta-waves.mp3" 2>/dev/null

echo "[21/22] Theta Waves (6Hz)..."
ffmpeg -y -f lavfi -i 'sine=f=200:d=45' -f lavfi -i 'sine=f=206:d=45' \
  -filter_complex '[0][1]amerge=inputs=2,volume=0.5' \
  -ar 48000 -ac 2 -b:a 64k "$OUTDIR/theta-waves.mp3" 2>/dev/null

echo "[22/22] Delta Waves (2Hz)..."
ffmpeg -y -f lavfi -i 'sine=f=200:d=45' -f lavfi -i 'sine=f=202:d=45' \
  -filter_complex '[0][1]amerge=inputs=2,volume=0.5' \
  -ar 48000 -ac 2 -b:a 64k "$OUTDIR/delta-waves.mp3" 2>/dev/null

echo ""
echo "Done! Verifying volume levels..."
for f in "$OUTDIR"/*.mp3; do
  name=$(basename "$f")
  vol=$(ffmpeg -i "$f" -af volumedetect -f null /dev/null 2>&1 | grep mean_volume | sed 's/.*mean_volume: //')
  echo "  $name: $vol"
done

echo ""
echo "All 22 sounds generated."
