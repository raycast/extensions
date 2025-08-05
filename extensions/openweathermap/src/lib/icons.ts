export const WIND_DIRECTION = ["↓", "↙", "←", "↖", "↑", "↗", "→", "↘"];

export function getWindDirectionIcon(deg: number): string {
  const windIndex = Math.floor(((deg + 22.5) % 360) / 45.0);
  const wind_direction = WIND_DIRECTION[windIndex];
  return wind_direction;
}
