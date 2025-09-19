// Full block spinner renderer with pure tilt slash rotation across multiple bars for transcribing state, full width like waveform
export function renderTranscribeSpinner(seed = 0): string {
  const height = 18;
  const width = 105;
  const message = "TRANSCRIBING YOUR AUDIO... PLEASE WAIT";
  const chars = ["|", "/", "─", "\\"]; // rotation characters for full block effect

  const barWidth = 2;
  const barGap = 1;
  const unitWidth = barWidth + barGap;
  const barCount = Math.max(5, Math.floor((width + barGap) / unitWidth));
  const contentWidth = barCount * barWidth + Math.max(0, barCount - 1) * barGap;
  const leftPad = Math.max(0, Math.floor((width - contentWidth) / 2));
  const rightPad = Math.max(0, width - contentWidth - leftPad);

  const minBarHeight = 2;
  const range = height - minBarHeight;

  const frame = seed % 4;
  const frameChar = chars[frame];

  const barHeights: number[] = [];
  for (let i = 0; i < barCount; i++) {
    let baseHeight = minBarHeight;
    const normalizedI = i / (barCount - 1); // 0 to 1 across bars
    const tiltRange = range * 0.8; // max tilt amplitude

    if (frame === 1) {
      // right slash: left low to right high /
      baseHeight += normalizedI * tiltRange;
    } else if (frame === 3) {
      // left slash: left high to right low \
      baseHeight += (1 - normalizedI) * tiltRange;
    } else if (frame === 0) {
      // vertical: uniform full height |
      baseHeight = height;
    } else if (frame === 2) {
      // horizontal: low uniform bars
      baseHeight = minBarHeight + Math.floor(range / 4);
    }
    barHeights.push(Math.min(height, Math.max(minBarHeight, baseHeight)));
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
        // Full fill with frame char for solid rotating block effect
        line += frameChar.repeat(barWidth);
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
