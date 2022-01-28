import { useState } from 'react';
import { Detail } from '@raycast/api';
import { calculate, format } from './lib';
import useInterval from './lib/useInterval';

const emojis = ['🎁', '🍪', '❄️', '🎄', '🔔', '🎅', '☃️', '⛄'];

export default function Command() {
  const [s] = useState(() => {
    const now = new Date();

    return calculate({
      currDate: now,
      neededDate: new Date(now.getFullYear(), 11, 25),
    });
  });
  const [emoji, setEmoji] = useState(emojis[0]);

  useInterval(() => {
    const randomNumber = Math.floor(Math.random() * emojis.length);

    setEmoji(emojis[randomNumber]);
  }, 1500);

  if (s.isToday) {
    return <Detail markdown={`## Merry Christmas ${emoji}`} />;
  }

  return (
    <Detail
      markdown={`## It's ${s.days ? `${format(s.days, 'day')} and ` : ''}${
        s.hours ? format(s.hours, 'hour') : ''
      } until Christmas ${emoji}`}
    />
  );
}
