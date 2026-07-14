import { MenuBarExtra, Icon, Image, open, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { useSubscriptions } from "./hooks/useSubscriptions";
import { getSubscriptionsForMonth, formatAmount, formatDate } from "./utils/date";
import { getServiceIcon } from "./utils/icons";
import { Subscription } from "./utils/graphql";
import { SUBFLOW_URL, SUBFLOW_API_KEY_URL } from "./utils/constants";

interface MenuItem {
  subscription: Subscription;
  paymentDate: Date;
  icon: Image.ImageLike;
}

export default function MenuBar() {
  const { subscriptions, isLoading, error } = useSubscriptions();
  const [tomorrowItems, setTomorrowItems] = useState<MenuItem[]>([]);
  const [thisMonthItems, setThisMonthItems] = useState<MenuItem[]>([]);
  const [iconsLoading, setIconsLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    if (subscriptions.length === 0) {
      setTomorrowItems([]);
      setThisMonthItems([]);
      setIconsLoading(false);
      return;
    }

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const thisMonthSubs = getSubscriptionsForMonth(subscriptions, now.getFullYear(), now.getMonth() + 1);

    const tomorrowDay = tomorrow.getDate();
    const isSameMonth = tomorrow.getMonth() === now.getMonth() && tomorrow.getFullYear() === now.getFullYear();
    const tomorrowSubs = isSameMonth
      ? thisMonthSubs.filter((item) => item.paymentDate.getDate() === tomorrowDay)
      : getSubscriptionsForMonth(subscriptions, tomorrow.getFullYear(), tomorrow.getMonth() + 1).filter(
          (item) => item.paymentDate.getDate() === tomorrowDay,
        );

    const allSubs = isSameMonth ? thisMonthSubs : [...tomorrowSubs, ...thisMonthSubs];

    let cancelled = false;
    setIconsLoading(true);
    Promise.all(
      allSubs.map(async ({ subscription, paymentDate }) => ({
        subscription,
        paymentDate,
        icon: (await getServiceIcon(subscription.name)) ?? Icon.CreditCard,
      })),
    )
      .then((allItems) => {
        if (!cancelled) {
          const iconMap = new Map(allItems.map((item) => [item.subscription.id, item.icon]));
          setTomorrowItems(
            tomorrowSubs.map(({ subscription, paymentDate }) => ({
              subscription,
              paymentDate,
              icon: iconMap.get(subscription.id) ?? Icon.CreditCard,
            })),
          );
          setThisMonthItems(
            thisMonthSubs.map(({ subscription, paymentDate }) => ({
              subscription,
              paymentDate,
              icon: iconMap.get(subscription.id) ?? Icon.CreditCard,
            })),
          );
          setIconsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIconsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [subscriptions, isLoading]);

  const tomorrowCount = tomorrowItems.length;

  if (error) {
    return (
      <MenuBarExtra icon={{ source: "extension-icon.png" }} title="⚠ Subflow" tooltip={error.message}>
        <MenuBarExtra.Item title={error.message} />
        <MenuBarExtra.Item title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        <MenuBarExtra.Item title="Get API Key" icon={Icon.Key} onAction={() => open(SUBFLOW_API_KEY_URL)} />
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra
      isLoading={isLoading || iconsLoading}
      icon={{ source: "extension-icon.png" }}
      title={tomorrowCount > 0 ? `${tomorrowCount} due tomorrow` : undefined}
      tooltip="Subflow Subscriptions"
    >
      {tomorrowItems.length > 0 && (
        <MenuBarExtra.Section title="Tomorrow">
          {tomorrowItems.map(({ subscription, icon }) => (
            <MenuBarExtra.Submenu
              key={subscription.id}
              icon={icon}
              title={`${subscription.name}  ${formatAmount(subscription.price)} ${subscription.currency}`}
            >
              <MenuBarExtra.Item
                title="Edit Subscription"
                icon={Icon.Pencil}
                onAction={() => open(`${SUBFLOW_URL}?action=edit&id=${subscription.id}`)}
              />
              <MenuBarExtra.Item
                title="Delete Subscription"
                icon={Icon.Trash}
                onAction={() => open(`${SUBFLOW_URL}?action=delete&id=${subscription.id}`)}
              />
            </MenuBarExtra.Submenu>
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section title="This Month">
        {thisMonthItems.length === 0 ? (
          <MenuBarExtra.Item title="No subscriptions this month" />
        ) : (
          thisMonthItems.map(({ subscription, paymentDate, icon }) => (
            <MenuBarExtra.Submenu
              key={subscription.id}
              icon={icon}
              title={`${subscription.name}  ${formatDate(paymentDate)} · ${formatAmount(subscription.price)} ${subscription.currency}`}
            >
              <MenuBarExtra.Item
                title="Edit Subscription"
                icon={Icon.Pencil}
                onAction={() => open(`${SUBFLOW_URL}?action=edit&id=${subscription.id}`)}
              />
              <MenuBarExtra.Item
                title="Delete Subscription"
                icon={Icon.Trash}
                onAction={() => open(`${SUBFLOW_URL}?action=delete&id=${subscription.id}`)}
              />
            </MenuBarExtra.Submenu>
          ))
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Add Subscription"
          icon={Icon.Plus}
          onAction={() => open(`${SUBFLOW_URL}?action=create`)}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
