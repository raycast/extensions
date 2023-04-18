import { Cache, Clipboard, Icon, MenuBarExtra, confirmAlert, open, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { Events, Images, Misc, Videos } from "./types";
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
  const [videosEnabled, setVideosEnabled] = useState<boolean>(false);
  const [miscEnabled, setMiscEnabled] = useState<boolean>(false);
  const [images, setImages] = useState<Images[]>([]);
  const [events, setEvents] = useState<Events[]>([]);
  const [videos, setVideos] = useState<Videos[]>([]);
  const [misc, setMisc] = useState<Misc[]>([]);

  useEffect(() => {
    const fetchCachedData = () => {
      const cachedImages = cache.get("images");
      const cachedEvents = cache.get("events");
      const cachedVideos = cache.get("videos");
      const cachedMisc = cache.get("misc");
      const cachedImagesEnabled = cache.get("imagesEnabled");
      const cachedVideosEnabled = cache.get("videosEnabled");
      const cachedMiscEnabled = cache.get("miscEnabled");
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
          console.error(`Unable to parse cachedEvents into our Events interface`);
        }
      }

      if (cachedVideos) {
        try {
          const vids: Videos[] = JSON.parse(cachedVideos);
          setVideos(vids);
        } catch (e) {
          console.error(`Unable to parse cachedVides into our Videos interface`);
        }
      }

      if (cachedMisc) {
        try {
          const misc: Misc[] = JSON.parse(cachedMisc);
          setMisc(misc);
        } catch (e) {
          console.error(`Unable to parse cachedMisc into our Misc interface`);
        }
      }

      if (cachedImagesEnabled) {
        try {
          const enabled: boolean = cachedImagesEnabled === "true";
          setImagesEnabled(enabled);
        } catch (e) {
          console.error(`Unable to parse cachedImagesEnabled into a boolean`);
        }
      }

      if (cachedVideosEnabled) {
        try {
          const enabled: boolean = cachedVideosEnabled === "true";
          setVideosEnabled(enabled);
        } catch (e) {
          console.error(`Unable to parse cachedVideosEnabled into a boolean`);
        }
      }

      if (cachedMiscEnabled) {
        try {
          const enabled: boolean = cachedMiscEnabled === "true";
          setMiscEnabled(enabled);
        } catch (e) {
          console.error("Unable to parse cachedMiscEnabled into a boolean");
        }
      }
    };

    const fetchData = () => {
      try {
        const cacheTTL = cache.get("ttl");

        if ((cacheTTL && new Date().getTime() > Number(cacheTTL)) || !cacheTTL) {
          apiInstance.get<boolean>("/api/imagesEnabled").then((data) => {
            setImagesEnabled(data.data);
            cache.set("imagesEnabled", String(data.data));
          });

          apiInstance.get<boolean>("/api/videosEnabled").then((data) => {
            setVideosEnabled(data.data);
            cache.set("videosEnabled", String(data.data));
          });

          apiInstance.get<boolean>("/api/miscEnabled").then((data) => {
            setMiscEnabled(data.data);
            cache.set("miscEnabled", String(data.data));
          });

          apiInstance.get<Images[]>("/api/images").then((data) => {
            setImages(data.data);
            cache.set("images", JSON.stringify(data.data));
          });

          apiInstance.get<Events[]>("/api/events").then((data) => {
            setEvents(data.data);
            cache.set("events", JSON.stringify(data.data));
          });

          apiInstance.get<Videos[]>("/api/videos").then((data) => {
            setVideos(data.data);
            cache.set("videos", JSON.stringify(data.data));
          });

          apiInstance.get<Misc[]>("/api/misc").then((data) => {
            setMisc(data.data);
            cache.set("misc", JSON.stringify(data.data));
          });

          cache.set("ttl", String(new Date().getTime() + 300000));
        }
      } catch (error) {
        setImagesEnabled(false);
        setImages([]);
        setEvents([]);
        setMisc([]);
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
      <MenuBarExtra.Submenu title="recordings" icon={Icon.Video}>
        {videosEnabled
          ? videos.map((video) => (
              <MenuBarExtra.Item
                key={video.link}
                title={video.title}
                icon={Icon.Video}
                onAction={() => open(video.link)}
              />
            ))
          : null}
      </MenuBarExtra.Submenu>
      <MenuBarExtra.Submenu title="upcoming events" icon={Icon.Calendar}>
        {events.map((event) => (
          <MenuBarExtra.Item
            key={event.event}
            title={`${event.date} - ${event.event}`}
            onAction={() => open(event.rsvp)}
          />
        ))}
      </MenuBarExtra.Submenu>
      <MenuBarExtra.Submenu title="Misc" icon={Icon.QuestionMark}>
        {misc.map((miscEvent) => (
          <MenuBarExtra.Item
            key={miscEvent.title}
            title={`${miscEvent.title} ${miscEvent.other ? `- ${miscEvent.other}` : ""}`}
            onAction={() => open(miscEvent.link)}
          />
        ))}
      </MenuBarExtra.Submenu>
      <MenuBarExtra.Item
        title="chai_recipe"
        icon={Icon.Stars}
        onAction={() => showHUD("this file is locked. please contact the owner for access. owner: alec dilanchian")}
      />
    </MenuBarExtra>
  );
}
