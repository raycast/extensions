import { Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { authorizedWithFreeAgent } from "./oauth";
import { TimelineItem } from "./types";
import { fetchTimelineItems } from "./services/freeagent";
import { formatCurrencyAmount, parseDate } from "./utils/formatting";
import { useFreeAgent } from "./hooks/useFreeAgent";

const ListTimeline = function Command() {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const { isLoading, isAuthenticated, accessToken, companyInfo, handleError } = useFreeAgent();

  useEffect(() => {
    async function loadTimelineItems() {
      if (!isAuthenticated || !accessToken) return;

      try {
        const items = await fetchTimelineItems(accessToken);
        setTimelineItems(items);
      } catch (error) {
        handleError(error, "Failed to fetch timeline items");
      }
    }

    loadTimelineItems();
  }, [isAuthenticated, accessToken]);

  const getAccessories = (item: TimelineItem) => {
    const accessories = [];
    if (item.amount_due) {
      const currency = companyInfo?.currency || "GBP";
      accessories.push({
        text: formatCurrencyAmount(currency, item.amount_due),
      });
    }
    if (item.dated_on) {
      accessories.push({
        date: parseDate(item.dated_on),
        icon: Icon.Calendar,
      });
    }
    return accessories;
  };

  return (
    <List isLoading={isLoading}>
      {timelineItems.map((item) => (
        <List.Item
          key={`${item.description}-${item.nature}`}
          icon={item.is_personal ? Icon.Person : Icon.Building}
          title={item.description}
          subtitle={item.nature}
          accessories={getAccessories(item)}
        />
      ))}
    </List>
  );
};

export default authorizedWithFreeAgent(ListTimeline);
