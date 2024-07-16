import { useEffect, useState } from "react";
import { Icon, MenuBarExtra, showToast, Toast, open } from "@raycast/api";
import { fetchLectures } from "./scrape";

type Lecture = {
  classroom: string;
  class: string;
  time: string;
  instructor: string;
  className: string;
  imgSrc: string;
  classType: string;
  zoomLink?: string;
};

export default function Command() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLectures = async () => {
      try {
        const lectures = await fetchLectures();
        setLectures(lectures);
      } catch (err) {
        showToast(Toast.Style.Failure, "Failed to fetch data");
      } finally {
        setIsLoading(false);
      }
    };

    loadLectures();
  }, []);

  const handleAction = () => {
    // Empty just to satisfy the onAction prop
  };

  return (
    <MenuBarExtra icon={Icon.Calendar} isLoading={isLoading} tooltip="Lectures">
      <MenuBarExtra.Section title="Lectures">
        {lectures.map((lecture, index) => (
          <MenuBarExtra.Submenu key={index} title={lecture.className || lecture.classroom} icon={lecture.imgSrc}>
            <MenuBarExtra.Item title="Class" subtitle={lecture.class} icon={Icon.Document} onAction={handleAction} />
            <MenuBarExtra.Item
              title="Instructor"
              subtitle={lecture.instructor}
              icon={Icon.Person}
              onAction={handleAction}
            />
            <MenuBarExtra.Item title="Type" subtitle={lecture.classType} icon={Icon.Tag} onAction={handleAction} />
            <MenuBarExtra.Item title="Time" subtitle={lecture.time} icon={Icon.Clock} onAction={handleAction} />
            <MenuBarExtra.Item
              title="Classroom"
              subtitle={lecture.classroom}
              icon={Icon.Building}
              onAction={handleAction}
            />
            {lecture.zoomLink && (
              <MenuBarExtra.Item title="Zoom Link" icon={Icon.Link} onAction={() => open(lecture.zoomLink!)} />
            )}
          </MenuBarExtra.Submenu>
        ))}
      </MenuBarExtra.Section>

      {lectures.length == 0 ? (
        <MenuBarExtra.Section title="No Lectures for Today">
          <MenuBarExtra.Item
            title="Go to Infoscreen"
            icon={Icon.Link}
            onAction={() => open("https://infoscreen.sae.ch/")}
          />
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Section title="Infoscreen">
          <MenuBarExtra.Item
            title="Go to Infoscreen"
            icon={Icon.Link}
            onAction={() => open("https://infoscreen.sae.ch/")}
          />
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}
