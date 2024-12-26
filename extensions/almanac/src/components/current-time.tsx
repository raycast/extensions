import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { DualHour } from './dual-hour';

export const CurrentTime: React.FC = () => {
  const [now, setNow] = useState(dayjs());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(dayjs());
    }, 1000 * 5);
    return () => clearInterval(interval);
  }, []);

  return <DualHour time={now} isCurrentTime />;
};
