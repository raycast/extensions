import { Detail, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { readItem } from "@utils/storage-helper";

interface TopProject {
  name: string;
  hours: number;
}

export default function DashboardCommand() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [todayHours, setTodayHours] = useState<number>(0);
  const [weekHours, setWeekHours] = useState<number>(0);
  const [topProjects, setTopProjects] = useState<TopProject[]>([]);

  useEffect(() => {
    async function fetchDataAndCalculate() {
      setIsLoading(true);
      try {
        const projects = await readItem("projects");
        const projectMap = projects.reduce(
          (acc, project) => {
            acc[project.id] = project.name;
            return acc;
          },
          {} as Record<string, string>,
        );

        const timeEntries = await readItem("timeEntries");

        // Calculate Today's Hours
        const today = new Date();
        const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        const todayString = todayUTC.toISOString().slice(0, 10);
        const todaysEntries = timeEntries.filter((entry) => entry.date === todayString);
        const totalTodayHours = todaysEntries.reduce((sum, entry) => sum + entry.hours, 0);
        setTodayHours(totalTodayHours);

        // Calculate This Week's Hours (Mon-Sun)
        const dow = todayUTC.getUTCDay(); // 0 Sunday .. 6 Saturday
        const mondayUTC = new Date(
          Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), todayUTC.getUTCDate() - ((dow + 6) % 7)),
        );

        const weeklyEntries = timeEntries.filter((entry) => new Date(entry.date + "T00:00:00Z") >= mondayUTC);
        const totalWeekHours = weeklyEntries.reduce((sum, entry) => sum + entry.hours, 0);
        setWeekHours(totalWeekHours);

        // Calculate Top 3 Projects (All Time)
        const projectHours: Record<string, number> = {};
        timeEntries.forEach((entry) => {
          projectHours[entry.projectId] = (projectHours[entry.projectId] || 0) + entry.hours;
        });

        const sortedProjects = Object.entries(projectHours)
          .sort(([, hoursA], [, hoursB]) => hoursB - hoursA)
          .slice(0, 3)
          .map(([projectId, hours]) => ({
            name: projectMap[projectId] || "Unknown Project",
            hours: hours,
          }));
        setTopProjects(sortedProjects);
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to load dashboard data" });
        console.error("Failed to load data:", error);
      }
      setIsLoading(false);
    }
    fetchDataAndCalculate();
  }, []);

  const markdown = `
# Work Timetracker Dashboard

Here's your activity at a glance.
  `;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle="Dashboard"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Hours Logged Today" text={`${todayHours.toFixed(2)}h`} />
          <Detail.Metadata.Label title="Hours Logged This Week" text={`${weekHours.toFixed(2)}h`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Top Projects (All Time)">
            {topProjects.length > 0 ? (
              topProjects.map((p) => (
                <Detail.Metadata.TagList.Item key={p.name} text={`${p.name} (${p.hours.toFixed(1)}h)`} />
              ))
            ) : (
              <Detail.Metadata.TagList.Item text="No projects logged yet" />
            )}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}
