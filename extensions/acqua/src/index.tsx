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

  return (
    <MenuBarExtra
      icon={{
        source: Icon.Raindrop,
        tintColor: nextDrinkReminder > 0 ? Color.PrimaryText : Color.Blue,
      }}
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Check}
          title="Drink now"
          subtitle={`Last was ${lastDrinkFromNowInMinutes} ${pluralize(lastDrinkFromNowInMinutes, "minute")} ago`}
          onAction={onDrinkNow}
        />
        <MenuBarExtra.Item
          icon={Icon.Hourglass}
          title={
            nextDrinkReminder > 0
              ? `Next reminder in ${nextDrinkReminder} ${pluralize(nextDrinkReminder, "minute")}`
              : `You should've had water ${nextDrinkReminder * -1}  ${pluralize(nextDrinkReminder * -1, "minute")} ago`
          }
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Delay reminder by...">
        <MenuBarExtra.Item title="5 minutes" onAction={onDelay(5)} />
        <MenuBarExtra.Item title="15 minutes" onAction={onDelay(15)} />
        <MenuBarExtra.Item title="30 minutes" onAction={onDelay(30)} />
        <MenuBarExtra.Item title="45 minutes" onAction={onDelay(45)} />
        <MenuBarExtra.Item title="60 minutes" onAction={onDelay(60)} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
