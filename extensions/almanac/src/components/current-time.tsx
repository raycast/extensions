import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { DualHour } from './dual-hour';

export const CurrentTime: React.FC = () => {
  const [now, setNow] = useState(dayjs());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow((prev) => {
        const currentTime = dayjs();
        if (prev.isSame(currentTime, 'minute')) {
          return prev;
        }
        return currentTime;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return <DualHour time={now} isCurrentTime />;
};
