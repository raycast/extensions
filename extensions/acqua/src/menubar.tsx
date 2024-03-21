import { Color, Icon, MenuBarExtra } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { pluralize, sleep, useDrinkTimes, useLastDrinkedAt } from "./common";

export default function Command() {
  const [, drinkNow] = useLastDrinkedAt();
  const [, setDelay] = useCachedState<number>("delay", 0);

  const { nextDrinkReminder, lastDrinkFromNowInMinutes } = useDrinkTimes();

  const onDrinkNow = async () => {
    drinkNow();
    await sleep(200);
  };

  const onDelay = (minutes: number) => () => {
    setDelay((delay) => delay + minutes * 60 * 1000);
  };

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
