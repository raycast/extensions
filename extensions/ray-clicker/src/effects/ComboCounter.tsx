import { useEffect, useState } from "react";
import { Color } from "@raycast/api";

type ComboCounterProps = {
  comboCount: number;
  comboMultiplier: number;
};

export function ComboCounter({ comboCount, comboMultiplier }: ComboCounterProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [scale, setScale] = useState(1);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (comboCount > 1) {
      setIsVisible(true);
      setScale(1.2);
      setOpacity(1);

      const timer = setTimeout(() => {
        setScale(1);
      }, 100);

      const hideTimer = setTimeout(() => {
        setOpacity(0);
        setTimeout(() => setIsVisible(false), 300);
      }, 2000);

      return () => {
        clearTimeout(timer);
        clearTimeout(hideTimer);
      };
    }
  }, [comboCount]);

  if (!isVisible) return null;

  const colors = [Color.Blue, Color.Green, Color.Purple, Color.Orange, Color.Red, Color.Yellow];
  const colorIndex = Math.min(Math.floor(comboMultiplier) - 1, colors.length - 1);
  const color = colors[colorIndex] || Color.PrimaryText;

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        padding: "8px 16px",
        borderRadius: "20px",
        backgroundColor: `${color}33`, // 20% opacity
        border: `1px solid ${color}`,
        transform: `scale(${scale})`,
        opacity: opacity,
        transition: "all 0.3s ease",
        zIndex: 1000,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <span style={{ fontWeight: "bold", color: color, marginRight: 4 }}>COMBO</span>
        <span style={{ fontWeight: "bold" }}>x{comboMultiplier.toFixed(1)}</span>
        <span> ({comboCount} hits)</span>
      </div>
    </div>
  );
}
