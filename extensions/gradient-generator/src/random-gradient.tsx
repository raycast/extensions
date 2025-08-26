import React, { useState } from 'react';
import PreviewGradient from './gradient-preview';
import { randomHex } from './lib/grad';
import { GradType } from './types';

export default function RandomGradient() {
  const generateRandomGradient = (stopCount?: 2 | 3) => {
    const types: GradType[] = ['linear', 'radial', 'conic'];
    const type = types[Math.floor(Math.random() * types.length)];

    // Use specified stop count or random (2 or 3)
    const count = stopCount || (Math.random() < 0.5 ? 2 : 3);
    const stops = Array.from({ length: count }, () => randomHex());

    const angle =
      type === 'linear' ? Math.floor(Math.random() * 360) : undefined;

    return { type, angle, stops };
  };

  const [gradient, setGradient] = useState(() => generateRandomGradient());

  const handleGenerateRandom = (stopCount?: 2 | 3) => {
    setGradient(generateRandomGradient(stopCount));
  };

  return (
    <PreviewGradient
      {...gradient}
      isRandomGradient={true}
      onGenerateRandom={handleGenerateRandom}
    />
  );
}
