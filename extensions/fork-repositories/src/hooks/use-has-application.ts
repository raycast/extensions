import { getApplications } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

const useHasApplication = (identifier: string): [boolean, boolean] => {
  const { data, isLoading } = useCachedPromise(
    async () => {
      const applications = await getApplications();
      let isFound = false;
      for (const application of applications) {
        if ([application.name, application.path, application.bundleId].includes(identifier)) {
          isFound = true;
          break;
        }
      }
      return isFound;
    },
    [],
    { initialData: false }
  );
  return [data, isLoading];
};

export { useHasApplication };
