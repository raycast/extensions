// Classic waveform renderer with dense block characters and header message
export function renderSyntheticWave(seed = 0): string {
  const height = 18;
  const width = 105;
  const message = "RECORDING AUDIO...  PRESS ENTER TO STOP";
  const chars = ["█", "▓", "▒", "░", "·"]; // dense -> sparse

  const barWidth = 2;
  const barGap = 1;
  const unitWidth = barWidth + barGap;
  const barCount = Math.max(5, Math.floor((width + barGap) / unitWidth));
  const contentWidth = barCount * barWidth + Math.max(0, barCount - 1) * barGap;
  const leftPad = Math.max(0, Math.floor((width - contentWidth) / 2));
  const rightPad = Math.max(0, width - contentWidth - leftPad);

  const minBarHeight = Math.max(2, Math.floor(height * 0.2));
  const range = Math.max(1, height - minBarHeight);

  const fract = (value: number) => value - Math.floor(value);
  const pseudoRandom = (t: number, idx: number) => {
    const x = Math.sin((t + 1) * 12.9898 + idx * 78.233) * 43758.5453;
    return fract(x);
  };

  const seedTime = seed * 0.18;
  const barHeights: number[] = [];

  for (let i = 0; i < barCount; i++) {
    const slow = Math.sin(seedTime + i * 0.85);
    const mid = Math.sin(seedTime * 1.6 + i * 1.7);
    const fast = Math.sin(seedTime * 2.3 + i * 2.1);
    const waveMix = slow * 0.5 + mid * 0.3 + fast * 0.2; // stays in [-1, 1]
    const smoothComponent = 0.5 + 0.5 * waveMix;
    const randomComponent = pseudoRandom(seed, i);
    const blended = smoothComponent * 0.65 + randomComponent * 0.35;
    const eased = blended ** 1.1; // bias toward taller bars slightly
    const heightValue = minBarHeight + Math.round(eased * range);
    barHeights.push(Math.min(height, heightValue));
  }

  let md = "```\n";
  md += `${message}\n\n`;

  for (let y = 0; y < height; y++) {
    let line = "";
    if (leftPad > 0) {
      line += " ".repeat(leftPad);
    }

    for (let i = 0; i < barCount; i++) {
      const barHeight = barHeights[i];
      const rowFromBottom = height - y;
      const coverage = barHeight - rowFromBottom + 1;

      if (coverage > 0) {
        const intensity = Math.max(0, Math.min(1, coverage / Math.max(barHeight, 1)));
        let ch = chars[chars.length - 1] ?? "·";
        if (intensity > 0.85) ch = chars[0] ?? "█";
        else if (intensity > 0.6) ch = chars[1] ?? "▓";
        else if (intensity > 0.4) ch = chars[2] ?? "▒";
        else if (intensity > 0.2) ch = chars[3] ?? "░";
        line += ch.repeat(barWidth);
      } else {
        line += " ".repeat(barWidth);
      }

      if (i < barCount - 1 && barGap > 0) {
        line += " ".repeat(barGap);
      }
    }

    if (rightPad > 0) {
      line += " ".repeat(rightPad);
    }

    md += `${line}\n`;
  }
  md += "```";
  return md;
}
