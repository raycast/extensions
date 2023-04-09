import { Cache, Clipboard, Icon, MenuBarExtra, confirmAlert, open, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { Events, Images } from "./types/indes";
import { apiInstance } from "./clients/api";
const useDemoDayCountdown = () => {
  const getCountdown = (endDate: Date) => {
    const now = new Date();
    const totalMilliseconds = endDate.getTime() - now.getTime();

    if (totalMilliseconds <= 0) {
      return {
        title: "good luck builder.",
        fullCountdown: "0 days, 0 hours, 0 minutes, 0 seconds",
      };
    }

    const seconds = Math.floor(totalMilliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const formattedCountdown =
      days === 0 ? `${hours} hours, ${minutes % 60} minutes` : `${days} days, ${hours % 24} hours`;

    const title = `${formattedCountdown} until demo day`;
    const fullCountdown = `${days} days, ${hours % 24} hours, ${minutes % 60} minutes, ${seconds % 60} seconds`;

    return { title, fullCountdown };
  };

  const endDate = new Date(Date.UTC(2023, 4, 21, 17, 30)); // May 21, 2023, 10:30 AM PT (17:30 UTC)
  const initialCountdown = getCountdown(endDate);

  return { title: initialCountdown.title, fullCountdown: initialCountdown.fullCountdown };
};

export default function Command() {
  const { title, fullCountdown } = useDemoDayCountdown();
  const cache = new Cache();
  const [imagesEnabled, setImagesEnabled] = useState<boolean>(false);
  const [images, setImages] = useState<Images[]>([]);
  const [events, setEvents] = useState<Events[]>([]);

  useEffect(() => {
    const fetchCachedData = async () => {
      const cachedImages = cache.get("images");
      const cachedEvents = cache.get("events");
      const cachedImagesEnabled = cache.get("imagesEnabled");

      if (cachedImages) {
        try {
          const imgs: Images[] = JSON.parse(cachedImages);
          setImages(imgs);
        } catch (e) {
          console.error(`Unable to parse cachedImages into our Images interface`);
        }
      }

      if (cachedEvents) {
        try {
          const evnts: Events[] = JSON.parse(cachedEvents);
          setEvents(evnts);
        } catch (e) {
          console.error(`Unable to parse cachedImages into our Images interface`);
        }
      }

      if (cachedImagesEnabled) {
        try {
          const enabled: boolean = cachedImagesEnabled === "true";
          setImagesEnabled(enabled);
        } catch (e) {
          console.error(`Unable to parse cachedImages into our Images interface`);
        }
      }
    };

    const fetchData = async () => {
      try {
        const cacheTTL = cache.get("ttl");

        if ((cacheTTL && new Date().getTime() > Number(cacheTTL)) || !cacheTTL) {
          const imagesEnabledResponse = await apiInstance.get<boolean>(`/api/imagesEnabled`);
          setImagesEnabled(imagesEnabledResponse.data);
          cache.set("imagesEnabled", String(imagesEnabledResponse.data));

          const imagesResponse = await apiInstance.get("/api/images");
          setImages(imagesResponse.data);
          cache.set("images", JSON.stringify(imagesResponse.data));

          const eventsResponse = await apiInstance.get("/api/events");
          setEvents(eventsResponse.data);
          cache.set("events", JSON.stringify(eventsResponse.data));

          cache.set("ttl", String(new Date().getTime() + 300000));
        }
      } catch (error) {
        setImagesEnabled(false);
        setImages([]);
        setEvents([]);
        console.error("Error fetching data:", error);
      }
    };

    fetchCachedData();
    fetchData();
  }, []);

  return (
    <MenuBarExtra icon={Icon.Clock} title={title}>
      <MenuBarExtra.Section title="welcome to s3." />
      <MenuBarExtra.Item
        title={fullCountdown}
        icon={Icon.Clock}
        onAction={() => {
          Clipboard.copy(`${fullCountdown} until n&w s3 demo day.`);
          showHUD("copied the countdown to your clipboard. good luck builder 🫡");
        }}
      />
      <MenuBarExtra.Submenu title="images" icon={Icon.Image}>
        {imagesEnabled
          ? images.map((image) => (
              <MenuBarExtra.Item
                key={image.title}
                title={image.title}
                icon={Icon.Image}
                onAction={() => open(image.image)}
              />
            ))
          : null}
      </MenuBarExtra.Submenu>
      <MenuBarExtra.Submenu title="recordings" icon={Icon.Video}></MenuBarExtra.Submenu>
      <MenuBarExtra.Submenu title="upcoming events" icon={Icon.Calendar}>
        {events.map((event) => (
          <MenuBarExtra.Item
            key={event.event}
            title={`${event.date} - ${event.event}`}
            onAction={() => open(event.rsvp)}
          />
        ))}
      </MenuBarExtra.Submenu>
      <MenuBarExtra.Item
        title="chai_recipe"
        icon={Icon.Stars}
        onAction={() =>
          confirmAlert({ title: "this file is locked. please contact the owner for access. owner: alec dilanchian" })
        }
      />
    </MenuBarExtra>
  );
}
