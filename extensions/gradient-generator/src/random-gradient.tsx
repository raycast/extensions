import React, { useState } from 'react';
import PreviewGradient from './preview-gradient';
import { randomHex } from './lib/grad';

export default function RandomGradient() {
  const [stops] = useState<string[]>(() => {
    const count = Math.random() < 0.5 ? 2 : 3;
    return Array.from({ length: count }, () => randomHex());
  });
  return <PreviewGradient type="linear" angle={90} stops={stops} />;
}
