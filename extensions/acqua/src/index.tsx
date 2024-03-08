import { Color, Icon, MenuBarExtra, getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

interface Preferences {
  interval: string;
}

function pluralize(value: number, unit: string) {
  return value === 1 ? unit : `${unit}s`;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [lastDrinkedAt, updateLastDrinkedAt] = useCachedState<Date | null>("lastDrinkedAt", null);
  const [delay, setDelay] = useCachedState<number>("delay", 0);

  const lastDrinkFromNow = lastDrinkedAt ? new Date().getTime() - delay - lastDrinkedAt.getTime() : 0;
  const lastDrinkFromNowInMinutes = Math.floor(lastDrinkFromNow / 1000 / 60);

  const nextDrinkReminder = Number(preferences.interval) - lastDrinkFromNowInMinutes;

  const onDrinkNow = () => {
    updateLastDrinkedAt(new Date());
    setDelay(0);
  };

  const onDelay = (minutes: number) => () => {
    setDelay((delay) => delay + minutes * 60 * 1000);
  };
  updateCommandMetadata({
    subtitle:
      nextDrinkReminder > 0
        ? `Next reminder in ${nextDrinkReminder} ${pluralize(nextDrinkReminder, "minute")}`
        : "Time to drink some water!",
  });

  const lastDrinkLabel =
    lastDrinkFromNowInMinutes === 0 ? "Last was just now" : `Last was ${lastDrinkFromNowInMinutes} min ago`;

  return (
    <MenuBarExtra
      icon={{
        source: Icon.Raindrop,
        tintColor: nextDrinkReminder > 0 ? Color.PrimaryText : Color.Blue,
      }}
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Take a sip" subtitle={`    ${lastDrinkLabel}`} onAction={onDrinkNow} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section
        title={
          nextDrinkReminder > 0
            ? `Next reminder in ${nextDrinkReminder} ${pluralize(nextDrinkReminder, "minute")}`
            : `You should've had water ${nextDrinkReminder * -1}  ${pluralize(nextDrinkReminder * -1, "minute")} ago`
        }
      >
        <MenuBarExtra.Item title="Delay by 5 minutes" onAction={onDelay(5)} />
        <MenuBarExtra.Item title="Delay by 15 minutes" onAction={onDelay(15)} />
        <MenuBarExtra.Item title="Delay by 30 minutes" onAction={onDelay(30)} />
        <MenuBarExtra.Item title="Delay by 60 minutes" onAction={onDelay(60)} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
