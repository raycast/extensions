import { Clipboard, Icon, MenuBarExtra, confirmAlert, open, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";

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

  const [title, setTitle] = useState(initialCountdown.title);
  const [fullCountdown, setFullCountdown] = useState(initialCountdown.fullCountdown);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const updatedCountdown = getCountdown(endDate);
      setTitle(updatedCountdown.title);
      setFullCountdown(updatedCountdown.fullCountdown);
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return { title, fullCountdown };
};

export default function Command() {
  const { title, fullCountdown } = useDemoDayCountdown();
  const enableImages = false;
  const images: { title: string; image: string }[] = [
    {
      title: "one",
      image: "http://example.com",
    },
    {
      title: "two",
      image: "http://example.com",
    },
    {
      title: "three",
      image: "http://example.com",
    },
    {
      title: "four",
      image: "http://example.com",
    },
  ];

  const upcomingEvents: { date: string; event: string; rsvp: string }[] = [
    {
      date: "april 8",
      event: "ideas 101 w/ farza",
      rsvp: "https://lu.ma/26hnwhzm",
    },
    {
      date: "april 10",
      event: "building w/ shaan puri",
      rsvp: "https://lu.ma/6vgyneo4",
    },
    {
      date: "april 12",
      event: "life & lexica w/ sharif",
      rsvp: "https://lu.ma/8s7zlrgc",
    },
  ];

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
        {enableImages
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
        {upcomingEvents.map((event) => (
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
