import { usePromise } from "@raycast/utils";
import { AssignmentList } from "./components/assignment-list";
import { ErrorState } from "./components/error-state";
import { ClassroomApi } from "./lib/api";
import { accessToken, isStudent } from "./lib/auth";

async function loadAssignments() {
  const api = new ClassroomApi(await accessToken());
  return api.assignments(await api.courses(), { mine: isStudent() });
}

export default function Assignments() {
  const { data, error, isLoading, revalidate } = usePromise(
    loadAssignments,
    [],
    {
      onError: () => undefined,
    },
  );
  return (
    <AssignmentList
      items={data?.items ?? []}
      failures={data?.failures}
      isLoading={isLoading}
      refresh={revalidate}
      errorView={
        error ? (
          <ErrorState message={error.message} refresh={revalidate} />
        ) : undefined
      }
    />
  );
}
