import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { Lecture } from "@/data/lectures";
import { Attendance } from "./attendance";
import { Materials } from "./materials";
import { About } from "./about";

type LectureDetailProps = {
  lecture: Lecture;
};

type Section = {
  id: string;
  title: string;
  icon: Icon;
  component: React.ComponentType<{ lectureId: string }>;
};

const sections: Section[] = [
  { id: "about", title: "About", icon: Icon.Info, component: About },
  { id: "materials", title: "Materials", icon: Icon.Document, component: Materials },
  { id: "attendance", title: "Attendance", icon: Icon.Calendar, component: Attendance },
];

export function LectureOptionList({ lecture }: LectureDetailProps) {
  return (
    <List navigationTitle={lecture.lecture_name} searchBarPlaceholder="Search sections...">
      {sections.map((section) => {
        const SectionComponent = section.component;
        return (
          <List.Item
            key={section.id}
            icon={section.icon}
            title={section.title}
            accessories={[{ icon: Icon.ChevronRight }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title={`Open ${section.title}`}
                  icon={section.icon}
                  target={<SectionComponent lectureId={lecture.id} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
