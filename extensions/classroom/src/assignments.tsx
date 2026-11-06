import { AssignmentList } from "./components/assignment-list";
import { ErrorState } from "./components/error-state";
import { ClassroomApi } from "./lib/api";
import { accessToken, isStudent } from "./lib/auth";
import { useLoad } from "./lib/use-load";

export default function Assignments() {
  const { data, error, isLoading, refresh } = useLoad(async () => {
    const api = new ClassroomApi(await accessToken());
    return api.assignments(await api.courses(), { mine: isStudent() });
  }, "assignments");
  return (
    <AssignmentList
      items={data?.items ?? []}
      failures={data?.failures}
      isLoading={isLoading}
      refresh={refresh}
      errorView={
        error ? <ErrorState message={error} refresh={refresh} /> : undefined
      }
    />
  );
}
