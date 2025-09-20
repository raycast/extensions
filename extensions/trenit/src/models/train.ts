export interface Train {
  carrier: string;
  category: string;
  icon: string | null;
  number: string;
  destination: string;
  time: string;
  platform: string;
  delay: string;
  isDelayed: boolean;
  isCancelled: boolean;
  isBlinking: boolean;
  isReplacedByBus: boolean;
  isIncomplete: boolean;
  stops: string[];
}
