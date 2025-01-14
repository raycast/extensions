import { Color, Grid } from "@raycast/api";
import { useEffect, useState } from "react";

const shapes = ["●", "👀", "❤️", "❎", "⭐"];

export function LoadingAnimation() {
  const [currentShape, setCurrentShape] = useState(shapes[0]);

  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % shapes.length;
      setCurrentShape(shapes[currentIndex]);
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <Grid.Item
      content={{
        source: currentShape,
        tintColor: Color.SecondaryText,
      }}
    />
  );
}
