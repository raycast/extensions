import { Icon, List, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { authorize, fetchEmployeeProjects } from "../services/primetric";

export default function EmployeeProjects({ developerName }: { developerName: string }) {
  const { isLoading, data } = usePromise(async () => {
    const nameReversed = developerName.split(" ").reverse().join(" ");
    try {
      await authorize();
      const data = await fetchEmployeeProjects(nameReversed);
      return data;
    } catch (error) {
      console.error(error);
      showToast({ style: Toast.Style.Failure, title: String(error) });
    }
  }, []);

  return (
    <List isLoading={isLoading}>
      {data?.map((assignment) => (
        <List.Item
          key={assignment.id}
          icon={assignment.isCurrent ? Icon.ArrowRight : ""}
          title={assignment.projectName || ""}
          subtitle={assignment.label}
          accessories={[{ text: `${assignment.startsAt}-${assignment.endsAt}` }]}
        />
      ))}
    </List>
  );
}
